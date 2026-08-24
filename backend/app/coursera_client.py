"""Client for fetching public course metadata from the Coursera catalog API."""

import httpx

COURSERA_COURSES_URL = "https://api.coursera.org/api/courses.v1"
BATCH_SIZE = 100


def fetch_courses(limit: int = 20, topic: str = "") -> list[dict]:
    """Fetch a batch of Coursera courses and filter by a keyword in the name.

    The public catalog endpoint used here does not support full text search,
    so a larger batch is fetched once and filtered locally by keyword.
    """
    params = {"start": 0, "limit": BATCH_SIZE, "fields": "name,slug"}
    response = httpx.get(COURSERA_COURSES_URL, params=params, timeout=10)
    response.raise_for_status()
    elements = response.json().get("elements", [])

    if topic:
        keyword = topic.lower()
        elements = [item for item in elements if keyword in item.get("name", "").lower()]

    courses = []
    for item in elements[:limit]:
        slug = item.get("slug", "")
        course_url = "https://www.coursera.org/learn/" + slug
        courses.append(
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "url": course_url,
            }
        )
    return courses
