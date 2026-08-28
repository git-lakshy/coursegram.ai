"""Rolling learner context: a compact LLM summary kept on the profile.

The summary is regenerated whenever the profile meaningfully changes
(onboarding complete, quiz graded, known topics updated). The assistant
prompt uses it instead of raw profile dumps, keeping every call grounded
in the learner's current situation at a fixed token cost.
"""

import datetime
import json
import logging

from pydantic import ValidationError

from app import llm
from app.profile_store import load_profile, save_profile
from app.roadmap_store import RoadmapNotFound, load_roadmap_graph, next_topics

logger = logging.getLogger("app.context")

MAX_SUMMARY_CHARS = 900
MAX_NEXT_TOPICS = 5


def _situation_snapshot(profile, graph) -> dict:
    mastered = {str(topic).lower() for topic in profile.known_topics}
    ready = next_topics(graph, mastered, limit=MAX_NEXT_TOPICS)
    total = len(graph.get("nodes", []))
    return {
        "target_track": graph.get("title", profile.target_role_slug),
        "level": profile.skill_level,
        "mastered_count": len(mastered & {n["id"] for n in graph.get("nodes", [])}),
        "total_topics": total,
        "next_topics": [node["name"] for node in ready],
    }


async def build_learner_context(user_email: str) -> dict | None:
    """Generate and persist a rolling summary of the learner.

    Returns the new context dict, or None when there is nothing to
    summarize yet (no target role) or the LLM is unavailable.
    """
    if not llm.is_configured():
        return None
    profile = load_profile(user_email)
    if not profile.target_role_slug:
        return None
    try:
        graph = load_roadmap_graph(profile.target_role_slug)
    except RoadmapNotFound:
        return None

    snapshot = _situation_snapshot(profile, graph)
    prompt = (
        "You maintain a rolling context note for a learner on Coursegram, "
        "an AI learning path product. Update the previous note with the "
        "latest profile data. Write 3 to 4 sentences, third person, "
        "concrete and specific: who they are, their goal and level, where "
        "they are in the track, and what they should focus on next. "
        "Do not invent facts. Respond with JSON only: "
        '{"summary": "..."}.\n\n'
        f"Previous note: {json.dumps(profile.learner_context or {})}\n"
        f"Background: {profile.background or 'not provided'}\n"
        f"Known topics: {', '.join(profile.known_topics[:40]) or 'none listed'}\n"
        f"Current situation: {json.dumps(snapshot)}"
    )
    try:
        raw = await llm.chat_completion(
            [{"role": "user", "content": prompt}],
            json_mode=True,
            max_tokens=400,
            temperature=0.3,
        )
    except llm.LLMError as error:
        logger.warning("Learner context generation failed: %s", error)
        return None

    try:
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        summary = str(json.loads(text).get("summary", "")).strip()
    except (json.JSONDecodeError, AttributeError) as error:
        logger.warning("Learner context parse failed: %s", error)
        return None
    if not summary:
        return None

    context = {
        "summary": summary[:MAX_SUMMARY_CHARS],
        "snapshot": snapshot,
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    fresh = load_profile(user_email)
    fresh.learner_context = context
    save_profile(user_email, fresh)
    return context


def context_summary_for(user_email: str) -> str:
    """Return the stored rolling summary, or an empty string."""
    profile = load_profile(user_email)
    context = profile.learner_context
    if not isinstance(context, dict):
        return ""
    try:
        return str(context.get("summary", ""))
    except (ValidationError, AttributeError):
        return ""


def situation_for(user_email: str) -> dict:
    """Return the stored situation snapshot, or an empty dict."""
    profile = load_profile(user_email)
    context = profile.learner_context
    if isinstance(context, dict) and isinstance(context.get("snapshot"), dict):
        return context["snapshot"]
    return {}
