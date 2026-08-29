"""Learner project states, evidence links, and AI analysis per project."""

import json

from sqlalchemy import text

from app.db import get_engine

VALID_STATES = ("planned", "in_progress", "completed")


def list_user_projects(user_email: str) -> list[dict]:
    """Return the learner's project rows, newest activity first."""
    engine = get_engine()
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                "SELECT project_id, slug, state, repo_url, demo_url, analysis, definition, updated_at "
                "FROM user_projects WHERE email = :email ORDER BY updated_at DESC"
            ),
            {"email": user_email},
        ).fetchall()
    return [
        {
            "project_id": row[0],
            "slug": row[1],
            "state": row[2],
            "repo_url": row[3],
            "demo_url": row[4],
            "analysis": row[5],
            "definition": row[6],
            "updated_at": row[7].isoformat(),
        }
        for row in rows
    ]


def upsert_project(
    user_email: str,
    project_id: str,
    slug: str,
    state: str | None = None,
    repo_url: str | None = None,
    demo_url: str | None = None,
    definition: dict | None = None,
) -> dict | None:
    """Create or update a project row, preserving fields not provided."""
    engine = get_engine()
    with engine.begin() as connection:
        row = connection.execute(
            text(
                "SELECT state, repo_url, demo_url, definition FROM user_projects "
                "WHERE email = :email AND project_id = :project_id"
            ),
            {"email": user_email, "project_id": project_id},
        ).fetchone()
        if row is None:
            if state is None:
                return None
            connection.execute(
                text(
                    "INSERT INTO user_projects (email, project_id, slug, state, repo_url, demo_url, definition, updated_at) "
                    "VALUES (:email, :project_id, :slug, :state, :repo_url, :demo_url, CAST(:definition AS jsonb), now())"
                ),
                {
                    "email": user_email,
                    "project_id": project_id,
                    "slug": slug,
                    "state": state or "planned",
                    "repo_url": repo_url,
                    "demo_url": demo_url,
                    "definition": json.dumps(definition) if definition is not None else None,
                },
            )
            return {"state": state or "planned", "repo_url": repo_url, "demo_url": demo_url}
        next_state = state if state is not None else row[0]
        next_repo = repo_url if repo_url is not None else row[1]
        next_demo = demo_url if demo_url is not None else row[2]
        next_definition = definition if definition is not None else row[3]
        connection.execute(
            text(
                "UPDATE user_projects SET state = :state, repo_url = :repo_url, "
                "demo_url = :demo_url, definition = CAST(:definition AS jsonb), updated_at = now() "
                "WHERE email = :email AND project_id = :project_id"
            ),
            {
                "email": user_email,
                "project_id": project_id,
                "state": next_state,
                "repo_url": next_repo,
                "demo_url": next_demo,
                "definition": json.dumps(next_definition) if next_definition is not None else None,
            },
        )
        return {"state": next_state, "repo_url": next_repo, "demo_url": next_demo}


def save_analysis(user_email: str, project_id: str, analysis: dict) -> None:
    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(
            text(
                "UPDATE user_projects SET analysis = CAST(:analysis AS jsonb), updated_at = now() "
                "WHERE email = :email AND project_id = :project_id"
            ),
            {
                "email": user_email,
                "project_id": project_id,
                "analysis": json.dumps(analysis),
            },
        )


def get_project_row(user_email: str, project_id: str) -> dict | None:
    engine = get_engine()
    with engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT project_id, slug, state, repo_url, demo_url, analysis, definition FROM user_projects "
                "WHERE email = :email AND project_id = :project_id"
            ),
            {"email": user_email, "project_id": project_id},
        ).fetchone()
    if row is None:
        return None
    return {
        "project_id": row[0],
        "slug": row[1],
        "state": row[2],
        "repo_url": row[3],
        "demo_url": row[4],
        "analysis": row[5],
        "definition": row[6],
    }
