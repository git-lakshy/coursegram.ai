"""AI assistant endpoint backed by the configured LLM provider."""

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app import llm
from app.roadmap_store import RoadmapNotFound, load_roadmap_topics

MAX_HISTORY_MESSAGES = 8
MAX_TOPIC_CONTEXT = 60


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


def build_context(user_email: str, profile, topics: list[str]) -> str:
    """Compose the system prompt from the learner profile and track."""
    target = profile.target_role_slug or "not set yet"
    known = ", ".join(profile.known_topics[:30]) or "unknown"
    topic_list = ", ".join(topics[:MAX_TOPIC_CONTEXT])
    return (
        "You are the Coursegram.ai learning assistant. Be concise, practical, "
        "and encouraging. The learner's profile: "
        f"name {profile.display_name or user_email}, level {profile.skill_level}, "
        f"target track {target}, already knows: {known}. "
        f"Track topics: {topic_list}. "
        "Answer questions about their learning path, suggest what to learn "
        "next, and recommend concrete practice. Do not invent course URLs."
    )


def chat(user_email: str, profile, payload: ChatRequest) -> ChatResponse:
    """Return an LLM reply grounded in the learner profile and track."""
    if not llm.is_configured():
        raise HTTPException(status_code=503, detail="LLM is not configured on the server")

    topics: list[str] = []
    if profile.target_role_slug:
        try:
            topics = load_roadmap_topics(profile.target_role_slug)
        except RoadmapNotFound:
            topics = []

    messages = [{"role": "system", "content": build_context(user_email, profile, topics)}]
    for item in payload.history[-MAX_HISTORY_MESSAGES:]:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": payload.message})

    reply = llm.chat_completion(messages, max_tokens=800, temperature=0.5)
    return ChatResponse(reply=reply)
