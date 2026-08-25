"""Seed the roadmaps table from the local JSON files.

Usage (from the backend directory, with DATABASE_URL set in .env or env):

    python -m app.seed_roadmaps

Idempotent: existing slugs are updated with the file contents.
"""

import json
from pathlib import Path

from sqlalchemy import text

from app.db import get_engine, is_database_enabled

DATA_DIR = Path(__file__).parent / "data" / "curated" / "roadmaps"
INGESTED_DIR = Path(__file__).parent / "data" / "ingested" / "roadmapsh"


def _title_from_topics(topics: list[str], slug: str) -> str:
    return slug.replace("-", " ").title()


def seed() -> int:
    if not is_database_enabled():
        raise SystemExit("DATABASE_URL is not set; nothing to seed")
    engine = get_engine()
    seeded = 0
    for directory in (DATA_DIR, INGESTED_DIR):
        for path in sorted(directory.glob("*.json")):
            if path.stem.endswith(".graph"):
                continue
            slug = path.stem
            topics = json.loads(path.read_text(encoding="utf-8")).get("topics", [])
            graph_path = directory / f"{slug}.graph.json"
            graph = (
                json.loads(graph_path.read_text(encoding="utf-8"))
                if graph_path.exists()
                else None
            )
            with engine.begin() as connection:
                connection.execute(
                    text(
                        "INSERT INTO roadmaps (slug, title, topics, graph) "
                        "VALUES (:slug, :title, CAST(:topics AS jsonb), CAST(:graph AS jsonb)) "
                        "ON CONFLICT (slug) DO UPDATE SET "
                        "title = :title, topics = CAST(:topics AS jsonb), "
                        "graph = CAST(:graph AS jsonb), updated_at = now()"
                    ),
                    {
                        "slug": slug,
                        "title": _title_from_topics(topics, slug),
                        "topics": json.dumps(topics),
                        "graph": json.dumps(graph) if graph is not None else None,
                    },
                )
            seeded += 1
            print(f"seeded {slug} ({len(topics)} topics)")
    print(f"done: {seeded} roadmaps in database")


if __name__ == "__main__":
    seed()
