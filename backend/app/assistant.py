"""AI assistant endpoint backed by the configured LLM provider.

Every turn is grounded in graph retrieval (graph_rag): the matched topic
neighborhoods, the learner's state, and matched resources. The reply is
expected to cite topics from that context.
"""

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app import chat_store, graph_rag, llm
from app.roadmap_store import RoadmapNotFound, load_roadmap_topics

MAX_HISTORY_MESSAGES = 8


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


async def chat(user_email: str, profile, payload: ChatRequest) -> ChatResponse:
    """Return a grounded reply for one assistant turn."""
    if not llm.is_configured():
        raise HTTPException(status_code=503, detail="LLM is not configured on the server")

    topics: list[str] = []
    if profile.target_role_slug:
        try:
            topics = load_roadmap_topics(profile.target_role_slug)
        except RoadmapNotFound:
            topics = []

    grounded = graph_rag.build_assistant_context(user_email, profile, payload.message)
    messages = [{"role": "system", "content": grounded}]
    for item in payload.history[-MAX_HISTORY_MESSAGES:]:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": payload.message})

    reply = await llm.chat_completion(messages, max_tokens=2500, temperature=0.4)
    chat_store.add_message(user_email, "user", payload.message)
    chat_store.add_message(user_email, "assistant", reply)
    return ChatResponse(reply=reply)
