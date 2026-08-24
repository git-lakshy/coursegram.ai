"""Loader for local roadmap topic and skill graph seed data.

Topic lists and structured graphs are stored as static JSON files under
app/data/roadmaps and were derived from the public roadmap.sh site content.
Slugs are validated before any path is built so a crafted slug can never
escape the seed data directory.
"""

import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data" / "roadmaps"
SLUG_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


class RoadmapNotFound(Exception):
    """Raised when no seed data exists for a slug."""


def _validated_path(slug: str, suffix: str) -> Path:
    if not SLUG_PATTERN.fullmatch(slug):
        raise RoadmapNotFound(slug)
    return DATA_DIR / f"{slug}{suffix}"


def list_roadmap_slugs() -> list[str]:
    """Return the slugs of all roadmap seed files available locally."""
    return sorted(
        path.stem.replace(".graph", "")
        for path in DATA_DIR.glob("*.json")
        if not path.stem.endswith(".graph")
    )


def load_roadmap_topics(slug: str) -> list[str]:
    """Load the ordered topic list for a roadmap slug.

    Raises RoadmapNotFound when no seed file exists for the given slug.
    """
    path = _validated_path(slug, ".json")
    if not path.exists():
        raise RoadmapNotFound(slug)
    with path.open("r", encoding="utf-8") as file:
        payload = json.load(file)
    return payload.get("topics", [])


def load_roadmap_graph(slug: str) -> dict:
    """Load the structured skill graph for a roadmap slug.

    Raises RoadmapNotFound when no graph seed file exists for the given slug.
    """
    path = _validated_path(slug, ".graph.json")
    if not path.exists():
        raise RoadmapNotFound(slug)
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)
