"""Saved resources per learner, backed by Postgres."""

from sqlalchemy import text

from app.db import get_engine


def list_bookmarks(user_email: str) -> list[dict]:
    """Return the learner's bookmarked resources, newest first."""
    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT r.id, r.doc FROM bookmarks b "
                "JOIN resources r ON r.id = b.resource_id "
                "WHERE b.email = :email ORDER BY b.created_at DESC"
            ),
            {"email": user_email},
        ).fetchall()
    docs = []
    for row in rows:
        doc = dict(row[1])
        doc["id"] = row[0]
        docs.append(doc)
    return docs


def bookmark_ids(user_email: str) -> set[str]:
    """Return the set of bookmarked resource ids for quick checks."""
    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text("SELECT resource_id FROM bookmarks WHERE email = :email"),
            {"email": user_email},
        ).fetchall()
    return {row[0] for row in rows}


def add_bookmark(user_email: str, resource_id: str) -> None:
    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO bookmarks (email, resource_id) VALUES (:email, :resource_id) "
                "ON CONFLICT DO NOTHING"
            ),
            {"email": user_email, "resource_id": resource_id},
        )


def remove_bookmark(user_email: str, resource_id: str) -> None:
    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(
            text(
                "DELETE FROM bookmarks WHERE email = :email AND resource_id = :resource_id"
            ),
            {"email": user_email, "resource_id": resource_id},
        )
