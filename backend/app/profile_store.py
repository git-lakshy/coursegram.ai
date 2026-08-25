"""Persistence for per learner profiles backed by Postgres.

Profiles are keyed by the authenticated learner's email.
"""

import json

from pydantic import ValidationError
from sqlalchemy import text

from app.db import get_engine
from app.models import LearnerProfile


def load_profile(user_email: str) -> LearnerProfile:
    """Load the profile for a user, or return defaults when none exists."""
    engine = get_engine()
    with engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT display_name, background, skill_level, target_role_slug, "
                "known_topics, onboarding_complete, personalized_roadmap "
                "FROM profiles WHERE email = :email"
            ),
            {"email": user_email},
        ).fetchone()
    if row is None:
        return LearnerProfile()
    try:
        return LearnerProfile(
            display_name=row[0],
            background=row[1],
            skill_level=row[2],
            target_role_slug=row[3],
            known_topics=row[4] or [],
            onboarding_complete=row[5],
            personalized_roadmap=row[6],
        )
    except ValidationError:
        return LearnerProfile()


def save_profile(user_email: str, profile: LearnerProfile) -> LearnerProfile:
    """Persist the profile for a user and return it."""
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
                "INSERT INTO profiles (email, display_name, background, skill_level, "
                "target_role_slug, known_topics, onboarding_complete, personalized_roadmap, "
                "updated_at) VALUES (:email, :display_name, :background, :skill_level, "
                ":target_role_slug, :known_topics::jsonb, :onboarding_complete, "
                ":personalized_roadmap::jsonb, now()) "
                "ON CONFLICT (email) DO UPDATE SET display_name = :display_name, "
                "background = :background, skill_level = :skill_level, "
                "target_role_slug = :target_role_slug, known_topics = :known_topics::jsonb, "
                "onboarding_complete = :onboarding_complete, "
                "personalized_roadmap = :personalized_roadmap::jsonb, updated_at = now()"
            ),
            {
                "email": user_email,
                "display_name": profile.display_name,
                "background": profile.background,
                "skill_level": profile.skill_level,
                "target_role_slug": profile.target_role_slug,
                "known_topics": json.dumps(profile.known_topics),
                "onboarding_complete": profile.onboarding_complete,
                "personalized_roadmap": json.dumps(profile.personalized_roadmap)
                if profile.personalized_roadmap is not None
                else None,
            },
        )
    return profile
