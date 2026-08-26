"""Tests for the rolling learner context generator."""

import pytest

import app.learner_context as learner_context
from app.models import LearnerProfile


@pytest.fixture()
def grounded(monkeypatch):
    graph = {
        "slug": "python",
        "title": "Python",
        "nodes": [
            {"id": "a", "name": "Variables", "domain": "core", "level": "beginner",
             "order": 0, "prerequisites": [], "related": [], "keywords": []},
            {"id": "b", "name": "Functions", "domain": "core", "level": "beginner",
             "order": 1, "prerequisites": ["a"], "related": [], "keywords": []},
        ],
    }
    saved = {}

    def fake_load_profile(email):
        return saved.get(email, LearnerProfile(target_role_slug="python", skill_level="beginner"))

    def fake_save_profile(email, profile):
        saved[email] = profile
        return profile

    def fake_llm(messages, **kwargs):
        return '{"summary": "Beginner aiming for Python, ready to start Variables."}'

    monkeypatch.setattr(learner_context, "load_profile", fake_load_profile)
    monkeypatch.setattr(learner_context, "save_profile", fake_save_profile)
    monkeypatch.setattr(learner_context, "load_roadmap_graph", lambda slug: graph)
    monkeypatch.setattr(learner_context.llm, "is_configured", lambda: True)
    monkeypatch.setattr(learner_context.llm, "chat_completion", fake_llm)
    return saved


def test_build_learner_context_persists_summary(grounded):
    context = learner_context.build_learner_context("a@b.com")
    assert context is not None
    assert "Variables" in context["summary"]
    assert context["snapshot"]["next_topics"] == ["Variables"]
    stored = learner_context.context_summary_for("a@b.com")
    assert "Beginner" in stored


def test_context_skips_when_no_target_role(grounded, monkeypatch):
    monkeypatch.setattr(
        learner_context,
        "load_profile",
        lambda email: LearnerProfile(),
    )
    assert learner_context.build_learner_context("a@b.com") is None


def test_context_returns_none_when_llm_fails(grounded, monkeypatch):
    def boom(messages, **kwargs):
        raise learner_context.llm.LLMError("down")

    monkeypatch.setattr(learner_context.llm, "chat_completion", boom)
    assert learner_context.build_learner_context("a@b.com") is None


def test_situation_falls_back_to_empty(grounded):
    assert learner_context.situation_for("missing@b.com") == {}
