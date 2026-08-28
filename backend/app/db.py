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
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roadmaps (
    slug TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    graph JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
    email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT '',
    background TEXT NOT NULL DEFAULT '',
    skill_level TEXT NOT NULL DEFAULT 'beginner',
    plan TEXT NOT NULL DEFAULT 'free',
    target_role_slug TEXT,
    known_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    personalized_roadmap JSONB,
    learner_context JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS learner_context JSONB;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';

CREATE TABLE IF NOT EXISTS progress (
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    topic TEXT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (email, slug, topic)
);

CREATE TABLE IF NOT EXISTS bookmarks (
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (email, resource_id)
);

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    type TEXT NOT NULL,
    detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_email_created_idx ON events (email, created_at DESC);

CREATE TABLE IF NOT EXISTS resources (
    id TEXT PRIMARY KEY,
    doc JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_courses (
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'learning',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (email, resource_id)
);

CREATE TABLE IF NOT EXISTS user_projects (
    email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'planned',
    repo_url TEXT,
    demo_url TEXT,
    analysis JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (email, project_id)
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
