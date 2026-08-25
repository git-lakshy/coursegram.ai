"""FastAPI application exposing course listings and roadmap topic references."""

import asyncio
import time

import app.config  # loads backend/.env before anything reads the environment
import os
import httpx
from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.assistant import ChatRequest, ChatResponse, chat
from app.auth import get_current_user_email
from app.auth_security import issue_token, verify_password
from app.categories import get_categories
from app.coursera_client import UpstreamError, fetch_courses
from app.db import DatabaseNotConfigured
from app.llm import LLMError, close_client
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
)
from app.profile_store import load_profile, save_profile
from app.roadmap_store import (
    RoadmapNotFound,
    list_roadmap_slugs,
    load_roadmap_graph,
    load_roadmap_topics,
)
from app.user_store import UserNotFound, UserAlreadyExists, create_user, get_or_create_firebase_user, get_user_record

app = FastAPI(title="Coursegram API", version="1.0.0")

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Simple in memory rate limiter for expensive and auth sensitive endpoints.
# Per client key sliding window; good enough for a single process deployment.
RATE_LIMITS: dict[str, tuple[int, float]] = {
    "/auth/register": (10, 60.0),
    "/auth/login": (10, 60.0),
    "/onboarding/goal": (10, 60.0),
    "/onboarding/quiz": (10, 60.0),
    "/onboarding/plan": (10, 60.0),
    "/assistant/chat": (20, 60.0),
    "/courses": (30, 60.0),
}
_rate_buckets: dict[str, list[float]] = {}


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    limit = RATE_LIMITS.get(request.url.path)
    if limit is not None:
        max_requests, window = limit
        client_ip = request.client.host if request.client else "unknown"
        key = f"{request.url.path}:{client_ip}"
        now = time.monotonic()
        bucket = [t for t in _rate_buckets.get(key, []) if now - t < window]
        if len(bucket) >= max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests, slow down a little."},
            )
        bucket.append(now)
        _rate_buckets[key] = bucket
    return await call_next(request)


@app.exception_handler(UpstreamError)
def upstream_error_handler(request, exc: UpstreamError):
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.exception_handler(LLMError)
def llm_error_handler(request, exc: LLMError):
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.exception_handler(DatabaseNotConfigured)
def database_error_handler(request, exc: DatabaseNotConfigured):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database is not active. Please contact the administrator."},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


@app.on_event("shutdown")
async def shutdown_event():
    await close_client()


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
    """Return the authenticated identity, ensuring a user row exists."""
    get_or_create_firebase_user(email)
    return {"email": email}


@app.post("/onboarding/quiz")
async def onboarding_quiz(
    payload: QuizRequest, email: str = Depends(get_current_user_email)
) -> QuizResponse:
    """Generate a placement quiz for the chosen track via the LLM."""
    return await generate_quiz(payload)


@app.post("/onboarding/grade")
def onboarding_grade(
    payload: GradeRequest, email: str = Depends(get_current_user_email)
) -> GradeResponse:
    """Grade a placement quiz locally and recommend a skill level."""
    return grade_quiz(payload)


@app.post("/assistant/chat")
async def assistant_chat(
    payload: ChatRequest, email: str = Depends(get_current_user_email)
) -> ChatResponse:
    """Reply to a learner question with profile and track context."""
    profile = load_profile(email)
    return await chat(email, profile, payload)

@app.get("/roadmaps/{slug}/categories")
async def get_roadmap_categories(slug: str) -> dict:
    """Return meaningful skill categories for a track, cached after first run."""
    try:
        return await get_categories(slug)
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")


@app.post("/onboarding/goal")
async def onboarding_goal(
    payload: GoalRequest, email: str = Depends(get_current_user_email)
) -> GoalAnalysisResponse:
    """Parse a free text learning goal into a track and skill areas."""
    return await analyze_goal(payload)


@app.post("/onboarding/plan")
async def onboarding_plan(
    payload: PlanRequest, email: str = Depends(get_current_user_email)
) -> PlanResponse:
    """Generate a personalized roadmap from the track reference data."""
    return await generate_plan(payload)



