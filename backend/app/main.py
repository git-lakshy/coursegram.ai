"""FastAPI application exposing course listings and roadmap topic references."""

from fastapi import FastAPI, Query

from app.coursera_client import fetch_courses
from app.roadmap_store import list_roadmap_slugs, load_roadmap_topics

app = FastAPI(title="Coursegram API", version="0.1.0")


@app.get("/health")
def health_check() -> dict:
    """Return a simple status payload used for uptime checks."""
    return {"status": "ok"}


@app.get("/courses")
def get_courses(
    topic: str = Query(default="", description="Optional keyword filter on the course name"),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    """Return a list of Coursera courses, optionally filtered by keyword."""
    courses = fetch_courses(limit=limit, topic=topic)
    return {"count": len(courses), "courses": courses}


@app.get("/roadmaps")
def get_roadmap_slugs() -> dict:
    """Return the list of roadmap slugs available as seed reference data."""
    return {"slugs": list_roadmap_slugs()}


@app.get("/roadmaps/{slug}")
def get_roadmap(slug: str) -> dict:
    """Return the ordered topic list for a given roadmap slug."""
    topics = load_roadmap_topics(slug)
    return {"slug": slug, "topic_count": len(topics), "topics": topics}
