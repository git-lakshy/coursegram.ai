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
    """Run a chat completion and return the assistant message content."""
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
        response.raise_for_status()
    except httpx.HTTPError as error:
        raise LLMError(f"LLM provider request failed: {error}") from error

    try:
        return response.json()["choices"][0]["message"]["content"]
    except (KeyError, IndexError, ValueError) as error:
        raise LLMError(f"LLM provider returned an unexpected response: {error}") from error
