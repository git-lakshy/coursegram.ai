"""Tests for onboarding helpers: JSON parsing and topic canonicalization."""

import pytest
from fastapi import HTTPException

from app.onboarding import _canonical_topic, _parse_json


def test_parse_json_plain_object():
    assert _parse_json('{"a": 1}') == {"a": 1}


def test_parse_json_fenced():
    raw = "```json\n{\"a\": 1}\n```"
    assert _parse_json(raw) == {"a": 1}


def test_parse_json_with_surrounding_prose():
    raw = 'Here is the plan:\n{"a": 1}\nHope this helps!'
    assert _parse_json(raw) == {"a": 1}


def test_parse_json_no_object_raises():
    with pytest.raises(HTTPException) as exc:
        _parse_json("sorry, I cannot help with that")
    assert exc.value.status_code == 502


def test_canonical_topic_exact_match():
    remaining = ["Variables & Types", "Functions", "Closures"]
    assert _canonical_topic("Functions", remaining) == "Functions"


def test_canonical_topic_case_and_space_drift():
    remaining = ["Variables & Types", "Functions", "DOM Manipulation"]
    assert _canonical_topic("functions", remaining) == "Functions"
    assert _canonical_topic("Dom manipulation", remaining) == "DOM Manipulation"
    assert _canonical_topic("DOM  Manipulation", remaining) == "DOM Manipulation"


def test_canonical_topic_near_miss():
    remaining = ["Object Oriented Programming", "Asynchronous JavaScript"]
    assert _canonical_topic("Object-Oriented Programming", remaining) == "Object Oriented Programming"


def test_canonical_topic_unknown_returns_none():
    remaining = ["Variables", "Functions"]
    assert _canonical_topic("Quantum Computing", remaining) is None
