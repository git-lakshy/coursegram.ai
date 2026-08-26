"""Tests for the resource recommender (in-memory index, no database)."""

import pytest

import app.resources_store as resources_store


@pytest.fixture()
def index(monkeypatch):
    docs = {
        "cs50x": {
            "id": "cs50x",
            "name": "CS50x Introduction to Computer Science",
            "provider": "Harvard",
            "type": "course",
            "url": "https://cs50.harvard.edu/x",
            "free": True,
            "level": "beginner",
            "duration_hours": 100,
            "rating": 4.9,
            "topics": ["computer-science", "python", "c", "algorithms"],
            "keywords": ["harvard", "intro"],
            "description": "Harvard's introduction to computer science.",
        },
        "python-course-udemy": {
            "id": "python-course-udemy",
            "name": "Complete Python Bootcamp",
            "provider": "Udemy",
            "type": "course",
            "url": "https://udemy.com/x",
            "free": False,
            "level": "beginner",
            "duration_hours": 22,
            "rating": 4.6,
            "topics": ["python", "programming"],
            "keywords": ["udemy", "bootcamp"],
            "description": "Learn python from zero.",
        },
        "khan-linear-algebra": {
            "id": "khan-linear-algebra",
            "name": "Linear Algebra",
            "provider": "Khan Academy",
            "type": "video",
            "url": "https://khanacademy.org/linear-algebra",
            "free": True,
            "level": "intermediate",
            "duration_hours": 30,
            "rating": 4.8,
            "topics": ["linear-algebra", "math"],
            "keywords": ["khan", "matrices"],
            "description": "Vectors, matrices and transformations.",
        },
    }
    postings: dict[str, dict[str, float]] = {}
    topic_index: dict[str, set[str]] = {}
    for resource_id, doc in docs.items():
        for token, weight in resources_store._resource_tokens(doc).items():
            postings.setdefault(token, {})[resource_id] = weight
        for tag in doc.get("topics", []):
            topic_index.setdefault(tag, set()).add(resource_id)
    monkeypatch.setattr(resources_store, "_docs", docs)
    monkeypatch.setattr(resources_store, "_postings", postings)
    monkeypatch.setattr(resources_store, "_topic_index", topic_index)
    monkeypatch.setattr(resources_store, "_last_loaded", resources_store.time.monotonic())
    return docs


def test_tag_match_ranks_exact_topics_first(index):
    results = resources_store.search_resources(["python"], level="beginner")
    assert results
    assert results[0]["id"] in {"cs50x", "python-course-udemy"}
    assert all("python" in r["matched_topics"] or r["score"] > 0 for r in results)


def test_free_filter_excludes_paid(index):
    results = resources_store.search_resources(["python"], level="beginner", free=True)
    assert all(r["free"] for r in results)


def test_type_filter(index):
    results = resources_store.search_resources(["linear-algebra"], resource_types=["video"])
    assert results and all(r["type"] == "video" for r in results)


def test_provider_diversity(index):
    results = resources_store.search_resources(["python"], level="beginner", limit=6)
    providers = [r["provider"] for r in results]
    assert len(providers) == len(set(providers)) or len(results) <= 2


def test_level_match_prefers_exact(index):
    beginner = resources_store.search_resources(["python"], level="beginner")
    advanced = resources_store.search_resources(["python"], level="advanced")
    assert beginner[0]["score"] >= advanced[0]["score"]


def test_no_match_returns_empty(index):
    assert resources_store.search_resources(["quantum-chemistry"]) == []


def test_resources_count(index):
    assert resources_store.resources_count() == 3
