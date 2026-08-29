"""Study activity events per learner.

Append only log powering streaks, daily goals, and the personalized
recommendation learning layer. Event types: topic_completed,
topic_uncompleted, resource_opened, resource_saved, quiz_taken,
plan_generated, plan_changed, stage_feedback, course_started,
course_completed, project_state_changed, project_analyzed,
assessment_taken.
"""

import datetime

from sqlalchemy import text

from app.db import get_engine

VALID_TYPES = {
    "topic_completed",
    "topic_uncompleted",
    "resource_opened",
    "resource_saved",
    "quiz_taken",
    "plan_generated",
    "plan_changed",
    "stage_feedback",
    "course_started",
    "course_completed",
    "project_state_changed",
    "project_analyzed",
    "assessment_taken",
    "assistant_action",
}


def record_event(user_email: str, event_type: str, detail: dict | None = None) -> None:
    """Append one event. Never raises: analytics must not break core flows."""
    if event_type not in VALID_TYPES:
        return
    try:
        engine = get_engine()
        with engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO users (email) VALUES (:email) ON CONFLICT (email) DO NOTHING"
                ),
                {"email": user_email},
            )
            connection.execute(
                text(
                    "INSERT INTO events (email, type, detail) "
                    "VALUES (:email, :type, CAST(:detail AS jsonb))"
                ),
                {"email": user_email, "type": event_type, "detail": json_dumps(detail or {})},
            )
    except Exception:
        pass


def json_dumps(value: dict) -> str:
    import json

    return json.dumps(value)


def recent_events(user_email: str, limit: int = 50) -> list[dict]:
    """Return the learner's recent events, newest first."""
    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT type, detail, created_at FROM events "
                "WHERE email = :email ORDER BY created_at DESC LIMIT :limit"
            ),
            {"email": user_email, "limit": limit},
        ).fetchall()
    return [
        {"type": row[0], "detail": row[1], "created_at": row[2].isoformat()}
        for row in rows
    ]


def learning_streak(user_email: str) -> int:
    """Count consecutive days with at least one event, ending today or yesterday."""
    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT DISTINCT created_at::date AS day FROM events "
                "WHERE email = :email ORDER BY day DESC LIMIT 400"
            ),
            {"email": user_email},
        ).fetchall()
    days = {row[0] for row in rows}
    if not days:
        return 0
    today = datetime.date.today()
    if today not in days and (today - datetime.timedelta(days=1)) not in days:
        return 0
    streak = 0
    cursor = today if today in days else today - datetime.timedelta(days=1)
    while cursor in days:
        streak += 1
        cursor -= datetime.timedelta(days=1)
    return streak


def events_this_month(user_email: str) -> int:
    engine = get_engine()
    with engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT count(*) FROM events WHERE email = :email "
                "AND created_at >= date_trunc('month', now())"
            ),
            {"email": user_email},
        ).scalar()
    return int(row or 0)


def weekly_topic_completions(user_email: str, slug: str, weeks: int = 8) -> list[dict]:
    """Completed topics per ISO week for the last N weeks, oldest first.

    Weeks with no completions are reported as zero so the frontend can
    render a truthful timeline.
    """
    import datetime

    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT date_trunc('week', created_at)::date AS week, count(*) "
                "FROM events WHERE email = :email AND type = 'topic_completed' "
                "AND detail->>'slug' = :slug "
                "AND created_at >= date_trunc('week', now()) - make_interval(weeks => :weeks - 1) "
                "GROUP BY week ORDER BY week"
            ),
            {"email": user_email, "slug": slug, "weeks": weeks},
        ).fetchall()
    counts = {row[0]: int(row[1]) for row in rows}
    today = datetime.date.today()
    this_week = today - datetime.timedelta(days=today.weekday())
    out = []
    for offset in range(weeks - 1, -1, -1):
        week = this_week - datetime.timedelta(weeks=offset)
        out.append({"week_start": week.isoformat(), "count": counts.get(week, 0)})
    return out


def latest_stage_feedback(user_email: str, slug: str) -> list[dict]:
    """Latest difficulty feedback per stage for one roadmap, ordered by position."""
    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT detail->>'stage' AS stage, detail->>'position' AS position, "
                "detail->>'difficulty' AS difficulty, created_at FROM events "
                "WHERE email = :email AND type = 'stage_feedback' "
                "AND detail->>'slug' = :slug ORDER BY created_at ASC"
            ),
            {"email": user_email, "slug": slug},
        ).fetchall()
    latest: dict[str, dict] = {}
    for stage, position, difficulty, created_at in rows:
        if stage:
            latest[stage] = {
                "stage": stage,
                "position": int(position or 0),
                "difficulty": difficulty,
                "submitted_at": created_at.isoformat(),
            }
    return sorted(latest.values(), key=lambda item: (item["position"], item["stage"]))
