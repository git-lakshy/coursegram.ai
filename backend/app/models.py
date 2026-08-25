"""Typed models for the learner profile."""

from typing import Any, Literal, Optional

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
    known_topics: list[str] = Field(
        default_factory=list,
        description="Topics the learner already knows, from onboarding",
    )
    onboarding_complete: bool = Field(
        default=False,
        description="Whether the first time onboarding flow has been finished",
    )
    personalized_roadmap: Optional[dict[str, Any]] = Field(
        default=None,
        description="LLM generated roadmap with phases and milestones for the target track",
    )
