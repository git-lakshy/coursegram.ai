"""Client for fetching public course metadata from the Coursera catalog API.

The public catalog endpoint does not support full text search, so several
pages are fetched and filtered locally by keyword in the course name. A
module level cache with a TTL keeps repeated requests off the upstream API.
"""

import threading
import time

import httpx

COURSERA_COURSES_URL = "https://api.coursera.org/api/courses.v1"
PAGE_SIZE = 100
MAX_PAGES = 5
CACHE_TTL_SECONDS = 600

_cache_lock = threading.Lock()
_cached_elements: list[dict] = []
_cached_at: float = 0.0


class UpstreamError(Exception):
    """Raised when the Coursera catalog cannot be reached or returns an error."""


def _fetch_all_elements() -> list[dict]:
    """Fetch catalog pages once and cache them for CACHE_TTL_SECONDS."""
    global _cached_elements, _cached_at
    with _cache_lock:
        if _cached_elements and time.monotonic() - _cached_at < CACHE_TTL_SECONDS:
            return _cached_elements

        elements: list[dict] = []
        try:
            with httpx.Client(timeout=10) as client:
                for page in range(MAX_PAGES):
                    params = {
                        "start": page * PAGE_SIZE,
                        "limit": PAGE_SIZE,
                        "fields": "name,slug",
                    }
                    response = client.get(COURSERA_COURSES_URL, params=params)
                    response.raise_for_status()
                    batch = response.json().get("elements", [])
                    elements.extend(batch)
                    if len(batch) < PAGE_SIZE:
                        break
        except httpx.HTTPError as error:
            raise UpstreamError(f"Coursera catalog unavailable: {error}") from error
        except ValueError as error:
            raise UpstreamError(f"Coursera catalog returned invalid data: {error}") from error

        _cached_elements = elements
        _cached_at = time.monotonic()
        return elements


def fetch_courses(limit: int = 20, topic: str = "") -> list[dict]:
    """Return up to limit courses, optionally filtered by keyword in the name."""
    elements = _fetch_all_elements()

    if topic:
        keyword = topic.lower()
        elements = [item for item in elements if keyword in item.get("name", "").lower()]

    courses = []
    for item in elements[:limit]:
        slug = item.get("slug", "")
        courses.append(
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "url": "https://www.coursera.org/learn/" + slug,
            }
        )
    return courses
