"""Per learner topic progress backed by Postgres.

Completion state lives server side per (email, roadmap slug, topic).
Saving progress also merges completed topics into the profile's
known_topics so the assistant, recommendations, and roadmap traversal
always see current knowledge.
"""

from sqlalchemy import text

from app.db import get_engine
from app.profile_store import load_profile, save_profile


def get_progress(user_email: str, slug: str) -> list[str]:
    """Return completed topic names for a roadmap, in completion order."""
    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT topic FROM progress WHERE email = :email AND slug = :slug "
                "ORDER BY completed_at"
            ),
            {"email": user_email, "slug": slug},
        ).fetchall()
    return [row[0] for row in rows]


def save_progress(user_email: str, slug: str, completed: list[str]) -> list[str]:
    """Replace the completed topic set for a roadmap and sync known_topics.

    Returns the stored list. Topics removed by the learner are dropped
    from progress but stay in known_topics history.
    """
    clean = list(dict.fromkeys(str(topic).strip() for topic in completed if str(topic).strip()))
    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(
            text("DELETE FROM progress WHERE email = :email AND slug = :slug"),
            {"email": user_email, "slug": slug},
        )
        for topic in clean:
            connection.execute(
                text(
                    "INSERT INTO progress (email, slug, topic) VALUES "
                    "(:email, :slug, :topic) ON CONFLICT DO NOTHING"
                ),
                {"email": user_email, "slug": slug, "topic": topic},
            )

    profile = load_profile(user_email)
    known = list(profile.known_topics)
    missing = [topic for topic in clean if topic not in known]
    if missing:
        profile.known_topics = (known + missing)[:200]
        save_profile(user_email, profile)
    return clean
