"""Typed models for the learner profile."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class LearnerProfile(BaseModel):
    """Who the learner is and what they are aiming for.

    A single implicit learner exists until accounts are introduced in a
    later phase, so there is no user id yet.
    """

    display_name: str = Field(default="", description="Name shown across the product")
    background: str = Field(default="", description="Short free text self description")
    skill_level: Literal["beginner", "intermediate", "advanced"] = Field(
        default="beginner", description="Self assessed overall skill level"
    )
    target_role_slug: Optional[str] = Field(
        default=None,
        description="Slug of the roadmap track the learner is aiming for",
    )
