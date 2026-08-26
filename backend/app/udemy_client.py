"""Udemy course search via the Udemy Affiliate API.

Requires affiliate credentials (UDEMY_CLIENT_ID / UDEMY_CLIENT_SECRET).
Without them the client is disabled and returns an empty list, so the
API degrades gracefully to Coursera and the curated resource set.
"""

import os

import httpx

UDEMY_API_URL = "https://www.udemy.com/api-2.0/courses/"
TIMEOUT_SECONDS = 15


def udemy_enabled() -> bool:
    return bool(
        os.environ.get("UDEMY_CLIENT_ID", "").strip()
        and os.environ.get("UDEMY_CLIENT_SECRET", "").strip()
    )


def fetch_courses(limit: int = 10, topic: str = "") -> list[dict]:
    """Search Udemy courses, normalized to the Coursegram course shape."""
    if not udemy_enabled():
        return []
    params = {
        "page_size": max(1, min(limit, 50)),
        "fields[course]": "title,url,price,headline,num_subscribers,avg_rating,is_paid",
        "ordering": "most_reviewed",
    }
    if topic:
        params["search"] = topic
    try:
        response = httpx.get(
            UDEMY_API_URL,
            params=params,
            auth=(
                os.environ["UDEMY_CLIENT_ID"].strip(),
                os.environ["UDEMY_CLIENT_SECRET"].strip(),
            ),
            timeout=TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
    except (httpx.HTTPError, ValueError):
        return []

    courses = []
    for item in results:
        course_id = str(item.get("id", "")).strip()
        title = str(item.get("title", "")).strip()
        if not course_id or not title:
            continue
        relative = str(item.get("url", "") or "")
        courses.append(
            {
                "id": f"udemy-{course_id}",
                "name": title,
                "url": "https://www.udemy.com" + relative
                if relative.startswith("/")
                else relative,
                "source": "udemy",
                "price": item.get("price"),
                "is_paid": bool(item.get("is_paid", True)),
                "rating": item.get("avg_rating"),
                "headline": item.get("headline", ""),
            }
        )
    return courses
