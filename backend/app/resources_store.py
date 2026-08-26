"""Curated learning resource store and lightweight recommender.

Resources are JSONB documents in the resources table (populated from
local course-data files). On first use the whole table is loaded into an
in-memory inverted index; a version check against MAX(updated_at) every
RESOURCE_RELOAD_SECONDS picks up re-population without a restart.

Scoring blends structured signals with lexical overlap:

    score = 3.0 * tag_coverage + bm25_lite
          + 0.8 * level_match + 0.5 * rating_norm
          + 0.4 * free_bonus - provider diversity penalty

The corpus is small (hundreds), so brute force scoring over the postings
is effectively instant and needs no external dependencies.
"""

import re
import threading
import time

from sqlalchemy import text

from app.db import DatabaseNotConfigured, get_engine

RESOURCE_RELOAD_SECONDS = 60.0
TOKEN_PATTERN = re.compile(r"[a-z0-9]+")

LEVELS = ["beginner", "intermediate", "advanced"]

# Token weight by source field.
FIELD_WEIGHTS = {"topics": 3.0, "keywords": 3.0, "name": 2.0, "description": 1.0}

_lock = threading.Lock()
_docs: dict[str, dict] = {}
_postings: dict[str, dict[str, float]] = {}  # token -> {resource_id: weight}
_topic_index: dict[str, set[str]] = {}  # normalized topic tag -> resource ids
_last_loaded: float = 0.0
_max_updated_at: str = ""


def _tokenize(value: str) -> list[str]:
    return TOKEN_PATTERN.findall(value.lower())


def _resource_tokens(doc: dict) -> dict[str, float]:
    """Token weights for one resource across weighted fields."""
    tokens: dict[str, float] = {}
    for field, weight in FIELD_WEIGHTS.items():
        value = doc.get(field)
        if not value:
            continue
        if isinstance(value, list):
            text_value = " ".join(str(item) for item in value)
        else:
            text_value = str(value)
        for token in _tokenize(text_value):
            tokens[token] = max(tokens.get(token, 0.0), weight)
    # Kebab-case topic tags also index their parts: "data-structures" -> data, structures
    for tag in doc.get("topics", []):
        for part in _tokenize(str(tag)):
            tokens[part] = max(tokens.get(part, 0.0), 2.0)
    return tokens


def _load_from_db() -> None:
    global _docs, _postings, _topic_index, _last_loaded, _max_updated_at
    engine = get_engine()
    with engine.connect() as connection:
        max_updated = connection.execute(
            text("SELECT coalesce(max(updated_at)::text, '') FROM resources")
        ).scalar()
        if max_updated == _max_updated_at and _docs:
            _last_loaded = time.monotonic()
            return
        rows = connection.execute(text("SELECT id, doc FROM resources"))
        docs = {row[0]: dict(row[1]) for row in rows}

    postings: dict[str, dict[str, float]] = {}
    topic_index: dict[str, set[str]] = {}
    for resource_id, doc in docs.items():
        for token, weight in _resource_tokens(doc).items():
            postings.setdefault(token, {})[resource_id] = weight
        for tag in doc.get("topics", []):
            topic_index.setdefault(str(tag).lower(), set()).add(resource_id)

    with _lock:
        _docs = docs
        _postings = postings
        _topic_index = topic_index
        _max_updated_at = max_updated or ""
        _last_loaded = time.monotonic()


def _ensure_loaded() -> None:
    if not _docs or time.monotonic() - _last_loaded > RESOURCE_RELOAD_SECONDS:
        try:
            _load_from_db()
        except DatabaseNotConfigured:
            raise
        except Exception as error:
            raise DatabaseNotConfigured(str(error)) from error


def _level_match(resource_level: str, learner_level: str) -> float:
    if resource_level == learner_level:
        return 1.0
    if abs(LEVELS.index(resource_level) - LEVELS.index(learner_level)) == 1:
        return 0.4
    return 0.0


def _rating_norm(rating: float) -> float:
    return min(max((rating - 3.5) / 1.5, 0.0), 1.0)


def _bm25_lite(query_tokens: list[str], resource_id: str) -> float:
    score = 0.0
    for token in query_tokens:
        score += _postings.get(token, {}).get(resource_id, 0.0)
    return score / (1.0 + len(query_tokens))


def search_resources(
    topics: list[str],
    level: str = "beginner",
    free: bool | None = None,
    resource_types: list[str] | None = None,
    limit: int = 6,
) -> list[dict]:
    """Rank resources for target topics and a learner level.

    Returns top matches with score and matched topic tags, applying a
    greedy provider diversity penalty so one provider cannot dominate.
    """
    _ensure_loaded()
    if not _docs:
        return []

    query_tokens: list[str] = []
    normalized_topics: list[str] = []
    for topic in topics:
        tag = str(topic).lower().strip()
        if not tag:
            continue
        normalized_topics.append(tag)
        query_tokens.extend(_tokenize(tag))
    query_tokens = list(dict.fromkeys(query_tokens))
    topic_set = set(normalized_topics)

    candidates: set[str] = set()
    for tag in normalized_topics:
        candidates.update(_topic_index.get(tag, set()))
        for part in _tokenize(tag):
            candidates.update(_postings.get(part, {}).keys())
    if not candidates:
        for token in query_tokens:
            candidates.update(_postings.get(token, {}).keys())
    if not candidates:
        return []

    scored: list[tuple[float, str, list[str]]] = []
    for resource_id in candidates:
        doc = _docs[resource_id]
        if free is True and not doc.get("free"):
            continue
        if resource_types and doc.get("type") not in resource_types:
            continue
        doc_topics = {str(tag).lower() for tag in doc.get("topics", [])}
        matched = sorted(doc_topics & topic_set)
        doc_keywords = {str(k).lower() for k in doc.get("keywords", [])}
        if not matched:
            keyword_hits = len(doc_keywords & topic_set)
            if keyword_hits == 0 and _bm25_lite(query_tokens, resource_id) < 0.5:
                continue
        coverage = len(matched) / len(topic_set) if topic_set else 0.0
        score = (
            3.0 * coverage
            + _bm25_lite(query_tokens, resource_id)
            + 0.8 * _level_match(str(doc.get("level", "beginner")), level)
            + 0.5 * _rating_norm(float(doc.get("rating", 0)))
            + (0.4 if doc.get("free") else 0.0)
        )
        scored.append((score, resource_id, matched))

    scored.sort(key=lambda item: item[0], reverse=True)

    provider_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}
    results: list[dict] = []
    for score, resource_id, matched in scored:
        doc = _docs[resource_id]
        provider = str(doc.get("provider", ""))
        resource_type = str(doc.get("type", ""))
        provider_penalty = 0.6 * provider_counts.get(provider, 0)
        type_penalty = 0.3 * type_counts.get(resource_type, 0)
        if provider_counts.get(provider, 0) >= 2 or type_counts.get(resource_type, 0) >= 3:
            continue
        adjusted = score - provider_penalty - type_penalty
        results.append(
            {
                "id": resource_id,
                "name": doc.get("name", resource_id),
                "provider": provider,
                "type": resource_type,
                "url": doc.get("url", ""),
                "free": bool(doc.get("free")),
                "level": doc.get("level", "beginner"),
                "duration_hours": doc.get("duration_hours", 0),
                "rating": doc.get("rating", 0),
                "description": doc.get("description", ""),
                "matched_topics": matched,
                "score": round(adjusted, 3),
            }
        )
        provider_counts[provider] = provider_counts.get(provider, 0) + 1
        type_counts[resource_type] = type_counts.get(resource_type, 0) + 1
        if len(results) >= limit:
            break
    return results


def resources_count() -> int:
    _ensure_loaded()
    return len(_docs)


def next_topics_with_resources(
    user_email: str,
    slug: str,
    limit_topics: int = 3,
    resources_per_topic: int = 3,
) -> dict | None:
    """Return the learner's next topics with matched resources for a track.

    Combines the LearningGraph traversal (prerequisite satisfied next
    topics, using the learner's known topics) with resource matching per
    node. Returns None when the roadmap slug is unknown.
    """
    from app.profile_store import load_profile
    from app.roadmap_store import RoadmapNotFound, load_roadmap_graph, next_topics

    try:
        graph = load_roadmap_graph(slug)
    except RoadmapNotFound:
        return None
    profile = load_profile(user_email)
    mastered = {str(topic).lower() for topic in profile.known_topics}
    ready = next_topics(graph, mastered, limit=limit_topics)
    level = str(profile.skill_level or "beginner")
    return {
        "slug": slug,
        "next": [
            {
                "id": node["id"],
                "name": node["name"],
                "domain": node["domain"],
                "level": node["level"],
                "keywords": node.get("keywords", []),
                "resources": search_resources(
                    topics=[node["name"]] + node.get("keywords", []),
                    level=level,
                    limit=resources_per_topic,
                ),
            }
            for node in ready
        ],
    }
