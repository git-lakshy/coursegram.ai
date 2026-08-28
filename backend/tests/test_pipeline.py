"""Tests for the projects and assessments pipelines (pure logic, no DB)."""

import pytest

import app.assessments as assessments
import app.projects as projects_pipeline


def test_grade_submission_scores_and_misses():
    questions = [
        {"id": "q1", "question": "a", "options": ["x", "y"], "answer_index": 0, "topic": "T1"},
        {"id": "q2", "question": "b", "options": ["x", "y"], "answer_index": 1, "topic": "T2"},
        {"id": "q3", "question": "c", "options": ["x", "y"], "answer_index": 0, "topic": "T1"},
    ]
    answers = [
        {"question_id": "q1", "answer_index": 0},
        {"question_id": "q2", "answer_index": 0},
    ]
    graded = assessments.grade_submission(questions, answers)
    assert graded["score"] == 1
    assert graded["total"] == 3
    assert graded["missed"] == ["T2", "T1"]


def test_grade_submission_skips_unknown_questions():
    questions = [{"id": "q1", "question": "a", "options": ["x", "y"], "answer_index": 0, "topic": "T1"}]
    graded = assessments.grade_submission(questions, [{"question_id": "zz", "answer_index": 0}])
    assert graded["score"] == 0
    assert graded["missed"] == ["T1"]


def test_valid_questions_rejects_bad_answer_index():
    payload = {
        "questions": [
            {"id": "q1", "question": "a", "options": ["x", "y"], "answer_index": 5, "topic": "T"},
            {"id": "q2", "question": "b", "options": ["x", "y"], "answer_index": 1, "topic": "T"},
            {"id": "q3", "question": "c", "options": ["x", "y"], "answer_index": 0, "topic": "T"},
            {"id": "q4", "question": "d", "options": ["x", "y"], "answer_index": 0, "topic": "T"},
        ]
    }
    cleaned = assessments._valid_questions(payload)
    assert cleaned is not None
    assert len(cleaned) == 3
    assert all(0 <= question["answer_index"] < len(question["options"]) for question in cleaned)


def test_valid_questions_requires_minimum():
    payload = {"questions": [{"id": "q1", "question": "a", "options": ["x", "y"], "answer_index": 0, "topic": "T"}]}
    assert assessments._valid_questions(payload) is None


def test_sequential_stages_chunks_topics():
    stages = assessments._sequential_stages([f"t{i}" for i in range(26)])
    assert [len(stage["topics"]) for stage in stages] == [12, 12, 2]
    assert stages[0]["name"] == "Stage 1"
    assert stages[0]["position"] == 1


def test_valid_projects_requires_minimum_and_dedupes():
    payload = {
        "projects": [
            {"title": "A", "description": "d", "stage": "core", "skills": ["s"], "related_topics": ["t"]},
            {"title": "A", "description": "dupe", "stage": "core", "skills": [], "related_topics": []},
            {"title": "B", "description": "d", "stage": "core", "skills": [], "related_topics": []},
            {"title": "C", "description": "d", "stage": "core", "skills": [], "related_topics": []},
        ]
    }
    cleaned = projects_pipeline._valid_projects(payload)
    assert cleaned is not None
    assert len(cleaned) == 3
    assert cleaned[0]["difficulty"] == "intermediate"


def test_valid_projects_rejects_too_few():
    payload = {
        "projects": [
            {"title": "A", "description": "d", "stage": "core", "skills": [], "related_topics": []},
            {"title": "B", "description": "d", "stage": "core", "skills": [], "related_topics": []},
        ]
    }
    assert projects_pipeline._valid_projects(payload) is None


def test_with_ids_is_stable():
    base = [{"title": "A", "description": "d", "stage": "core", "difficulty": "beginner", "skills": [], "related_topics": []}]
    first = projects_pipeline._with_ids("python", base)
    second = projects_pipeline._with_ids("python", base)
    assert first[0]["id"] == second[0]["id"] == "python-p1"
