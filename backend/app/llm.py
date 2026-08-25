"""Async LLM client over OpenAI compatible chat completion APIs.

Supported providers, selected with the LLM_PROVIDER environment variable:

- groq: free tier, needs GROQ_API_KEY, default model llama-3.1-8b-instant
- nvidia: NVIDIA NIM, needs NVIDIA_API_KEY, default model
  google/diffusiongemma-26b-a4b-it

One shared AsyncClient with connection pooling serves all requests so
concurrent users reuse connections instead of opening new ones.
"""

import asyncio
import json
import os
import re
import time
from typing import Any

import httpx

PROVIDERS = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "default_model": "llama-3.1-8b-instant",
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1",
        "api_key_env": "NVIDIA_API_KEY",
        "default_model": "google/diffusiongemma-26b-a4b-it",
    },
}

DEFAULT_PROVIDER = "groq"
TIMEOUT_SECONDS = 90
MAX_RETRIES = 4

THINK_PATTERN = re.compile(r"<think>.*?</think>", re.DOTALL)
UNCLOSED_THINK_PATTERN = re.compile(r"<think>.*\Z", re.DOTALL)

_client: httpx.AsyncClient | None = None
_client_lock = asyncio.Lock()


class LLMError(Exception):
    pass


class LLMNotConfigured(LLMError):
    pass


async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        async with _client_lock:
            if _client is None:
                _client = httpx.AsyncClient(
                    timeout=TIMEOUT_SECONDS,
                    limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
                )
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def _resolve_provider() -> tuple[str, str, str, str]:
    """Return provider name, base url, api key, and model for the provider."""
    provider_name = os.environ.get("LLM_PROVIDER", DEFAULT_PROVIDER).lower()
    provider = PROVIDERS.get(provider_name)
    if provider is None:
        raise LLMError(f"Unknown LLM provider: {provider_name}")
    api_key = os.environ.get(provider["api_key_env"], "").strip()
    if not api_key:
        raise LLMNotConfigured(
            f"Set {provider['api_key_env']} to enable LLM features"
        )
    model = os.environ.get("LLM_MODEL", provider["default_model"])
    return provider_name, provider["base_url"], api_key, model


def is_configured() -> bool:
    try:
        _resolve_provider()
        return True
    except LLMError:
        return False


def strip_reasoning(content: str) -> str:
    """Remove reasoning blocks some models emit inside the reply content.

    Thinking models wrap internal reasoning in think tags. Anything after an
    unclosed tag is pure reasoning, so it is dropped as well.
    """
    cleaned = THINK_PATTERN.sub("", content)
    cleaned = UNCLOSED_THINK_PATTERN.sub("", cleaned)
    cleaned = cleaned.strip()
    if not cleaned:
        raise LLMError("LLM returned only reasoning with no answer")
    return cleaned


async def chat_completion(
    messages: list[dict[str, str]],
    json_mode: bool = False,
    max_tokens: int = 2048,
    temperature: float = 0.4,
) -> str:
    """Run a chat completion and return the assistant message content.

    Retries rate limits with server provided waits and retries empty
    reasoning only replies once with an explicit answer now instruction.
    """
    try:
        return await _complete(messages, json_mode, max_tokens, temperature)
    except LLMError as error:
        if "no answer" not in str(error):
            raise
        _, _, _, model = _resolve_provider()
        nudged = list(messages)
        last = nudged[-1]
        suffix = "\n\nAnswer directly without showing reasoning."
        if "qwen" in model.lower():
            suffix += " /no_think"
        nudged[-1] = {**last, "content": last["content"] + suffix}
        return await _complete(nudged, json_mode, max_tokens, temperature)


async def _complete(
    messages: list[dict[str, str]],
    json_mode: bool,
    max_tokens: int,
    temperature: float,
) -> str:
    provider_name, base_url, api_key, model = _resolve_provider()
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    if provider_name == "nvidia":
        # Thinking mode burns the token budget on hidden reasoning; the
        # product needs direct answers.
        body["chat_template_kwargs"] = {"enable_thinking": False}
    if provider_name == "groq":
        # Reasoning models on Groq can spend the entire budget thinking.
        # Hidden reasoning keeps the final answer in content.
        body["reasoning_format"] = "hidden"

    client = await get_client()
    response = await _post_with_backoff(client, base_url, api_key, body)

    try:
        message = response.json()["choices"][0]["message"]
    except (KeyError, IndexError, ValueError) as error:
        raise LLMError(f"LLM provider returned an unexpected response: {error}") from error

    content = message.get("content")
    if not content or not str(content).strip():
        raise LLMError("LLM returned only reasoning with no answer")
    return strip_reasoning(str(content))


async def _post_with_backoff(
    client: httpx.AsyncClient,
    base_url: str,
    api_key: str,
    body: dict,
    attempts: int = MAX_RETRIES,
) -> httpx.Response:
    """POST the completion, retrying rate limits with server provided waits."""
    response: httpx.Response | None = None
    for attempt in range(attempts):
        try:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=body,
            )
        except httpx.TimeoutException:
            if attempt < attempts - 1:
                await asyncio.sleep(1.0)
                continue
            raise
        if response.status_code == 429 and attempt < attempts - 1:
            retry_after = response.headers.get("retry-after")
            delay = float(retry_after) if retry_after else 2.0 * (attempt + 1)
            await asyncio.sleep(min(max(delay, 1.0), 45))
            continue
        break

    assert response is not None
    if response.status_code == 400 and body.get("response_format"):
        # Some models reject structured output; retry without it.
        body = {key: value for key, value in body.items() if key != "response_format"}
        response = await client.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
        )

    response.raise_for_status()
    return response
