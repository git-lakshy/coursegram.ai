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


def _resolve_provider() -> tuple[str, str, str]:
    """Return base url, api key, and model for the configured provider."""
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
    return provider["base_url"], api_key, model


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
        nudged[-1] = {**last, "content": last["content"] + "\n\nAnswer directly without showing reasoning."}
        return _complete(nudged, json_mode, max_tokens, temperature)


def _complete(
    messages: list[dict[str, str]],
    json_mode: bool,
    max_tokens: int,
    temperature: float,
) -> str:
    base_url, api_key, model = _resolve_provider()
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    try:
        response = httpx.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=TIMEOUT_SECONDS,
        )
        if response.status_code == 400 and json_mode:
            # Some models reject structured output; retry without it.
            body.pop("response_format", None)
            response = httpx.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=body,
                timeout=TIMEOUT_SECONDS,
            )
        response.raise_for_status()
    except httpx.HTTPError as error:
        detail = ""
        response = getattr(error, "response", None)
        if response is not None:
            detail = f" Provider said: {response.text[:300]}"
        raise LLMError(f"LLM provider request failed: {error}.{detail}") from error

    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError) as error:
        raise LLMError(f"LLM provider returned an unexpected response: {error}") from error
    return strip_reasoning(content)


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
