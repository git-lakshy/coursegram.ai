"""Validated assistant actions.

The assistant proposes changes as JSON; nothing is applied during chat.
POST /assistant/execute validates each action against a whitelist and the
learner's real data, applies it through the existing stores, and records
an audit event. Ambiguous or invalid proposals are rejected, never guessed.
"""

import difflib
import logging
import uuid

from sqlalchemy import text

from app import course_store, project_store, projects as projects_pipeline
from app.assessments import generate_stage_assessment, stages_for_learner
from app.db import get_engine
from app.event_store import record_event
from app.onboarding import _canonical_topic
from app.profile_store import save_profile
from app.roadmap_store import RoadmapNotFound, load_roadmap_graph
from app.resources_store import search_resources

logger = logging.getLogger("app.actions")

MAX_ACTIONS_PER_TURN = 3
MAX_TOPICS_PER_ACTION = 20
MAX_STAGE_TOPICS = 15
MAX_STAGES = 12

ACTION_TYPES = {
    "add_known_topics",
    "remove_known_topics",
    "mark_stage_completed",
    "add_stage",
    "remove_stage",
    "set_skill_level",
    "track_course",
    "save_resource",
    "set_project_state",
    "generate_project",
    "generate_assessment",
}

LEVELS = ("beginner", "intermediate", "advanced")
COURSE_STATUSES = ("learning", "completed")
PROJECT_STATES = ("planned", "in_progress", "completed")


class ActionError(Exception):
    pass


def _require_track(profile) -> str:
    slug = profile.target_role_slug
    if not slug:
        raise ActionError("No target track is set, so this change cannot be applied")
    return slug


def _canonicalize(topics: list[str], remaining: list[str]) -> list[str]:
    out: list[str] = []
    for topic in topics[:MAX_TOPICS_PER_ACTION * 2]:
        canonical = _canonical_topic(topic, remaining)
        if canonical and canonical not in out:
            out.append(canonical)
    return out


def resource_exists(resource_id: str) -> bool:
    engine = get_engine()
    with engine.connect() as connection:
        row = connection.execute(
            text("SELECT 1 FROM resources WHERE id = :id"), {"id": resource_id}
        ).fetchone()
    return row is not None


def _graph_topics(graph: dict) -> list[str]:
    return [str(node["name"]) for node in graph.get("nodes", [])]


def _resolve_stage(stages: list[dict], action: dict) -> dict:
    """Find a stage by position first, then by name (assistant numbering
    can drift from the real plan)."""
    position = action.get("stage_position")
    if isinstance(position, int):
        stage = next((item for item in stages if item["position"] == position), None)
        if stage is not None:
            return stage
    name = str(action.get("stage_name", "")).strip().lower()
    if name:
        stage = next(
            (item for item in stages if item["name"].strip().lower() == name),
            None,
        )
        if stage is not None:
            return stage
        close = difflib.get_close_matches(
            name, [item["name"].strip().lower() for item in stages], n=1, cutoff=0.8
        )
        if close:
            return next(item for item in stages if item["name"].strip().lower() == close[0])
    raise ActionError("Unknown stage position")


async def _execute_one(email: str, profile, action: dict) -> dict:
    action_type = action.get("type")
    slug = _require_track(profile)
    try:
        graph = load_roadmap_graph(slug)
    except RoadmapNotFound:
        raise ActionError("Unknown roadmap slug")

    if action_type == "add_known_topics":
        topics = _canonicalize(list(action.get("topics", [])), _graph_topics(graph))
        if not topics:
            raise ActionError("No valid topics to mark as known")
        merged = list(dict.fromkeys(list(profile.known_topics) + topics))[:200]
        profile.known_topics = merged
        save_profile(email, profile)
        return {"summary": f"Marked {len(topics)} topics as known: {', '.join(topics)}", "topics": topics}

    if action_type == "remove_known_topics":
        topics = _canonicalize(list(action.get("topics", [])), _graph_topics(graph))
        if not topics:
            raise ActionError("No valid topics to remove")
        from app.progress_store import get_progress, save_progress

        completed = get_progress(email, slug)
        remaining = [topic for topic in completed if topic not in topics]
        save_progress(email, slug, remaining)
        for topic in topics:
            if topic in completed:
                record_event(email, "topic_uncompleted", {"slug": slug, "topic": topic})
        return {"summary": f"Marked {len(topics)} topics for revisiting: {', '.join(topics)}", "topics": topics}

    if action_type == "mark_stage_completed":
        stages = stages_for_learner(email, slug)
        stage = _resolve_stage(stages, action)
        from app.progress_store import get_progress, save_progress

        completed = get_progress(email, slug)
        new_topics = [topic for topic in stage["topics"] if topic not in completed]
        save_progress(email, slug, list(dict.fromkeys(completed + stage["topics"])))
        for topic in new_topics:
            record_event(email, "topic_completed", {"slug": slug, "topic": topic})
        return {
            "summary": f"Marked stage '{stage['name']}' completed ({len(new_topics)} new topics)",
            "topics": new_topics,
        }

    if action_type == "add_stage":
        personalized = profile.personalized_roadmap
        if not isinstance(personalized, dict) or personalized.get("slug") != slug:
            raise ActionError("Generate a personalized plan before adding stages")
        phases = personalized.get("phases")
        if not isinstance(phases, list):
            raise ActionError("Generate a personalized plan before adding stages")
        if len(phases) >= MAX_STAGES:
            raise ActionError(f"A plan cannot have more than {MAX_STAGES} stages")
        name = str(action.get("stage_name", "")).strip()
        if not name:
            raise ActionError("A stage needs a name")
        stage_topics = _canonicalize(list(action.get("stage_topics", [])), _graph_topics(graph))[:MAX_STAGE_TOPICS]
        if not stage_topics:
            raise ActionError("A stage needs at least one valid topic from the track")
        phases.append(
            {
                "name": name[:120],
                "milestone": str(action.get("milestone", "")).strip()[:200],
                "topics": stage_topics,
            }
        )
        save_profile(email, profile)
        return {"summary": f"Added stage '{name}' with {len(stage_topics)} topics", "stage": name}

    if action_type == "remove_stage":
        personalized = profile.personalized_roadmap
        if not isinstance(personalized, dict) or personalized.get("slug") != slug:
            raise ActionError("No personalized plan to edit")
        phases = personalized.get("phases")
        if not isinstance(phases, list) or not phases:
            raise ActionError("No personalized plan to edit")
        stages = [
            {"position": index + 1, "name": str(phase.get("name", ""))}
            for index, phase in enumerate(phases)
            if isinstance(phase, dict)
        ]
        stage = _resolve_stage(stages, action)
        removed = phases.pop(stage["position"] - 1)
        save_profile(email, profile)
        return {"summary": f"Removed stage '{removed.get('name', stage['position'])}'"}

    if action_type == "set_skill_level":
        level = str(action.get("level", "")).strip().lower()
        if level not in LEVELS:
            raise ActionError("Level must be beginner, intermediate, or advanced")
        profile.skill_level = level
        save_profile(email, profile)
        return {"summary": f"Skill level set to {level}"}

    if action_type == "track_course":
        resource_id = str(action.get("resource_id", "")).strip()
        status = str(action.get("status", "learning")).strip().lower()
        if not resource_id or not resource_exists(resource_id):
            raise ActionError("Unknown resource id")
        if status not in COURSE_STATUSES:
            raise ActionError("Status must be learning or completed")
        previous = course_store.set_status(email, resource_id, status)
        if status == "learning" and previous is None:
            record_event(email, "course_started", {"resource_id": resource_id})
        if status == "completed" and previous != "completed":
            record_event(email, "course_completed", {"resource_id": resource_id})
        record_event(email, "assistant_action", {"action": action_type, "resource_id": resource_id, "status": status})
        return {"summary": f"Course {resource_id} marked {status}"}

    if action_type == "save_resource":
        resource_id = str(action.get("resource_id", "")).strip()
        if not resource_id or not resource_exists(resource_id):
            raise ActionError("Unknown resource id")
        from app.bookmark_store import add_bookmark

        add_bookmark(email, resource_id)
        record_event(email, "resource_saved", {"resource_id": resource_id})
        record_event(email, "assistant_action", {"action": action_type, "resource_id": resource_id})
        return {"summary": f"Saved resource {resource_id}"}

    if action_type == "set_project_state":
        project_id = str(action.get("project_id", "")).strip()
        state = str(action.get("state", "")).strip().lower()
        if not project_id:
            raise ActionError("A project id is required")
        if state not in PROJECT_STATES:
            raise ActionError("State must be planned, in progress, or completed")
        project_store.upsert_project(email, project_id, slug, state=state)
        record_event(email, "project_state_changed", {"project_id": project_id, "slug": slug, "state": state})
        record_event(email, "assistant_action", {"action": action_type, "project_id": project_id, "state": state})
        return {"summary": f"Project {project_id} set to {state}"}

    if action_type == "generate_project":
        hint = str(action.get("hint", "")).strip() or None
        definition = await projects_pipeline.generate_custom_project(profile, slug, hint=hint)
        project_id = f"custom-{uuid.uuid4().hex[:8]}"
        project_store.upsert_project(
            email,
            project_id,
            slug,
            state="planned",
            definition=definition,
        )
        record_event(email, "assistant_action", {"action": action_type, "project_id": project_id})
        return {"summary": f"Generated project '{definition['title']}' and added it to your projects", "project_id": project_id}

    if action_type == "generate_assessment":
        stages = stages_for_learner(email, slug)
        stage = _resolve_stage(stages, action)
        if not stage["assessable"]:
            raise ActionError("That stage is not assessable yet")
        result = await generate_stage_assessment(email, slug, stage["position"])
        record_event(email, "assistant_action", {"action": action_type, "stage_position": position})
        return {
            "summary": f"Assessment ready for stage '{result['stage']}' ({len(result['questions'])} questions)",
            "stage": result["stage"],
            "question_count": len(result["questions"]),
        }

    raise ActionError("Unsupported action type")


async def execute_actions(email: str, profile, actions: list[dict]) -> list[dict]:
    """Validate and apply up to MAX_ACTIONS_PER_TURN proposals."""
    results: list[dict] = []
    for action in actions[:MAX_ACTIONS_PER_TURN]:
        action_type = action.get("type")
        if action_type not in ACTION_TYPES:
            results.append({"type": str(action_type), "applied": False, "reason": "Unsupported action type"})
            continue
        try:
            result = await _execute_one(email, profile, action)
            results.append({"type": action_type, "applied": True, **result})
        except ActionError as error:
            results.append({"type": str(action_type), "applied": False, "reason": str(error)})
        except Exception as error:
            logger.warning("Action %s failed: %s", action_type, error)
            results.append({"type": str(action_type), "applied": False, "reason": "The change could not be applied"})
    if any(item.get("applied") for item in results):
        record_event(email, "assistant_action", {"action": "batch_applied", "count": sum(1 for item in results if item.get("applied"))})
    return results
