"""Roadmap storage backed by Postgres.

"""

import re

from sqlalchemy import text

import app.config  # loads backend/.env before anything reads the environment

from app.db import DatabaseNotConfigured, get_engine

SLUG_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


class RoadmapNotFound(Exception):
    """Raised when no roadmap exists for a slug."""


def _validated_slug(slug: str) -> str:
    if not SLUG_PATTERN.fullmatch(slug):
        raise RoadmapNotFound(slug)
    return slug


def _query_one(statement: str, **params):
    """Run a query against the roadmaps table, mapping DB issues to 503."""
    try:
        engine = get_engine()
    except DatabaseNotConfigured:
        raise
    except Exception as error:
        raise DatabaseNotConfigured(str(error)) from error
    try:
        with engine.connect() as connection:
            return connection.execute(text(statement), params).fetchone()
    except Exception as error:
        raise DatabaseNotConfigured(str(error)) from error


def list_roadmap_slugs() -> list[str]:
    """Return all roadmap slugs stored in the database."""
    try:
        engine = get_engine()
    except DatabaseNotConfigured:
        raise
    except Exception as error:
        raise DatabaseNotConfigured(str(error)) from error
    try:
        with engine.connect() as connection:
            rows = connection.execute(text("SELECT slug FROM roadmaps"))
            return sorted(row[0] for row in rows)
    except Exception as error:
        raise DatabaseNotConfigured(str(error)) from error


def load_roadmap_topics(slug: str) -> list[str]:
    """Load the ordered topic list for a roadmap slug."""
    slug = _validated_slug(slug)
    row = _query_one(
        "SELECT topics FROM roadmaps WHERE slug = :slug", slug=slug
    )
    if row is None:
        raise RoadmapNotFound(slug)
    return row[0] or []


def load_roadmap_graph(slug: str) -> dict:
    """Load the structured skill graph for a roadmap slug."""
    slug = _validated_slug(slug)
    row = _query_one(
        "SELECT graph FROM roadmaps WHERE slug = :slug", slug=slug
    )
    if row is None or row[0] is None:
        raise RoadmapNotFound(slug)
    return row[0]
