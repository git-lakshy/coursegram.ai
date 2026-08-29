"""Persisted assistant conversation history per learner.

Messages are stored for profile building and longitudinal grounding; the
assistant page shows only the recent tail. Nothing here is required for
the live conversation to work.
"""

from sqlalchemy import text

from app.db import get_engine


def add_message(user_email: str, role: str, content: str) -> None:
    """Append one chat message. Never raises: history must not break chat."""
    try:
        engine = get_engine()
        with engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO chat_messages (email, role, content) "
                    "VALUES (:email, :role, :content)"
                ),
                {"email": user_email, "role": role, "content": content},
            )
    except Exception:
        pass


def recent_messages(user_email: str, limit: int = 40) -> list[dict]:
    """Return the learner's recent messages, oldest first."""
    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT role, content, created_at FROM chat_messages "
                "WHERE email = :email ORDER BY created_at DESC, id DESC LIMIT :limit"
            ),
            {"email": user_email, "limit": limit},
        ).fetchall()
    return [
        {"role": row[0], "content": row[1], "created_at": row[2].isoformat()}
        for row in reversed(rows)
    ]


def recent_conversation_digest(user_email: str, limit: int = 6, max_chars: int = 700) -> str:
    """Compact digest of the last messages for prompt grounding."""
    try:
        messages = recent_messages(user_email, limit)
    except Exception:
        return ""
    parts = [f"{message['role']}: {message['content'][:200]}" for message in messages]
    digest = " | ".join(parts)
    return digest[:max_chars]


def clear(user_email: str) -> None:
    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(
            text("DELETE FROM chat_messages WHERE email = :email"),
            {"email": user_email},
        )
