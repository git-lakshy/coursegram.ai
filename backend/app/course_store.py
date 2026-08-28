"""Course tracking per learner: mark curated resources as currently
learning or completed, backed by Postgres.

Tracked courses feed the learning layer (course_started / course_completed
events) and the dashboard's currently learning panel.
"""

from sqlalchemy import text

from app.db import get_engine

VALID_STATUSES = ("learning", "completed")


def list_tracked(user_email: str) -> list[dict]:
    """Return the learner's tracked resources with status, newest first."""
    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT r.id, r.doc, c.status, c.started_at, c.updated_at FROM user_courses c "
                "JOIN resources r ON r.id = c.resource_id "
                "WHERE c.email = :email ORDER BY c.updated_at DESC"
            ),
            {"email": user_email},
        ).fetchall()
    items = []
    for row in rows:
        doc = dict(row[1])
        doc["id"] = row[0]
        doc["status"] = row[2]
        doc["started_at"] = row[3].isoformat()
        doc["updated_at"] = row[4].isoformat()
        items.append(doc)
    return items


def tracked_status_map(user_email: str) -> dict[str, str]:
    """Return resource_id -> status for quick checks."""
    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text("SELECT resource_id, status FROM user_courses WHERE email = :email"),
            {"email": user_email},
        ).fetchall()
    return {row[0]: row[1] for row in rows}


def set_status(user_email: str, resource_id: str, status: str) -> str:
    """Create or update the tracking row and return the previous status."""
    engine = get_engine()
    with engine.begin() as connection:
        row = connection.execute(
            text(
                "SELECT status FROM user_courses WHERE email = :email AND resource_id = :resource_id"
            ),
            {"email": user_email, "resource_id": resource_id},
        ).fetchone()
        previous = row[0] if row else None
        connection.execute(
            text(
                "INSERT INTO user_courses (email, resource_id, status, started_at, updated_at) "
                "VALUES (:email, :resource_id, :status, now(), now()) "
                "ON CONFLICT (email, resource_id) DO UPDATE SET "
                "status = :status, updated_at = now()"
            ),
            {"email": user_email, "resource_id": resource_id, "status": status},
        )
    return previous


def remove(user_email: str, resource_id: str) -> None:
    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(
            text(
                "DELETE FROM user_courses WHERE email = :email AND resource_id = :resource_id"
            ),
            {"email": user_email, "resource_id": resource_id},
        )
