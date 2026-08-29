"""AI assistant endpoint backed by the configured LLM provider.

Every turn is grounded in graph retrieval (graph_rag): the matched topic
neighborhoods, the learner's state, and matched resources. Changes are
never applied during chat; the model proposes whitelisted actions as JSON
and the client confirms them before POST /assistant/execute applies them.
"""

from fastapi import HTTPException
from pydantic import BaseModel, Field

import json
import logging
import re

from app import chat_store, graph_rag, llm
from app.roadmap_store import RoadmapNotFound, load_roadmap_topics
from app.actions import ACTION_TYPES

logger = logging.getLogger("app.assistant")

MAX_HISTORY_MESSAGES = 8
MAX_TOPIC_CONTEXT = 60

ACTION_TYPES_TEXT = ", ".join(sorted(ACTION_TYPES))


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class AssistantAction(BaseModel):
    type: str
    topics: list[str] = Field(default_factory=list, max_length=20)
    stage_position: int | None = None
    stage_name: str | None = None
    stage_topics: list[str] = Field(default_factory=list, max_length=20)
    milestone: str | None = None
    level: str | None = None
    resource_id: str | None = None
    status: str | None = None
    project_id: str | None = None
    state: str | None = None
    hint: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str
    actions: list[AssistantAction] = Field(default_factory=list, max_length=5)


def _actions_prompt() -> str:
    return (
        "You can propose changes to the learner's plan. Propose actions ONLY "
        "when the learner clearly asks for a change; otherwise return an "
        "empty actions list. Never invent ids: resource ids come from the "
        "matched resources in the context, project ids from the learner's "
        f"projects. Supported action types: {ACTION_TYPES_TEXT}. "
        "stage_position is the 1 based position from the numbered stage "
        "list in the context; also include stage_name. "
        "When the learner describes a goal without a plan yet, propose "
        "generate_plan_from_chat {goal} where goal restates their aim in "
        "one or two sentences. "
        "Fields per type: add_known_topics {topics}, remove_known_topics "
        "{topics}, mark_stage_completed {stage_position, stage_name}, "
        "add_stage {stage_name, stage_topics, milestone}, remove_stage "
        "{stage_position, stage_name}, set_skill_level {level}, track_course "
        "{resource_id, status: learning|completed}, save_resource "
        "{resource_id}, set_project_state {project_id, state: "
        "planned|in_progress|completed}, generate_project {hint}, "
        "generate_assessment {stage_position}, generate_plan_from_chat {goal}. "
        "When you recommend resources, give one short reason per resource "
        "referencing the learner's level, goal, or matched topics. "
        "Respond with JSON only: {\"reply\": \"your answer, and when you "
        "propose actions say exactly what you will change\", \"actions\": "
        "[{\"type\": \"...\", ...}]}. No text outside the JSON."
    )


def _parse_reply(raw: str) -> tuple[str, list[AssistantAction]]:
    """Parse the JSON reply, falling back to treating it as plain text."""
    cleaned = raw.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", cleaned, re.DOTALL)
    if fence:
        cleaned = fence.group(1).strip()
    try:
        data = json.loads(cleaned)
    except ValueError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end <= start:
            return raw.strip(), []
        try:
            data = json.loads(cleaned[start : end + 1])
        except ValueError:
            return raw.strip(), []
    if not isinstance(data, dict) or "reply" not in data:
        return raw.strip(), []
    actions: list[AssistantAction] = []
    for item in data.get("actions", []):
        if isinstance(item, dict) and isinstance(item.get("type"), str):
            try:
                actions.append(AssistantAction(**item))
            except Exception:
                continue
    return str(data.get("reply", "")).strip(), actions[:5]


async def chat(user_email: str, profile, payload: ChatRequest) -> ChatResponse:
    """Return a grounded reply plus optional proposed actions."""
    if not llm.is_configured():
        raise HTTPException(status_code=503, detail="LLM is not configured on the server")

    topics: list[str] = []
    if profile.target_role_slug:
        try:
            topics = load_roadmap_topics(profile.target_role_slug)
        except RoadmapNotFound:
            topics = []

    grounded = graph_rag.build_assistant_context(user_email, profile, payload.message)
    messages = [
        {"role": "system", "content": f"{grounded} {_actions_prompt()}"},
    ]
    for item in payload.history[-MAX_HISTORY_MESSAGES:]:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": payload.message})

    raw = await llm.chat_completion(messages, max_tokens=2500, temperature=0.4)
    reply, actions = _parse_reply(raw)
    if not reply:
        raise HTTPException(status_code=502, detail="The assistant returned an empty reply")
    chat_store.add_message(user_email, "user", payload.message)
    chat_store.add_message(user_email, "assistant", reply)
    return ChatResponse(reply=reply, actions=actions)
