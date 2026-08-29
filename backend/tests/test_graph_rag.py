"""Tests for graph retrieval linking and assistant action validation."""

import asyncio

import pytest

import app.graph_rag as graph_rag
from app.actions import ActionError, MAX_ACTIONS_PER_TURN
from app.actions import execute_actions


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


def test_execute_actions_rejects_unsupported_type():
    results = asyncio.run(execute_actions("a@b.com", object(), [{"type": "delete_everything"}]))
    assert results[0]["applied"] is False
    assert "Unsupported" in results[0]["reason"]


def test_max_actions_constant_is_three():
    assert MAX_ACTIONS_PER_TURN == 3


def test_require_track_raises_without_slug():
    class FakeProfile:
        target_role_slug = None

    from app.actions import _require_track

    with pytest.raises(ActionError):
        _require_track(FakeProfile())
