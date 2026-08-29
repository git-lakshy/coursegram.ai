"""Stage level assessments: LLM generated quizzes per roadmap stage with
server side scoring and roadmap adjustment.

A stage is assessable once the learner has completed or is currently
working on its topics (same stages as the roadmap: personalized phases
when present, otherwise sequential chunks of the track's topics). Scores
below 50 percent mark the stage's completed topics as uncompleted so the
roadmap moves the learner back, the stage is flagged for revisiting, and
matched resources are returned for the weak topics. Results persist in
assessment_results and feed future mastery estimates.
"""

import json
import logging
import os
import re

from app import llm
from app.event_store import record_event
from app.progress_store import get_progress, save_progress
from app.profile_store import load_profile
from app.roadmap_store import RoadmapNotFound, load_roadmap_graph
from app.resources_store import search_resources

logger = logging.getLogger("app.assessments")

CACHE_DIR = os.path.join(os.path.dirname(__file__), "data", "runtime", "assessment_cache")

QUESTION_COUNT = 6
PASS_RATIO = 0.5
DEFAULT_STAGE_SIZE = 12
MAX_RESOURCES_PER_TOPIC = 2


def stage_key(stage_position: int, stage_name: str) -> str:
    safe = re.sub(r"[^a-z0-9]+", "_", stage_name.lower()).strip("_")
    return f"s{stage_position}_{safe or 'stage'}"


def _cache_path(slug: str, key: str) -> str:
    safe = re.sub(r"[^a-z0-9]+", "_", f"{slug}__{key}".lower()).strip("_")
    return os.path.join(CACHE_DIR, f"{safe}.json")


def _valid_questions(payload) -> list[dict] | None:
    if not isinstance(payload, dict):
        return None
    questions = payload.get("questions")
    if not isinstance(questions, list) or not questions:
        return None
    cleaned: list[dict] = []
    for index, item in enumerate(questions):
        if not isinstance(item, dict):
            continue
        question = str(item.get("question", "")).strip()
        options = [str(option).strip() for option in item.get("options", []) if str(option).strip()]
        answer_index = item.get("answer_index")
        if not question or len(options) < 2:
            continue
        if not isinstance(answer_index, int) or not 0 <= answer_index < len(options):
            continue
        cleaned.append(
            {
                "id": str(item.get("id") or f"q{index + 1}"),
                "question": question,
                "options": options[:4],
                "answer_index": min(answer_index, len(options[:4]) - 1),
                "topic": str(item.get("topic") or "").strip(),
            }
        )
    if len(cleaned) < 3:
        return None
    return cleaned[:QUESTION_COUNT]


def _load_cache(slug: str, key: str) -> list[dict] | None:
    try:
        with open(_cache_path(slug, key), encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None
    return _valid_questions(payload)


def _save_cache(slug: str, key: str, questions: list[dict]) -> None:
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(_cache_path(slug, key), "w", encoding="utf-8") as handle:
        json.dump({"slug": slug, "key": key, "questions": questions}, handle, ensure_ascii=False, indent=2)


def _sequential_stages(topic_names: list[str]) -> list[dict]:
    stages = []
    for start in range(0, len(topic_names), DEFAULT_STAGE_SIZE):
        chunk = topic_names[start : start + DEFAULT_STAGE_SIZE]
        stages.append(
            {
                "name": f"Stage {len(stages) + 1}",
                "position": len(stages) + 1,
                "topics": chunk,
                "milestone": "",
            }
        )
    return stages


def stages_for_learner(email: str, slug: str) -> list[dict]:
    """The learner's roadmap stages with completion state and assessability."""
    try:
        graph = load_roadmap_graph(slug)
    except RoadmapNotFound:
        raise RoadmapNotFound(slug)

    topic_names = [node["name"] for node in graph.get("nodes", [])]
    profile = load_profile(email)
    personalized = profile.personalized_roadmap
    if (
        isinstance(personalized, dict)
        and personalized.get("slug") == slug
        and isinstance(personalized.get("phases"), list)
        and personalized["phases"]
    ):
        stages = [
            {
                "name": str(phase.get("name", f"Stage {index + 1}")),
                "position": index + 1,
                "topics": [str(topic) for topic in phase.get("topics", [])],
                "milestone": str(phase.get("milestone", "")),
            }
            for index, phase in enumerate(personalized["phases"])
            if isinstance(phase, dict)
        ]
    else:
        stages = _sequential_stages(topic_names)

    completed = set(get_progress(email, slug))
    current_assigned = False
    for stage in stages:
        done = [topic for topic in stage["topics"] if topic in completed]
        stage["completed_count"] = len(done)
        stage["completed_topics"] = done
        is_current = not current_assigned and len(done) < len(stage["topics"])
        stage["is_current"] = is_current
        if is_current:
            current_assigned = True
        stage["assessable"] = len(done) > 0 or is_current
    return stages


def _stage_questions_prompt(slug: str, stage: dict) -> str:
    topics = stage["topics"][:10]
    milestone = stage.get("milestone") or "demonstrating the stage's skills"
    return (
        "You write skill check assessments for software learners. "
        f"Track: {slug}. Roadmap stage: {stage['name']}. "
        f"Stage milestone: {milestone}. "
        f"Stage topics: {', '.join(topics)}. "
        f"Write exactly {QUESTION_COUNT} multiple choice questions covering "
        "these topics, mixed conceptual and practical, exactly one correct "
        "option each. Every question must belong to one of the stage topics. "
        "Respond with JSON only: {\"questions\": [{\"id\": \"q1\", "
        "\"question\": \"...\", \"options\": [\"...\", \"...\", \"...\", \"...\"], "
        "\"answer_index\": 0, \"topic\": \"one of the stage topics\"}]}. "
        "Do not include any text outside the JSON."
    )


async def generate_stage_assessment(email: str, slug: str, stage_position: int) -> dict:
    """Generate (or reuse cached) questions for one assessable stage."""
    stages = stages_for_learner(email, slug)
    stage = next((item for item in stages if item["position"] == stage_position), None)
    if stage is None:
        raise RoadmapNotFound(slug)
    if not stage["assessable"]:
        raise PermissionError("This stage is not assessable yet")

    key = stage_key(stage["position"], stage["name"])
    cached = _load_cache(slug, key)
    if cached is not None:
        return {"stage": stage["name"], "position": stage["position"], "questions": cached}

    if not llm.is_configured():
        raise llm.LLMNotConfigured("Set NVIDIA_API_KEY to enable assessments")

    raw = await llm.chat_completion(
        [{"role": "user", "content": _stage_questions_prompt(slug, stage)}],
        json_mode=True,
        temperature=0.5,
        max_tokens=4096,
    )
    try:
        cleaned = raw.strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        data = json.loads(cleaned[start : end + 1] if start != -1 and end > start else cleaned)
    except (json.JSONDecodeError, ValueError) as error:
        logger.warning("Assessment parse failed for %s/%s: %s", slug, key, error)
        raise llm.LLMError("Could not parse generated assessment") from error
    questions = _valid_questions(data)
    if questions is None:
        logger.warning("Assessment generation unusable for %s/%s", slug, key)
        raise llm.LLMError("Generated assessment was unusable")
    _save_cache(slug, key, questions)
    return {"stage": stage["name"], "position": stage["position"], "questions": questions}


def grade_submission(questions: list[dict], answers: list[dict]) -> dict:
    """Score answers against the cached answer key.

    answers: [{"question_id": "...", "answer_index": int}]. Unknown or
    missing questions count as skipped.
    """
    score = 0
    missed: list[str] = []
    for question in questions:
        entry = next(
            (answer for answer in answers if answer.get("question_id") == question["id"]),
            None,
        )
        selected = entry.get("answer_index") if entry else None
        if isinstance(selected, int) and 0 <= selected < len(question["options"]) and selected == question["answer_index"]:
            score += 1
        else:
            missed.append(question.get("topic") or question["id"])
    total = len(questions)
    ratio = score / total if total else 0
    return {"score": score, "total": total, "missed": missed, "ratio": ratio}


def submit_stage_assessment(email: str, slug: str, stage_position: int, answers: list[dict], questions: list[dict]) -> dict:
    """Grade, adjust the roadmap on a failing score, and persist the result."""
    stages = stages_for_learner(email, slug)
    stage = next((item for item in stages if item["position"] == stage_position), None)
    if stage is None:
        raise RoadmapNotFound(slug)

    graded = grade_submission(questions, answers)
    ratio = graded["ratio"]
    passed = ratio >= PASS_RATIO

    revisit_topics: list[str] = []
    if not passed:
        revisit_topics = list(stage["completed_topics"])
        if revisit_topics:
            completed = get_progress(email, slug)
            remaining = [topic for topic in completed if topic not in revisit_topics]
            save_progress(email, slug, remaining)
            for topic in revisit_topics:
                record_event(email, "topic_uncompleted", {"slug": slug, "topic": topic})
        summary_parts = [
            f"You scored {graded['score']} out of {graded['total']} on {stage['name']}.",
            "That is below the passing bar, so the topics you had completed in this stage were marked uncompleted for revisiting.",
            "Work through the resources below, then retake this assessment.",
        ]
    else:
        if graded["missed"]:
            summary_parts = [
                f"You scored {graded['score']} out of {graded['total']} on {stage['name']}.",
                f"Solid pass. Skim the weak spots: {', '.join(dict.fromkeys(graded['missed']))}.",
            ]
        else:
            summary_parts = [
                f"You scored {graded['score']} out of {graded['total']} on {stage['name']}.",
                "Clean pass. Move on to the next stage.",
            ]
    summary = " ".join(summary_parts)

    weak_topics = sorted(set(graded["missed"]))
    resources: list[dict] = []
    if weak_topics:
        level = str(load_profile(email).skill_level or "beginner")
        for topic in weak_topics[:4]:
            found = search_resources(topics=[topic], level=level, limit=MAX_RESOURCES_PER_TOPIC)
            for doc in found:
                doc.setdefault("matched_topics", [topic])
                resources.append(doc)

    detail = {
        "stage_position": stage["position"],
        "missed": graded["missed"],
        "ratio": round(ratio, 3),
        "passed": passed,
        "revisit_topics": revisit_topics,
    }
    return {
        "slug": slug,
        "stage": stage["name"],
        "position": stage["position"],
        "score": graded["score"],
        "total": graded["total"],
        "passed": passed,
        "summary": summary,
        "revisit_topics": revisit_topics,
        "resources": resources,
        "detail": detail,
    }


def save_result(email: str, result: dict) -> None:
    """Persist one graded stage assessment."""
    from sqlalchemy import text

    from app.db import get_engine

    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO assessment_results (email, slug, topic, score, total, detail) "
                "VALUES (:email, :slug, :topic, :score, :total, CAST(:detail AS jsonb))"
            ),
            {
                "email": email,
                "slug": result["slug"],
                "topic": result["stage"],
                "score": result["score"],
                "total": result["total"],
                "detail": json.dumps(result["detail"]),
            },
        )


def latest_stage_results(email: str, slug: str) -> dict[str, dict]:
    """Latest assessment result per stage name for one roadmap."""
    from sqlalchemy import text

    from app.db import get_engine

    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT topic, score, total, detail, created_at FROM assessment_results "
                "WHERE email = :email AND slug = :slug ORDER BY created_at ASC"
            ),
            {"email": email, "slug": slug},
        ).fetchall()
    latest: dict[str, dict] = {}
    for stage, score, total, detail, created_at in rows:
        if stage:
            latest[stage] = {
                "stage": stage,
                "score": score,
                "total": total,
                "passed": bool(detail.get("passed")) if isinstance(detail, dict) else (total > 0 and score / total >= PASS_RATIO),
                "detail": detail if isinstance(detail, dict) else {},
                "created_at": created_at.isoformat(),
            }
    return latest
