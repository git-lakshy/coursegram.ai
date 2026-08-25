"""LLM client abstraction over OpenAI compatible chat completion APIs.

Supported providers, selected with the LLM_PROVIDER environment variable:

- groq: free tier, needs GROQ_API_KEY, default model llama-3.1-8b-instant
- nvidia: NVIDIA NIM, needs NVIDIA_API_KEY, default model
  meta/llama-3.1-8b-instruct

Both expose an OpenAI compatible chat completions endpoint, so one client
covers them. When no key is configured the caller receives LLMNotConfigured
and can fall back to non LLM behavior.
"""

import os
import re
from typing import Any

import httpx

THINK_PATTERN = re.compile(r"<think>.*?</think>", re.DOTALL)
UNCLOSED_THINK_PATTERN = re.compile(r"<think>.*\Z", re.DOTALL)

PROVIDERS = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_env": "GROQ_API_KEY",
        "default_model": "llama-3.1-8b-instant",
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1",
        "api_key_env": "NVIDIA_API_KEY",
        "default_model": "meta/llama-3.1-8b-instruct",
    },
}

DEFAULT_PROVIDER = "groq"
TIMEOUT_SECONDS = 60


class LLMError(Exception):
    pass


class LLMNotConfigured(LLMError):
    pass


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


def chat_completion(
    messages: list[dict[str, str]],
    json_mode: bool = False,
    max_tokens: int = 2048,
    temperature: float = 0.4,
) -> str:
    """Run a chat completion and return the assistant message content.

    Thinking models can spend the whole budget on hidden reasoning. When
    the reply comes back empty after stripping, retry once with an explicit
    instruction to answer directly.
    """
    try:
        return _complete(messages, json_mode, max_tokens, temperature)
    except LLMError as error:
        if "no answer" not in str(error):
            raise
        nudged = list(messages)
        last = nudged[-1]
        suffix = "\n\nAnswer directly without showing reasoning."
        _, _, _, retry_model = _resolve_provider()
        if "qwen" in retry_model.lower():
            suffix += " /no_think"
        nudged[-1] = {**last, "content": last["content"] + suffix}
        return _complete(nudged, json_mode, max_tokens, temperature)


def _complete(
    messages: list[dict[str, str]],
    json_mode: bool,
    max_tokens: int,
    temperature: float,
) -> str:
    base_url, api_key, model = _resolve_provider()[1:]
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    if base_url.startswith("https://api.groq.com"):
        # Reasoning models on Groq can spend the entire budget thinking.
        # Hidden reasoning keeps the final answer in content.
        body["reasoning_format"] = "hidden"

    try:
        response = _post_with_backoff(base_url, api_key, body)
    except httpx.HTTPError as error:
        detail = ""
        error_response = getattr(error, "response", None)
        if error_response is not None:
            detail = f" Provider said: {error_response.text[:300]}"
        raise LLMError(f"LLM provider request failed: {error}.{detail}") from error

    try:
        message = response.json()["choices"][0]["message"]
    except (KeyError, IndexError, ValueError) as error:
        raise LLMError(f"LLM provider returned an unexpected response: {error}") from error

    content = message.get("content")
    if not content or not str(content).strip():
        raise LLMError("LLM returned only reasoning with no answer")
    return strip_reasoning(str(content))


def _post_with_backoff(base_url: str, api_key: str, body: dict, attempts: int = 5):
    """POST the completion, retrying rate limits with server provided waits."""
    import time

    response = None
    for attempt in range(attempts):
        response = httpx.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=TIMEOUT_SECONDS,
        )
        if response.status_code == 429 and attempt < attempts - 1:
            retry_after = response.headers.get("retry-after")
            delay = float(retry_after) if retry_after else 2.0 * (attempt + 1)
            time.sleep(min(max(delay, 1.0), 45))
            continue
        break

    if response.status_code == 400 and body.get("response_format"):
        # Some models reject structured output; retry without it.
        body = {**body, "response_format": None}
        del body["response_format"]
        response = httpx.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=TIMEOUT_SECONDS,
        )

    response.raise_for_status()
    return response


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
