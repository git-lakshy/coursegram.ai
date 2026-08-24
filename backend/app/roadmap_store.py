"""Loader for local roadmap topic seed data.

Topic lists are stored as static JSON files under app/data/roadmaps and were
sourced from the public roadmap.sh site content. They serve as a simple,
ordered reference list of skill names until a full prerequisite graph is
built in a later phase.
"""

import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data" / "roadmaps"


def list_roadmap_slugs() -> list[str]:
    """Return the slugs of all roadmap seed files available locally."""
    return sorted(path.stem for path in DATA_DIR.glob("*.json"))


def load_roadmap_topics(slug: str) -> list[str]:
    """Load the ordered topic list for a roadmap slug.

    Returns an empty list when no seed file exists for the given slug.
    """
    path = DATA_DIR / f"{slug}.json"
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as file:
        payload = json.load(file)
    return payload.get("topics", [])
