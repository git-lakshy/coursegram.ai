"""Roadmap storage backed by Postgres.

Each roadmap is stored as a LearningGraph in the `graph` JSONB column:

    {
      "slug": "python",
      "title": "Python",
      "version": 2,
      "domains": ["core", "tooling"],
      "nodes": [                       # sorted in topological order
        {
          "id": "basic-syntax",
          "name": "Basic Syntax",
          "domain": "core",            # domain this topic belongs to
          "level": "beginner",         # beginner | intermediate | advanced
          "order": 0,                  # topological index
          "prerequisites": ["..."],    # ids of topics that come before
          "related": [                 # cross-domain links
            {"id": "other-topic", "relation": "cross-domain"}
          ],
          "keywords": ["syntax"]       # used for course matching and ML
        }
      ]
    }

Nodes are always returned in topological order so generating a user
specific roadmap is a simple walk: take the topics the learner has not
mastered, keep prerequisites satisfied, and the order is already valid.

Graphs written in the older v1 shape (name/prerequisites objects, no
explicit order) are normalized on read: they are topologically sorted
and given domains, levels, and order values.

When the database is unavailable a DatabaseNotConfigured error is
raised, which the API reports as a 503 asking the learner to contact
the administrator.
"""

import re

from sqlalchemy import text

import app.config  # loads backend/.env before anything reads the environment

from app.db import DatabaseNotConfigured, get_engine

SLUG_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")

GRAPH_VERSION = 2
DEFAULT_DOMAIN = "core"
DEFAULT_LEVEL = "beginner"
KNOWN_LEVELS = {"beginner", "intermediate", "advanced"}


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


def _topological_sort(nodes: list[dict]) -> list[dict]:
    """Order nodes so every prerequisite appears before its dependents.

    Cycles are broken by falling back to the original order for the
    remaining nodes so a bad edge can never make a roadmap unreadable.
    """
    by_id = {node["id"]: node for node in nodes}
    placed = {node["id"] for node in nodes if not node["prerequisites"]}
    ordered = [node for node in nodes if node["id"] in placed]
    remaining = [node for node in nodes if node["id"] not in placed]
    progress = True
    while progress and remaining:
        progress = False
        for node in list(remaining):
            if all(dep in placed for dep in node["prerequisites"]):
                ordered.append(node)
                placed.add(node["id"])
                remaining.remove(node)
                progress = True
    ordered.extend(remaining)
    return ordered


def _normalize_graph(slug: str, raw: dict) -> dict:
    """Coerce a stored graph into the v2 LearningGraph shape."""
    raw_nodes = raw.get("nodes") or []
    nodes: list[dict] = []
    for raw_node in raw_nodes:
        node_id = str(raw_node.get("id", "")).strip()
        if not node_id:
            continue
        prerequisites = [
            dep.get("id") if isinstance(dep, dict) else str(dep)
            for dep in raw_node.get("prerequisites", [])
        ]
        level = str(raw_node.get("level", DEFAULT_LEVEL)).lower()
        if level not in KNOWN_LEVELS:
            level = DEFAULT_LEVEL
        related = [
            {"id": item.get("id"), "relation": item.get("relation", "cross-domain")}
            for item in raw_node.get("related", [])
            if isinstance(item, dict) and item.get("id")
        ]
        nodes.append(
            {
                "id": node_id,
                "name": str(raw_node.get("name", node_id)),
                "domain": str(raw_node.get("domain", DEFAULT_DOMAIN)),
                "level": level,
                "prerequisites": prerequisites,
                "related": related,
                "keywords": [str(k) for k in raw_node.get("keywords", [])],
            }
        )

    needs_sort = any(
        nodes[i + 1]["prerequisites"] for i in range(len(nodes) - 1)
    ) and any(node["prerequisites"] for node in nodes)
    if needs_sort:
        nodes = _topological_sort(nodes)
    for index, node in enumerate(nodes):
        node["order"] = index

    domains: list[str] = []
    for node in nodes:
        if node["domain"] not in domains:
            domains.append(node["domain"])

    return {
        "slug": slug,
        "title": str(raw.get("title") or slug.replace("-", " ").title()),
        "version": GRAPH_VERSION,
        "domains": domains,
        "nodes": nodes,
    }


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


def load_roadmap_graph(slug: str) -> dict:
    """Load a roadmap as a normalized LearningGraph in topological order."""
    slug = _validated_slug(slug)
    row = _query_one("SELECT graph FROM roadmaps WHERE slug = :slug", slug=slug)
    if row is None or row[0] is None:
        raise RoadmapNotFound(slug)
    return _normalize_graph(slug, row[0])


def load_roadmap_topics(slug: str) -> list[str]:
    """Load topic names for a slug, in topological order."""
    return [node["name"] for node in load_roadmap_graph(slug)["nodes"]]


def graph_domains(graph: dict) -> list[str]:
    """Return the domains present in a LearningGraph."""
    return list(graph.get("domains", []))


def related_topics(graph: dict, topic_id: str) -> list[dict]:
    """Return cross-domain links for a topic, resolved to node names."""
    by_id = {node["id"]: node for node in graph.get("nodes", [])}
    node = by_id.get(topic_id)
    if node is None:
        return []
    resolved = []
    for link in node.get("related", []):
        target = by_id.get(link["id"])
        if target is not None:
            resolved.append(
                {"id": target["id"], "name": target["name"], "relation": link["relation"]}
            )
    return resolved


def next_topics(graph: dict, mastered_ids: set[str], limit: int = 5) -> list[dict]:
    """Return the next topics a learner can take, prerequisites satisfied.

    Walks nodes in topological order, skipping mastered topics and topics
    whose prerequisites are not yet mastered. This is the primitive the
    adaptive roadmap and future ML ranking build on.
    """
    ready = [
        node
        for node in graph.get("nodes", [])
        if node["id"] not in mastered_ids
        and all(dep in mastered_ids for dep in node["prerequisites"])
    ]
    return ready[:limit]
