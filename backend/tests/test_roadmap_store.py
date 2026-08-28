
"""Unit tests for LearningGraph normalization and traversal helpers."""

from app.roadmap_store import _normalize_graph, next_topics, related_topics


def _graph():
    return _normalize_graph(
        "test",
        {
            "slug": "test",
            "nodes": [
                {"id": "a", "name": "A", "prerequisites": []},
                {
                    "id": "c",
                    "name": "C",
                    "prerequisites": ["a", "b"],
                    "related": [{"id": "a", "relation": "cross-domain"}],
                    "keywords": ["c"],
                },
                {"id": "b", "name": "B", "prerequisites": ["a"]},
            ],
        },
    )


def test_normalize_sorts_topologically():
    graph = _graph()
    ids = [node["id"] for node in graph["nodes"]]
    assert ids.index("a") < ids.index("b") < ids.index("c")
    assert [node["order"] for node in graph["nodes"]] == [0, 1, 2]


def test_normalize_derives_domains_and_version():
    graph = _graph()
    assert graph["version"] == 3
    assert graph["domains"] == ["core"]
    assert all(node["level"] == "beginner" for node in graph["nodes"])


def test_next_topics_respects_prerequisites():
    graph = _graph()
    ready = next_topics(graph, set())
    assert [node["id"] for node in ready] == ["a"]
    ready = next_topics(graph, {"a"})
    assert [node["id"] for node in ready] == ["b"]
    ready = next_topics(graph, {"a", "b"})
    assert [node["id"] for node in ready] == ["c"]
    assert next_topics(graph, {"a", "b", "c"}) == []


def test_related_topics_resolves_names():
    graph = _graph()
    related = related_topics(graph, "c")
    assert related == [{"id": "a", "name": "A", "relation": "cross-domain"}]
    assert related_topics(graph, "missing") == []
