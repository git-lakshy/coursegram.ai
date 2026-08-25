"""FastAPI application exposing course listings and roadmap topic references."""

import app.config  # loads backend/.env before anything reads the environment
import httpx
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.assistant import ChatRequest, ChatResponse, chat
from app.auth import get_current_user_email
from app.auth_security import issue_token, verify_password
from app.categories import get_categories
from app.coursera_client import UpstreamError, fetch_courses
from app.llm import LLMError
from app.models import LearnerProfile
from app.onboarding import (
    GoalAnalysisResponse,
    GoalRequest,
    GradeRequest,
    GradeResponse,
    PlanRequest,
    PlanResponse,
    QuizRequest,
    QuizResponse,
    analyze_goal,
    generate_plan,
    generate_quiz,
    grade_quiz,
    personalize,
)
from app.profile_store import load_profile, save_profile
from app.roadmap_store import (
    RoadmapNotFound,
    list_roadmap_slugs,
    load_roadmap_graph,
    load_roadmap_topics,
)
from app.user_store import UserNotFound, UserAlreadyExists, create_user, get_user_record

app = FastAPI(title="Coursegram API", version="0.3.1")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(UpstreamError)
def upstream_error_handler(request, exc: UpstreamError):
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.exception_handler(LLMError)
def llm_error_handler(request, exc: LLMError):
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.get("/health")
def health_check() -> dict:
    """Return a simple status payload used for uptime checks."""
    return {"status": "ok"}


@app.get("/courses")
def get_courses(
    topic: str = Query(default="", description="Optional keyword filter on the course name"),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    """Return a list of Coursera courses, optionally filtered by keyword."""
    courses = fetch_courses(limit=limit, topic=topic)
    return {"count": len(courses), "courses": courses}


@app.get("/roadmaps")
def get_roadmap_slugs() -> dict:
    """Return the list of roadmap slugs available as seed reference data."""
    return {"slugs": list_roadmap_slugs()}


@app.get("/roadmaps/{slug}")
def get_roadmap(slug: str) -> dict:
    """Return the ordered topic list for a given roadmap slug."""
    try:
        topics = load_roadmap_topics(slug)
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    return {"slug": slug, "topic_count": len(topics), "topics": topics}


@app.get("/roadmaps/{slug}/graph")
def get_roadmap_graph(slug: str) -> dict:
    """Return the structured skill graph for a slug, with prerequisites."""
    try:
        graph = load_roadmap_graph(slug)
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    return {
        "slug": graph["slug"],
        "node_count": len(graph["nodes"]),
        "nodes": graph["nodes"],
    }


@app.get("/profile")
def get_profile(user_email: str = Depends(get_current_user_email)) -> LearnerProfile:
    """Return the authenticated learner's profile, defaults when none exists."""
    return load_profile(user_email)


@app.put("/profile")
def update_profile(
    profile: LearnerProfile, user_email: str = Depends(get_current_user_email)
) -> LearnerProfile:
    """Persist the authenticated learner's profile after validating the target role."""
    if (
        profile.target_role_slug is not None
        and profile.target_role_slug not in list_roadmap_slugs()
    ):
        raise HTTPException(
            status_code=422,
            detail="Unknown target role slug. Pick one from GET /roadmaps.",
        )
    return save_profile(user_email, profile)


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320, description="Learner email address")
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(default="", max_length=120)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


@app.post("/auth/register", status_code=201)
def register(payload: RegisterRequest) -> TokenResponse:
    """Create a local dev user and return a signed access token."""
    try:
        record = create_user(payload.email, payload.password, payload.display_name)
    except UserAlreadyExists:
        raise HTTPException(status_code=409, detail="Email already registered")
    return TokenResponse(
        access_token=issue_token(record["email"]), email=record["email"]
    )


@app.post("/auth/login")
def login(payload: LoginRequest) -> TokenResponse:
    """Verify credentials and return a signed access token."""
    try:
        record = get_user_record(payload.email)
    except UserNotFound:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(
        payload.password, record["password_salt"], record["password_hash"]
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return TokenResponse(
        access_token=issue_token(record["email"]), email=record["email"]
    )


@app.get("/auth/me")
def me(email: str = Depends(get_current_user_email)) -> dict:
    """Return the authenticated identity for the presented bearer token."""
    return {"email": email}

@app.post("/onboarding/quiz")
def onboarding_quiz(
    payload: QuizRequest, email: str = Depends(get_current_user_email)
) -> QuizResponse:
    """Generate a placement quiz for the chosen track via the LLM."""
    return generate_quiz(payload)


@app.post("/onboarding/grade")
def onboarding_grade(
    payload: GradeRequest, email: str = Depends(get_current_user_email)
) -> GradeResponse:
    """Grade a placement quiz locally and recommend a skill level."""
    return grade_quiz(payload)


@app.post("/assistant/chat")
def assistant_chat(
    payload: ChatRequest, email: str = Depends(get_current_user_email)
) -> ChatResponse:
    """Reply to a learner question with profile and track context."""
    profile = load_profile(email)
    return chat(email, profile, payload)

@app.get("/roadmaps/{slug}/categories")
def get_roadmap_categories(slug: str) -> dict:
    """Return meaningful skill categories for a track, cached after first run."""
    try:
        return get_categories(slug)
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")


@app.post("/onboarding/goal")
def onboarding_goal(
    payload: GoalRequest, email: str = Depends(get_current_user_email)
) -> GoalAnalysisResponse:
    """Parse a free text learning goal into a track and skill areas."""
    return analyze_goal(payload)


@app.post("/onboarding/plan")
def onboarding_plan(
    payload: PlanRequest, email: str = Depends(get_current_user_email)
) -> PlanResponse:
    """Generate a personalized roadmap from the track reference data."""
    return generate_plan(payload)
