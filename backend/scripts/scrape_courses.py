"""Background course scraper: Udemy and edX via Firecrawl into resources.

Firecrawl (free tier) renders search pages; we extract course links from
the markdown and upsert them into the resources JSONB table so the
recommender can rank them like every other doc. Runs as a scheduled job
(GitHub Actions, weekly) or locally:

    cd backend
    .venv\\Scripts\\python.exe scripts\\scrape_courses.py python react
    .venv\\Scripts\\python.exe scripts\\scrape_courses.py            # default topic set
"""

import asyncio
import json
import logging
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import app.config  # noqa: F401  loads backend/.env before anything else

import httpx
from sqlalchemy import text

from app.db import get_engine, is_database_enabled

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scrape_courses")

FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape"
DEFAULT_TOPICS = [
    "python",
    "javascript",
    "react",
    "full stack web development",
    "machine learning",
    "data structures and algorithms",
    "devops",
    "cyber security",
    "system design",
    "sql",
]
PER_TOPIC_LIMIT = 8
REQUEST_PAUSE_SECONDS = 1.5

SOURCES = [
    {
        "provider": "Udemy",
        "url": "https://www.udemy.com/courses/search/?q={topic}",
        "link_pattern": re.compile(
            r"\[([^\]\[]{6,140})\]\((https://www\.udemy\.com/course/[^\)\?#]+)\)"
        ),
    },
    {
        "provider": "edX",
        "url": "https://www.edx.org/search?q={topic}",
        "link_pattern": re.compile(
            r"\[([^\]\[]{6,140})\]\((https://www\.edx\.org/(?:course|learn|professional-certificate|xseries)/[^\)\?#]+)\)"
        ),
    },
]

TITLE_NOISE = re.compile(r"\s*[\|\-â€“]\s*(Udemy|edX|Online Courses?)\s*$", re.IGNORECASE)
LEVEL_BEGINNER = re.compile(r"\b(beginner|basics?|fundamentals?|introduction|intro)\b", re.IGNORECASE)
LEVEL_ADVANCED = re.compile(r"\b(advanced|expert|mastery|masterclass|professional)\b", re.IGNORECASE)


def infer_level(title: str) -> str:
    if LEVEL_ADVANCED.search(title):
        return "advanced"
    if LEVEL_BEGINNER.search(title):
        return "beginner"
    return "intermediate"


def slug_from_url(url: str) -> str:
    tail = url.rstrip("/").split("/")[-1]
    return re.sub(r"[^a-z0-9]+", "-", tail.lower()).strip("-")[:80] or "course"


async def scrape_markdown(client: httpx.AsyncClient, api_key: str, url: str) -> str:
    response = await client.post(
        FIRECRAWL_API,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={"url": url, "formats": ["markdown"], "onlyMainContent": True},
        timeout=90,
    )
    if response.status_code != 200:
        logger.warning("Firecrawl %s returned %s", url, response.status_code)
        return ""
    payload = response.json()
    data = payload.get("data") or {}
    markdown = data.get("markdown")
    return markdown if isinstance(markdown, str) else ""


def extract_courses(markdown: str, source: dict, topic: str) -> list[dict]:
    courses: dict[str, dict] = {}
    for title, url in source["link_pattern"].findall(markdown):
        clean_title = TITLE_NOISE.sub("", title).strip()
        if len(clean_title) < 8:
            continue
        slug = slug_from_url(url)
        courses.setdefault(
            url,
            {
                "id": f"{source['provider'].lower()}:{slug}",
                "name": clean_title[:160],
                "provider": source["provider"],
                "type": "course",
                "url": url,
                "free": False,
                "level": infer_level(clean_title),
                "duration_hours": None,
                "rating": None,
                "description": None,
                "topics": [topic],
                "keywords": [word for word in re.findall(r"[a-z0-9]+", topic.lower())],
            },
        )
        if len(courses) >= PER_TOPIC_LIMIT:
            break
    return list(courses.values())


def upsert_courses(docs: list[dict]) -> None:
    engine = get_engine()
    inserted = 0
    with engine.begin() as connection:
        for doc in docs:
            result = connection.execute(
                text(
                    "INSERT INTO resources (id, doc, updated_at) "
                    "VALUES (:id, CAST(:doc AS jsonb), now()) "
                    "ON CONFLICT (id) DO UPDATE SET doc = CAST(:doc AS jsonb), updated_at = now() "
                    "RETURNING (xmax = 0) AS inserted"
                ),
                {"id": doc["id"], "doc": json.dumps(doc)},
            ).scalar()
            inserted += 1 if result else 0
    logger.info("Upserted %s docs (%s new)", len(docs), inserted)


async def main() -> None:
    import os

    api_key = os.environ.get("FIRECRAWL_API_KEY", "").strip()
    if not api_key:
        logger.error("FIRECRAWL_API_KEY is not set")
        return
    if not is_database_enabled():
        logger.error("DATABASE_URL is not set")
        return

    topics = [arg.strip().lower() for arg in sys.argv[1:] if arg.strip()] or DEFAULT_TOPICS
    all_docs: dict[str, dict] = {}
    async with httpx.AsyncClient(follow_redirects=True) as client:
        for topic in topics:
            for source in SOURCES:
                url = source["url"].format(topic=topic.replace(" ", "+"))
                markdown = await scrape_markdown(client, api_key, url)
                docs = extract_courses(markdown, source, topic)
                logger.info("%s on %s: %s courses", topic, source["provider"], len(docs))
                for doc in docs:
                    existing = all_docs.get(doc["id"])
                    if existing is None:
                        all_docs[doc["id"]] = doc
                    elif topic not in existing["topics"]:
                        existing["topics"].append(topic)
                time.sleep(REQUEST_PAUSE_SECONDS)
    if all_docs:
        upsert_courses(list(all_docs.values()))
    logger.info("Done: %s unique courses in the resources table", len(all_docs))


if __name__ == "__main__":
    asyncio.run(main())

