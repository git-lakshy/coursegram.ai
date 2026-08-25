"""Async LLM client over the NVIDIA NIM chat completion API."""

import asyncio
import logging
import os
import re
from typing import Any

import httpx

logger = logging.getLogger("app.llm")

NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"
DEFAULT_MODEL = "qwen/qwen2.5-72b-instruct"
TIMEOUT_SECONDS = 90
MAX_RETRIES = 3

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


def _resolve() -> tuple[str, str]:
    """Return the API key and model."""
    api_key = os.environ.get("NVIDIA_API_KEY", "").strip()
    if not api_key:
        raise LLMNotConfigured("Set NVIDIA_API_KEY to enable LLM features")
    model = os.environ.get("LLM_MODEL", DEFAULT_MODEL)
    return api_key, model


def is_configured() -> bool:
    try:
        _resolve()
        return True
    except LLMError:
        return False


def strip_reasoning(content: str) -> str:
    """Remove reasoning blocks some models emit inside the reply content."""
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

    Retries transient failures (timeouts, rate limits) with backoff.
    """
    api_key, model = _resolve()
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }

    client = await get_client()
    response: httpx.Response | None = None
    for attempt in range(MAX_RETRIES):
        try:
            response = await client.post(
                f"{NIM_BASE_URL}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=body,
            )
        except httpx.TimeoutException:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1.0)
                continue
            raise LLMError("LLM request timed out") from None
        if response.status_code == 429 and attempt < MAX_RETRIES - 1:
            retry_after = response.headers.get("retry-after")
            delay = float(retry_after) if retry_after else 2.0 * (attempt + 1)
            await asyncio.sleep(min(max(delay, 1.0), 45))
            continue
        break

    assert response is not None
    if response.status_code != 200:
        logger.warning("LLM request failed: %s %s", response.status_code, response.text[:500])
        raise LLMError(f"LLM provider returned status {response.status_code}")

    try:
        message = response.json()["choices"][0]["message"]
    except (KeyError, IndexError, ValueError) as error:
        raise LLMError("LLM provider returned an unexpected response") from error

    content = message.get("content")
    if not content or not str(content).strip():
        raise LLMError("LLM returned only reasoning with no answer")
    return strip_reasoning(str(content))
