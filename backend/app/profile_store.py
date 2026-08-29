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
                "SELECT display_name, background, skill_level, plan, target_role_slug, "
                "known_topics, interests, weekly_hours, preferred_formats, "
                "onboarding_complete, personalized_roadmap, learner_context "
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
            plan=row[3] if row[3] in ("free", "paid") else "free",
            target_role_slug=row[4],
            known_topics=row[5] or [],
            interests=row[6] or [],
            weekly_hours=row[7],
            preferred_formats=row[8] or [],
            onboarding_complete=row[9],
            personalized_roadmap=row[10],
            learner_context=row[11],
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
                "INSERT INTO profiles (email, display_name, background, skill_level, plan, "
                "target_role_slug, known_topics, interests, weekly_hours, preferred_formats, "
                "onboarding_complete, personalized_roadmap, "
                "learner_context, updated_at) VALUES (:email, :display_name, :background, "
                ":skill_level, :plan, :target_role_slug, CAST(:known_topics AS jsonb), "
                "CAST(:interests AS jsonb), :weekly_hours, CAST(:preferred_formats AS jsonb), "
                ":onboarding_complete, CAST(:personalized_roadmap AS jsonb), "
                "CAST(:learner_context AS jsonb), now()) "
                "ON CONFLICT (email) DO UPDATE SET display_name = :display_name, "
                "background = :background, skill_level = :skill_level, plan = :plan, "
                "target_role_slug = :target_role_slug, "
                "known_topics = CAST(:known_topics AS jsonb), "
                "interests = CAST(:interests AS jsonb), "
                "weekly_hours = :weekly_hours, "
                "preferred_formats = CAST(:preferred_formats AS jsonb), "
                "onboarding_complete = :onboarding_complete, "
                "personalized_roadmap = CAST(:personalized_roadmap AS jsonb), "
                "learner_context = COALESCE(CAST(:learner_context AS jsonb), "
                "profiles.learner_context), "
                "updated_at = now()"
            ),
            {
                "email": user_email,
                "display_name": profile.display_name,
                "background": profile.background,
                "skill_level": profile.skill_level,
                "plan": profile.plan,
                "target_role_slug": profile.target_role_slug,
                "known_topics": json.dumps(profile.known_topics),
                "interests": json.dumps(profile.interests),
                "weekly_hours": profile.weekly_hours,
                "preferred_formats": json.dumps(profile.preferred_formats),
                "onboarding_complete": profile.onboarding_complete,
                "personalized_roadmap": json.dumps(profile.personalized_roadmap)
                if profile.personalized_roadmap is not None
                else None,
                "learner_context": json.dumps(profile.learner_context)
                if profile.learner_context is not None
                else None,
            },
        )
    return profile
