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

import json
import re

from sqlalchemy import text

import app.config  # loads backend/.env before anything reads the environment

from app.db import DatabaseNotConfigured, get_engine

SLUG_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
CHOICE_HEADER_RE = re.compile(r"^\s*(pick|choose|select)\b", re.IGNORECASE)
LANGUAGE_NAMES = {
    "python", "java", "javascript", "typescript", "go", "c", "c#", "c++", "cpp", "rust", "ruby", "php", "swift",
    "kotlin", "scala", "dart", "r", "matlab", "perl", "haskell", "elixir", "clojure", "erlang", "lua",
}
SLASH_RE = re.compile(r"\s+/\s+")

GRAPH_VERSION = 3
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


def _detect_choice_groups(nodes: list[dict]) -> tuple[list[dict], list[dict]]:
    """Tag nodes that are alternatives under a Pick/Choose header."""
    choice_groups: list[dict] = []
    idx = 0
    while idx < len(nodes):
        name = str(nodes[idx].get("name", "")).strip()
        if CHOICE_HEADER_RE.match(name):
            header_id = str(nodes[idx].get("id", "")).strip()
            header_name = str(nodes[idx].get("name", "")).strip()
            is_lang = "language" in header_name.lower()
            options: list[str] = []
            if is_lang:
                window_start = max(0, idx - 8)
                window_end = min(len(nodes), idx + 9)
                for w in range(window_start, window_end):
                    if w == idx:
                        continue
                    cand = nodes[w]
                    if cand.get("prerequisites"):
                        continue
                    cand_name = str(cand.get("name", "")).strip()
                    if cand_name.lower() in LANGUAGE_NAMES:
                        cid = str(cand.get("id", "")).strip()
                        if cid not in options:
                            options.append(cid)
                look = idx + 1
                while look < len(nodes) and str(nodes[look].get("name", "")).strip().lower() in LANGUAGE_NAMES:
                    look += 1
            else:
                look = idx + 1
                while look < len(nodes):
                    cand = nodes[look]
                    if cand.get("prerequisites"):
                        break
                    cand_name = str(cand.get("name", "")).strip()
                    if not cand_name or len(cand_name) > 40 or CHOICE_HEADER_RE.match(cand_name):
                        break
                    if len(cand_name.split()) > 3:
                        break
                    options.append(str(cand.get("id", "")).strip())
                    look += 1
            if len(options) >= 2:
                group_id = f"choice-{header_id}"
                nodes[idx]["choice_group"] = group_id
                option_names: list[str] = []
                for opt_id in options:
                    for n in nodes:
                        if n.get("id") == opt_id:
                            n["choice_group"] = group_id
                            option_names.append(str(n.get("name", opt_id)))
                            break
                choice_groups.append(
                    {
                        "id": group_id,
                        "prompt": header_name,
                        "options": options,
                        "option_names": option_names,
                        "header_id": header_id,
                    }
                )
                idx = look
                continue
            else:
                # Header with <2 options is just an instruction, drop it
                nodes.pop(idx)
                continue
        idx += 1
    return nodes, choice_groups


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
        entry: dict = {
            "id": node_id,
            "name": str(raw_node.get("name", node_id)),
            "domain": str(raw_node.get("domain", DEFAULT_DOMAIN)),
            "level": level,
            "prerequisites": prerequisites,
            "related": related,
            "keywords": [str(k) for k in raw_node.get("keywords", [])],
        }
        if raw_node.get("choice_group"):
            entry["choice_group"] = str(raw_node["choice_group"])
        nodes.append(entry)

    # Fix duplicate IDs caused by sanitization (e.g. "C#", "C++", "C" all -> "c")
    seen: set[str] = set()
    for node in nodes:
        orig = node["id"]
        if orig in seen:
            suffix = 2
            new_id = f"{orig}-{suffix}"
            while new_id in seen:
                suffix += 1
                new_id = f"{orig}-{suffix}"
            node["id"] = new_id
        seen.add(node["id"])

    existing_groups = raw.get("choice_groups")
    if isinstance(existing_groups, list) and existing_groups:
        choice_groups: list[dict] = existing_groups
    else:
        nodes, choice_groups = _detect_choice_groups(nodes)

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

    result: dict = {
        "slug": slug,
        "title": str(raw.get("title") or slug.replace("-", " ").title()),
        "version": GRAPH_VERSION,
        "domains": domains,
        "nodes": nodes,
    }
    if choice_groups:
        result["choice_groups"] = choice_groups
    return result


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


def list_roadmap_options() -> list[dict]:
    """Slug and title pairs, so prompts can show what each track is."""
    try:
        engine = get_engine()
    except DatabaseNotConfigured:
        raise
    except Exception as error:
        raise DatabaseNotConfigured(str(error)) from error
    try:
        with engine.connect() as connection:
            rows = connection.execute(
                text("SELECT slug, title FROM roadmaps ORDER BY slug")
            ).fetchall()
            return [{"slug": row[0], "title": row[1] or row[0]} for row in rows]
    except Exception as error:
        raise DatabaseNotConfigured(str(error)) from error


def insert_generated_track(slug: str, title: str, graph: dict) -> None:
    """Store an LLM generated track as a first class roadmap."""
    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO roadmaps (slug, title, topics, graph, updated_at) "
                "VALUES (:slug, :title, CAST(:topics AS jsonb), CAST(:graph AS jsonb), now()) "
                "ON CONFLICT (slug) DO UPDATE SET title = :title, "
                "topics = CAST(:topics AS jsonb), graph = CAST(:graph AS jsonb), updated_at = now()"
            ),
            {
                "slug": slug,
                "title": title,
                "topics": json.dumps([str(node["name"]) for node in graph["nodes"]]),
                "graph": json.dumps(graph),
            },
        )


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


def order_topics_topologically(graph: dict, topics: list[str]) -> list[str]:
    """Stable sort topic names by the graph's topological order.

    Topics missing from the graph keep their relative order at the end,
    so an LLM plan can never list a topic before its prerequisites.
    """
    order = {str(node["name"]): node["order"] for node in graph.get("nodes", [])}
    known = [topic for topic in topics if topic in order]
    unknown = [topic for topic in topics if topic not in order]
    return sorted(known, key=lambda topic: order[topic]) + unknown


def enforce_phase_order(graph: dict, phases: list[dict]) -> list[dict]:
    """Reorder phase topics so prerequisites always come first.

    Phase boundaries are preserved; only the topics inside the flattened
    sequence are stable sorted topologically.
    """
    sizes = [len(phase["topics"]) for phase in phases]
    flat = [topic for phase in phases for topic in phase["topics"]]
    ordered = order_topics_topologically(graph, flat)
    chunks = []
    index = 0
    for size in sizes:
        chunks.append(ordered[index : index + size])
        index += size
    return [dict(phase, topics=chunk) for phase, chunk in zip(phases, chunks)]


def next_topics(graph: dict, mastered_ids: set[str], limit: int = 5) -> list[dict]:
    """Return the next topics, respecting prerequisites and choice groups."""
    mastered_lower = {str(m).lower() for m in mastered_ids}
    satisfied_groups: set[str] = set()
    first_of_group: dict[str, str] = {}
    for grp in graph.get("choice_groups", []):
        opts: list[str] = grp.get("options", [])
        opt_names: list[str] = grp.get("option_names", [])
        if opts:
            first_of_group[grp["id"]] = opts[0]
        # Check both ids and display names (for C# etc where id "c" != name "c#")
        if any(
            str(o).lower() in mastered_lower for o in opts
        ) or any(str(n).lower() in mastered_lower for n in opt_names):
            satisfied_groups.add(grp["id"])
            hdr = grp.get("header_id")
            if hdr:
                satisfied_groups.add(hdr)

    ready: list[dict] = []
    for node in graph.get("nodes", []):
        nid: str = node.get("id", "")
        nname_lower = str(node.get("name", "")).lower()
        if nid.lower() in mastered_lower or nname_lower in mastered_lower:
            continue
        if any(nid == g.get("header_id") for g in graph.get("choice_groups", [])):
            continue
        cg: str | None = node.get("choice_group")
        if cg:
            if cg in satisfied_groups:
                continue
            if first_of_group.get(cg) != nid:
                continue
        if not all(dep.lower() in mastered_lower or dep in satisfied_groups for dep in node.get("prerequisites", [])):
            continue
        ready.append(node)
        if len(ready) >= limit:
            break
    return ready
