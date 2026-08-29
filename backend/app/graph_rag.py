"""Graph retrieval augmentation for the assistant.

Every question is linked to LearningGraph topics deterministically, the
neighborhood (prerequisites, unlocks, cross domain links) is expanded
within bounds, and one compact context block is assembled from the
subgraph, the learner's own state, matched resources, and the rolling
context note. The reply is expected to cite topics from this block.
"""

import difflib
import logging
import re

from app.assessments import latest_stage_results, stages_for_learner
from app.course_store import list_tracked
from app.event_store import latest_stage_feedback
from app.learner_context import context_summary_for
from app.progress_store import get_progress
from app.roadmap_store import RoadmapNotFound, load_roadmap_graph
from app.resources_store import search_resources

logger = logging.getLogger("app.graphrag")

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
MAX_SEEDS = 4
MAX_NEIGHBORHOODS = 3
MAX_RESOURCES = 4


def _tokens(value: str) -> list[str]:
    return TOKEN_PATTERN.findall(value.lower())


def link_topics(message: str, graph: dict) -> list[str]:
    """Map a message onto graph topic names, deterministic first."""
    nodes = graph.get("nodes", [])
    if not nodes:
        return []
    message_lower = message.lower()
    seeds: list[str] = []

    for node in nodes:
        name = str(node["name"])
        if len(name) > 3 and name.lower() in message_lower:
            seeds.append(name)

    if not seeds:
        message_tokens = set(_tokens(message))
        scored: list[tuple[int, str]] = []
        for node in nodes:
            keywords: set[str] = set(_tokens(str(node["name"])))
            for keyword in node.get("keywords", []):
                keywords.update(_tokens(str(keyword)))
            overlap = len(message_tokens & keywords)
            if overlap > 0:
                scored.append((overlap, str(node["name"])))
        scored.sort(key=lambda item: (-item[0], item[1]))
        seeds = [name for _, name in scored[:MAX_SEEDS]]

    if not seeds:
        names_lower = [str(node["name"]).lower() for node in nodes]
        for word in sorted({_tokens(word)[0] for word in re.findall(r"[A-Za-z0-9]+", message) if len(word) > 3}):
            close = difflib.get_close_matches(word, names_lower, n=1, cutoff=0.9)
            if close:
                match = next(node["name"] for node in nodes if str(node["name"]).lower() == close[0])
                seeds.append(match)

    deduped: list[str] = []
    for name in seeds:
        if name not in deduped:
            deduped.append(name)
    return deduped[:MAX_SEEDS]


def expand_neighborhood(graph: dict, seed_name: str) -> dict | None:
    """Prerequisites, unlocked topics, and related topics for one seed."""
    nodes = graph.get("nodes", [])
    by_id = {str(node["id"]): node for node in nodes}
    seed = next((node for node in nodes if str(node["name"]) == seed_name), None)
    if seed is None:
        return None
    prerequisites = [
        by_id[prereq_id]["name"]
        for prereq_id in seed.get("prerequisites", [])
        if prereq_id in by_id
    ]
    unlocks = [
        str(node["name"])
        for node in nodes
        if seed["id"] in node.get("prerequisites", [])
    ]
    related = [
        by_id[entry["id"]]["name"]
        for entry in seed.get("related", [])
        if isinstance(entry, dict) and entry.get("id") in by_id
    ]
    return {
        "seed": seed_name,
        "prerequisites": prerequisites[:5],
        "unlocks": unlocks[:5],
        "related": related[:4],
    }


def _learner_state_block(email: str, profile, slug: str | None) -> str:
    parts: list[str] = []
    if slug:
        try:
            stages = stages_for_learner(email, slug)
        except RoadmapNotFound:
            stages = []
        if stages:
            current = next((stage for stage in stages if stage.get("is_current")), None)
            total_topics = sum(len(stage["topics"]) for stage in stages)
            done = sum(stage["completed_count"] for stage in stages)
            parts.append(
                f"Roadmap position: {done}/{total_topics} topics completed"
                + (f", current stage: {current['name']}" if current else ", all stages complete")
            )
            parts.append(
                "Stages (position. name, completed/total): "
                + "; ".join(
                    f"{stage['position']}. {stage['name']} ({stage['completed_count']}/{len(stage['topics'])})"
                    for stage in stages
                )
            )
            results = latest_stage_results(email, slug)
            assessment_bits = [
                f"{stage}: {result['score']}/{result['total']} {'passed' if result['passed'] else 'failed'}"
                for stage, result in list(results.items())[-4:]
            ]
            if assessment_bits:
                parts.append("Assessments: " + "; ".join(assessment_bits))
            feedback = {item["stage"]: item["difficulty"] for item in latest_stage_feedback(email, slug)}
            if feedback:
                parts.append(
                    "Stage difficulty feedback: "
                    + ", ".join(f"{stage} ({difficulty})" for stage, difficulty in list(feedback.items())[-4:])
                )
    tracked = list_tracked(email)
    if tracked:
        parts.append(
            "Tracked courses: "
            + ", ".join(f"{course['name']} ({course['status']})" for course in tracked[:5])
        )
    return " ".join(parts)


def build_assistant_context(email: str, profile, message: str) -> str:
    """Assemble the grounded context block for one assistant turn."""
    slug = profile.target_role_slug
    parts = [
        "You are the Coursegram learning assistant. Be concise, practical, "
        "and encouraging. Ground every claim in the context below and cite "
        "topic names verbatim from it. If something is not in the context, "
        "say it is general advice. Do not invent course URLs."
    ]

    graph = None
    if slug:
        try:
            graph = load_roadmap_graph(slug)
        except RoadmapNotFound:
            graph = None

    linked: list[str] = []
    neighborhoods: list[dict] = []
    if graph is not None:
        linked = link_topics(message, graph)
        for seed in linked[:MAX_NEIGHBORHOODS]:
            neighborhood = expand_neighborhood(graph, seed)
            if neighborhood is not None:
                neighborhoods.append(neighborhood)

    if neighborhoods:
        rendered = []
        for item in neighborhoods:
            bits = [f"{item['seed']}"]
            if item["prerequisites"]:
                bits.append("first learn: " + ", ".join(item["prerequisites"]))
            if item["unlocks"]:
                bits.append("leads to: " + ", ".join(item["unlocks"]))
            if item["related"]:
                bits.append("related: " + ", ".join(item["related"]))
            rendered.append(" | ".join(bits))
        parts.append("Matched topics and their graph neighborhoods: " + " ;; ".join(rendered))

    resources: list[dict] = []
    if linked:
        resources = search_resources(topics=linked, level=str(profile.skill_level or "beginner"), limit=MAX_RESOURCES)
        if resources:
            parts.append(
                "Matched resources: "
                + "; ".join(f"{item['name']} ({item['provider']}, {item['type']}, id {item['id']})" for item in resources)
            )

    state_block = _learner_state_block(email, profile, slug)
    if state_block:
        parts.append(state_block)

    known = ", ".join(profile.known_topics[:30]) or "unknown"
    profile_bits = [f"level {profile.skill_level}, track {slug or 'not set'}, already knows: {known}"]
    if profile.interests:
        profile_bits.append(f"interests: {', '.join(profile.interests[:8])}")
    if profile.weekly_hours:
        profile_bits.append(f"about {profile.weekly_hours} study hours per week")
    if profile.preferred_formats:
        profile_bits.append(f"prefers: {', '.join(profile.preferred_formats[:5])}")
    parts.append("Profile facts: " + ", ".join(profile_bits) + ".")

    rolling = context_summary_for(email)
    if rolling:
        parts.append(f"Learner context note: {rolling}")

    return " ".join(parts)
