"""Database engine and schema.

Postgres is required, configured with DATABASE_URL (Neon, Supabase, or any
host). Without it the API refuses database backed operations and returns a
clear configuration error.
"""

import os

from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()

_engine = None

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    display_name TEXT NOT NULL DEFAULT '',
    password_salt TEXT,
    password_hash TEXT,
    firebase_uid TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
    email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT '',
    background TEXT NOT NULL DEFAULT '',
    skill_level TEXT NOT NULL DEFAULT 'beginner',
    target_role_slug TEXT,
    known_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    personalized_roadmap JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


class DatabaseNotConfigured(Exception):
    pass


def is_database_enabled() -> bool:
    return DATABASE_URL != ""


def get_engine():
    global _engine
    if not is_database_enabled():
        raise DatabaseNotConfigured("DATABASE_URL is not set")
    if _engine is None:
        url = DATABASE_URL
        # SQLAlchemy needs the postgresql:// scheme; hosts often hand out postgres://
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        # Only psycopg (v3) is installed; force its dialect explicitly.
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        _engine = create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=10)
        with _engine.begin() as connection:
            connection.execute(text(SCHEMA))
    return _engine
