"""Loader for local roadmap topic and skill graph seed data.

Topic lists and structured graphs are stored as static JSON files under
app/data/roadmaps and were derived from the public roadmap.sh site content.
Slugs are validated before any path is built so a crafted slug can never
escape the seed data directory.
"""

import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data" / "curated" / "roadmaps"
INGESTED_DIR = Path(__file__).parent / "data" / "ingested" / "roadmapsh"
SLUG_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


class RoadmapNotFound(Exception):
    """Raised when no seed data exists for a slug."""


def _validated_path(slug: str, suffix: str) -> Path:
    if not SLUG_PATTERN.fullmatch(slug):
        raise RoadmapNotFound(slug)
    return DATA_DIR / f"{slug}{suffix}"


def list_roadmap_slugs() -> list[str]:
    """Return slugs from curated seeds plus all ingested roadmap.sh tracks."""
    curated = {
        path.stem.replace(".graph", "")
        for path in DATA_DIR.glob("*.json")
        if not path.stem.endswith(".graph")
    }
    ingested = {
        path.stem.replace(".graph", "")
        for path in INGESTED_DIR.glob("*.json")
        if not path.stem.endswith(".graph")
    }
    return sorted(curated | ingested)


def _read_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _read_topics(path: Path) -> list[str] | None:
    payload = _read_json(path)
    if payload is None:
        return None
    return payload.get("topics", [])


def load_roadmap_topics(slug: str) -> list[str]:
    """Load the ordered topic list for a roadmap slug.

    Curated seeds take priority, then ingested roadmap.sh data.
    Raises RoadmapNotFound when no data exists for the given slug.
    """
    path = _validated_path(slug, ".json")
    topics = _read_topics(path)
    if topics is not None:
        return topics
    topics = _read_topics(INGESTED_DIR / f"{slug}.json")
    if topics is None:
        raise RoadmapNotFound(slug)
    return topics


def load_roadmap_graph(slug: str) -> dict:
    """Load the structured skill graph for a roadmap slug.

    Curated seeds take priority, then ingested roadmap.sh data.
    Raises RoadmapNotFound when no graph data exists for the given slug.
    """
    path = _validated_path(slug, ".graph.json")
    graph = _read_json(path)
    if graph is not None:
        return graph
    graph = _read_json(INGESTED_DIR / f"{slug}.graph.json")
    if graph is None:
        raise RoadmapNotFound(slug)
    return graph
