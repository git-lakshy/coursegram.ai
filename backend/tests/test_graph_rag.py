"""Tests for graph retrieval linking."""

import app.graph_rag as graph_rag


def _graph():
    return {
        "slug": "python",
        "title": "Python",
        "nodes": [
            {"id": "vars", "name": "Variables & Types", "prerequisites": [], "related": [], "keywords": ["variables", "types"]},
            {"id": "funcs", "name": "Functions", "prerequisites": ["vars"], "related": [{"id": "closures", "relation": "cross-domain"}], "keywords": ["functions"]},
            {"id": "closures", "name": "Closures", "prerequisites": ["funcs"], "related": [], "keywords": ["closures"]},
        ],
    }


def test_link_topics_exact_name_match():
    seeds = graph_rag.link_topics("how do closures work", _graph())
    assert seeds == ["Closures"]


def test_link_topics_keyword_overlap():
    seeds = graph_rag.link_topics("explain variables and typing basics", _graph())
    assert "Variables & Types" in seeds


def test_link_topics_no_match_returns_empty():
    assert graph_rag.link_topics("what is the stock market doing", _graph()) == []


def test_expand_neighborhood_edges():
    neighborhood = graph_rag.expand_neighborhood(_graph(), "Functions")
    assert neighborhood is not None
    assert neighborhood["prerequisites"] == ["Variables & Types"]
    assert neighborhood["unlocks"] == ["Closures"]
    assert neighborhood["related"] == ["Closures"]


def test_expand_neighborhood_unknown_seed():
    assert graph_rag.expand_neighborhood(_graph(), "Nope") is None
