"""FastAPI application exposing course listings and roadmap topic references."""

import asyncio
import time

import app.config  # loads backend/.env before anything reads the environment
import datetime
import logging
import os
import httpx
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel, Field
from typing import Literal

from app.assistant import ChatRequest, ChatResponse, chat
from app import actions as actions_executor
from app import assessments as assessments_pipeline
from app.auth import get_current_user_email
from app.auth_security import firebase_enabled
from app import chat_store
from app.categories import get_categories
from app.coursera_client import UpstreamError, fetch_courses
from app import course_store
from app.db import DatabaseNotConfigured
from app.llm import LLMError, close_client
from app.event_store import events_this_month, learning_streak, record_event
from app.learner_context import build_learner_context, context_summary_for
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
from app.progress_store import get_progress, save_progress
from app import project_store
from app import projects as projects_pipeline
from app.resources_store import next_topics_with_resources, search_resources
from app.roadmap_store import (
    RoadmapNotFound,
    list_roadmap_slugs,
    load_roadmap_graph,
    load_roadmap_topics,
)
from app.user_store import get_or_create_firebase_user

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_client()


app = FastAPI(title="Coursegram API", version="1.0.0", lifespan=lifespan)

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

logging.basicConfig(level=logging.INFO)
logging.getLogger("app.auth").info(
    "Auth config: firebase=%s project=%s origins=%s",
    firebase_enabled(),
    os.environ.get("FIREBASE_PROJECT_ID", "") or "(not set)",
    ALLOWED_ORIGINS,
)

# Simple in memory rate limiter for expensive and auth sensitive endpoints.
# Per client key sliding window; good enough for a single process deployment.
RATE_LIMITS: dict[str, tuple[int, float]] = {
    "/onboarding/goal": (10, 60.0),
    "/onboarding/quiz": (10, 60.0),
    "/onboarding/plan": (10, 60.0),
    "/assistant/chat": (20, 60.0),
    "/courses": (30, 60.0),
}
_rate_buckets: dict[str, list[float]] = {}
_RATE_BUCKET_TTL = 300.0
RATE_PREFIX_LIMITS: list[tuple[str, tuple[int, float]]] = [
    ("/assessments/generate", (20, 60.0)),
    ("/projects/", (20, 60.0)),
]


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    limit = RATE_LIMITS.get(request.url.path)
    if limit is None:
        for prefix, prefix_limit in RATE_PREFIX_LIMITS:
            if request.url.path.startswith(prefix):
                limit = prefix_limit
                break
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
        # Drop stale buckets so the map cannot grow without bound.
        if len(_rate_buckets) > 10_000:
            for stale in [k for k, v in _rate_buckets.items() if not v or now - v[-1] > _RATE_BUCKET_TTL]:
                del _rate_buckets[stale]
    return await call_next(request)


@app.exception_handler(UpstreamError)
@app.exception_handler(LLMError)
def upstream_error_handler(request, exc):
    logging.getLogger("app.main").warning(
        "Upstream failure on %s %s: %s", request.method, request.url.path, exc
    )
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


@app.get("/health")
def health_check() -> dict:
    """Return a simple status payload used for uptime checks."""
    return {"status": "ok"}


async def refresh_learner_context(user_email: str) -> None:
    """Regenerate the rolling learner context, swallowing failures."""
    try:
        await build_learner_context(user_email)
    except Exception as error:
        logging.getLogger("app.context").warning(
            "Context refresh failed for %s: %s", user_email, error
        )


@app.get("/courses")
def get_courses(
    topic: str = Query(default="", description="Optional keyword filter on the course name"),
    limit: int = Query(default=20, ge=1, le=100),
) -> dict:
    """Return courses from Coursera and Udemy, optionally filtered by keyword."""
    courses = fetch_courses(limit=limit, topic=topic)
    for course in courses:
        course.setdefault("source", "coursera")
    from app.udemy_client import fetch_courses as fetch_udemy

    udemy_courses = fetch_udemy(limit=max(1, limit // 2), topic=topic)
    merged = courses + [
        course for course in udemy_courses if course not in courses
    ]
    return {"count": len(merged), "courses": merged}


@app.post("/roadmaps/{slug}/regenerate")
def regenerate_roadmap(
    slug: str, email: str = Depends(get_current_user_email)
) -> dict:
    """Regenerate the learner's personalized roadmap for a track.

    Uses the learner's current knowledge (known topics plus completed
    progress), their background goal, rolling context, and self assessed
    level so the plan skips mastered material and reflects reality.
    """
    profile = load_profile(email)
    if slug not in list_roadmap_slugs():
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")

    completed = get_progress(email, slug)
    known = list(dict.fromkeys((profile.known_topics or []) + completed))

    goal_parts = [profile.background.strip(), context_summary_for(email)]
    goal_text = ". ".join(part for part in goal_parts if part)

    from app.onboarding import PlanRequest, generate_plan

    try:
        graph = load_roadmap_graph(slug)
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    area_levels = {domain: profile.skill_level for domain in graph.get("domains", ["core"])}

    plan = generate_plan(
        PlanRequest(
            slug=slug,
            goal_text=goal_text,
            area_levels=area_levels,
            known_topics=known,
        )
    )
    record_event(email, "plan_generated", {"slug": slug, "regenerated": True})

    profile.personalized_roadmap = {
        "slug": slug,
        "summary": plan.summary,
        "phases": [phase.model_dump() for phase in plan.phases],
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    saved = save_profile(email, profile)
    return {"slug": slug, "personalized_roadmap": saved.personalized_roadmap}


@app.get("/resources")
def get_resources(
    topics: str = Query(description="Comma separated topic tags to match"),
    level: str = Query(default="beginner"),
    free: bool | None = Query(default=None),
    type: str = Query(default="", description="Comma separated resource types"),
    limit: int = Query(default=6, ge=1, le=20),
) -> dict:
    """Rank curated resources for the given topics and learner level."""
    topic_list = [item.strip() for item in topics.split(",") if item.strip()]
    type_list = [item.strip() for item in type.split(",") if item.strip()] or None
    results = search_resources(
        topics=topic_list,
        level=level,
        free=free,
        resource_types=type_list,
        limit=limit,
    )
    return {"count": len(results), "resources": results}


@app.get("/roadmaps/{slug}/next-with-resources")
def get_next_with_resources(
    slug: str,
    limit_topics: int = Query(default=3, ge=1, le=10),
    resources_per_topic: int = Query(default=3, ge=1, le=10),
    email: str = Depends(get_current_user_email),
) -> dict:
    """Return the learner's next topics, each with matched resources."""
    result = next_topics_with_resources(
        email,
        slug,
        limit_topics=limit_topics,
        resources_per_topic=resources_per_topic,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    return result


class ProgressUpdate(BaseModel):
    completed: list[str] = Field(default_factory=list, max_length=500)


class BookmarkRequest(BaseModel):
    resource_id: str = Field(min_length=1, max_length=200)


@app.get("/bookmarks")
def list_bookmarks_endpoint(email: str = Depends(get_current_user_email)) -> dict:
    """Return the learner's saved resources."""
    from app.bookmark_store import list_bookmarks

    docs = list_bookmarks(email)
    return {"count": len(docs), "resources": docs}


@app.put("/bookmarks/{resource_id}")
def add_bookmark_endpoint(
    resource_id: str, email: str = Depends(get_current_user_email)
) -> dict:
    """Save a resource for the learner."""
    from app.bookmark_store import add_bookmark

    add_bookmark(email, resource_id)
    record_event(email, "resource_saved", {"resource_id": resource_id})
    return {"resource_id": resource_id, "bookmarked": True}


@app.delete("/bookmarks/{resource_id}")
def remove_bookmark_endpoint(
    resource_id: str, email: str = Depends(get_current_user_email)
) -> dict:
    """Remove a saved resource."""
    from app.bookmark_store import remove_bookmark

    remove_bookmark(email, resource_id)
    return {"resource_id": resource_id, "bookmarked": False}


@app.get("/learning")
def list_learning_endpoint(email: str = Depends(get_current_user_email)) -> dict:
    """Return the learner's tracked courses with their status."""
    items = course_store.list_tracked(email)
    return {"count": len(items), "courses": items}


class LearningStatusUpdate(BaseModel):
    status: Literal["learning", "completed"]


@app.put("/learning/{resource_id}")
def set_learning_status(
    resource_id: str,
    payload: LearningStatusUpdate,
    email: str = Depends(get_current_user_email),
) -> dict:
    """Mark a course as currently learning or completed."""
    previous = course_store.set_status(email, resource_id, payload.status)
    if payload.status == "learning" and previous is None:
        record_event(email, "course_started", {"resource_id": resource_id})
    if payload.status == "completed" and previous != "completed":
        record_event(email, "course_completed", {"resource_id": resource_id})
    return {"resource_id": resource_id, "status": payload.status}


@app.delete("/learning/{resource_id}")
def delete_learning(
    resource_id: str, email: str = Depends(get_current_user_email)
) -> dict:
    """Stop tracking a course."""
    course_store.remove(email, resource_id)
    return {"resource_id": resource_id, "status": None}


@app.get("/roadmaps/{slug}/projects")
async def get_track_projects_endpoint(slug: str) -> dict:
    """Return the track's project suggestions, generating and caching once."""
    try:
        projects = await projects_pipeline.get_track_projects(slug)
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    return {"slug": slug, "count": len(projects), "projects": projects}


@app.get("/projects")
def get_user_projects_endpoint(email: str = Depends(get_current_user_email)) -> dict:
    """Return the learner's project states, evidence, and analyses."""
    rows = project_store.list_user_projects(email)
    return {"count": len(rows), "projects": rows}


class ProjectUpdateRequest(BaseModel):
    slug: str = Field(min_length=1, max_length=100)
    state: Literal["planned", "in_progress", "completed"] | None = None
    repo_url: str | None = Field(default=None, max_length=500)
    demo_url: str | None = Field(default=None, max_length=500)


@app.put("/projects/{project_id}")
def update_project_endpoint(
    project_id: str,
    payload: ProjectUpdateRequest,
    email: str = Depends(get_current_user_email),
) -> dict:
    """Set a project's state or save evidence links."""
    if payload.slug not in list_roadmap_slugs():
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    row = project_store.upsert_project(
        email,
        project_id,
        payload.slug,
        payload.state,
        payload.repo_url,
        payload.demo_url,
    )
    if payload.state is not None:
        record_event(
            email,
            "project_state_changed",
            {"project_id": project_id, "slug": payload.slug, "state": payload.state},
        )
    return {"project_id": project_id, **row}


class ProjectAnalyzeRequest(BaseModel):
    slug: str = Field(min_length=1, max_length=100)


@app.post("/projects/{project_id}/analyze")
async def analyze_project_endpoint(
    project_id: str,
    payload: ProjectAnalyzeRequest,
    email: str = Depends(get_current_user_email),
) -> dict:
    """Run an honest AI review of the learner's project evidence."""
    if payload.slug not in list_roadmap_slugs():
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    row = project_store.get_project_row(email, project_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Set a project state first")
    try:
        profile = load_profile(email)
        track_projects = projects_pipeline.load_cached_projects(payload.slug)
        definition = None
        if track_projects is not None:
            definition = next((item for item in track_projects if item["id"] == project_id), None)
        if definition is None:
            definition = row.get("definition")
        if definition is None:
            track_projects = await projects_pipeline.get_track_projects(payload.slug)
            definition = next((item for item in track_projects if item["id"] == project_id), None)
        if definition is None:
            raise HTTPException(status_code=404, detail="Unknown project for this track")
        analysis = await projects_pipeline.analyze_project(profile, definition, row)
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    except projects_pipeline.ProjectError as error:
        raise HTTPException(status_code=502, detail=str(error))
    project_store.save_analysis(email, project_id, analysis)
    record_event(email, "project_analyzed", {"project_id": project_id, "slug": payload.slug})
    return {"project_id": project_id, "analysis": analysis}


@app.get("/assessments/stages")
def assessment_stages_endpoint(
    slug: str = Query(min_length=1, max_length=100),
    email: str = Depends(get_current_user_email),
) -> dict:
    """Return the learner's roadmap stages with assessability and results."""
    try:
        stages = assessments_pipeline.stages_for_learner(email, slug)
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    latest = assessments_pipeline.latest_stage_results(email, slug)
    for stage in stages:
        stage["latest_result"] = latest.get(stage["name"])
    return {"slug": slug, "stages": stages}


class AssessmentGenerateRequest(BaseModel):
    slug: str = Field(min_length=1, max_length=100)
    stage_position: int = Field(ge=1, le=50)


@app.post("/assessments/generate")
async def assessment_generate_endpoint(
    payload: AssessmentGenerateRequest,
    email: str = Depends(get_current_user_email),
) -> dict:
    """Generate (or reuse cached) questions for one assessable stage."""
    if payload.slug not in list_roadmap_slugs():
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    try:
        return await assessments_pipeline.generate_stage_assessment(
            email, payload.slug, payload.stage_position
        )
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail="This stage is not assessable yet. Complete or start its topics first.",
        )
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    except llm.LLMNotConfigured as error:
        raise HTTPException(status_code=503, detail=str(error))


class AssessmentAnswer(BaseModel):
    question_id: str = Field(min_length=1, max_length=50)
    answer_index: int = Field(default=-1, ge=-1, le=9)


class AssessmentSubmitRequest(BaseModel):
    slug: str = Field(min_length=1, max_length=100)
    stage_position: int = Field(ge=1, le=50)
    answers: list[AssessmentAnswer] = Field(max_length=20)


@app.post("/assessments/submit")
async def assessment_submit_endpoint(
    payload: AssessmentSubmitRequest,
    background_tasks: BackgroundTasks,
    email: str = Depends(get_current_user_email),
) -> dict:
    """Grade against the cached answer key, adjust the roadmap on failure."""
    # Grade strictly against the cached question set for this stage.
    questions = None
    stages = assessments_pipeline.stages_for_learner(email, payload.slug)
    stage = next((item for item in stages if item["position"] == payload.stage_position), None)
    if stage is not None:
        questions = assessments_pipeline._load_cache(
            payload.slug,
            assessments_pipeline.stage_key(stage["position"], stage["name"]),
        )
    if questions is None:
        raise HTTPException(status_code=404, detail="Generate the assessment first")
    result = assessments_pipeline.submit_stage_assessment(
        email,
        payload.slug,
        payload.stage_position,
        [answer.model_dump() for answer in payload.answers],
        questions,
    )
    assessments_pipeline.save_result(email, result)
    record_event(
        email,
        "assessment_taken",
        {
            "slug": payload.slug,
            "stage": result["stage"],
            "score": result["score"],
            "total": result["total"],
        },
    )
    if result["revisit_topics"]:
        background_tasks.add_task(refresh_learner_context, email)
    return result


@app.get("/assessments")
def assessment_history_endpoint(
    slug: str = Query(min_length=1, max_length=100),
    email: str = Depends(get_current_user_email),
) -> dict:
    """Return the learner's latest assessment result per stage."""
    latest = assessments_pipeline.latest_stage_results(email, slug)
    items = sorted(latest.values(), key=lambda item: item["created_at"], reverse=True)
    return {"slug": slug, "count": len(items), "results": items}


@app.get("/assistant/history")
def assistant_history_endpoint(
    limit: int = Query(default=40, ge=1, le=100),
    email: str = Depends(get_current_user_email),
) -> dict:
    """Return the learner's stored assistant conversation, oldest first."""
    return {"messages": chat_store.recent_messages(email, limit)}


@app.delete("/assistant/history")
def clear_assistant_history(email: str = Depends(get_current_user_email)) -> dict:
    """Delete the learner's stored assistant conversation."""
    chat_store.clear(email)
    return {"cleared": True}


class AssistantExecuteRequest(BaseModel):
    actions: list[dict] = Field(min_length=1, max_length=5)


@app.post("/assistant/execute")
async def assistant_execute_endpoint(
    payload: AssistantExecuteRequest,
    background_tasks: BackgroundTasks,
    email: str = Depends(get_current_user_email),
) -> dict:
    """Apply confirmed assistant actions after server side validation."""
    profile = load_profile(email)
    results = await actions_executor.execute_actions(email, profile, payload.actions)
    if any(item.get("applied") for item in results):
        background_tasks.add_task(refresh_learner_context, email)
    return {"results": results}



@app.get("/progress/{slug}")
def get_topic_progress(
    slug: str, email: str = Depends(get_current_user_email)
) -> dict:
    """Return the learner's completed topics for a roadmap."""
    return {"slug": slug, "completed": get_progress(email, slug)}


@app.put("/progress/{slug}")
def put_topic_progress(
    slug: str,
    payload: ProgressUpdate,
    background_tasks: BackgroundTasks,
    email: str = Depends(get_current_user_email),
) -> dict:
    """Replace the learner's completed topics for a roadmap."""
    previous = get_progress(email, slug)
    completed = save_progress(email, slug, payload.completed)
    for topic in completed:
        if topic not in previous:
            record_event(email, "topic_completed", {"slug": slug, "topic": topic})
    for topic in previous:
        if topic not in completed:
            record_event(email, "topic_uncompleted", {"slug": slug, "topic": topic})
    if completed:
        background_tasks.add_task(refresh_learner_context, email)
    return {"slug": slug, "completed": completed}


class EventRequest(BaseModel):
    type: str = Field(min_length=1, max_length=50)
    detail: dict = Field(default_factory=dict)


@app.post("/events")
def record_activity(
    payload: EventRequest, email: str = Depends(get_current_user_email)
) -> dict:
    """Record a study activity event from the client."""
    record_event(email, payload.type, payload.detail)
    return {"recorded": True}


class StageFeedbackRequest(BaseModel):
    slug: str = Field(min_length=1, max_length=100)
    stage: str = Field(min_length=1, max_length=200)
    position: int = Field(ge=1, le=50)
    difficulty: Literal["too_easy", "just_right", "too_hard"]


@app.post("/feedback/stage")
def post_stage_feedback(
    payload: StageFeedbackRequest, email: str = Depends(get_current_user_email)
) -> dict:
    """Record the learner's difficulty feedback for a completed stage."""
    if payload.slug not in list_roadmap_slugs():
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")
    record_event(email, "stage_feedback", payload.model_dump())
    return {"slug": payload.slug, "stage": payload.stage, "difficulty": payload.difficulty}


@app.get("/feedback/stage")
def get_stage_feedback(
    slug: str = Query(min_length=1, max_length=100),
    email: str = Depends(get_current_user_email),
) -> dict:
    """Return the learner's latest stage feedback for a roadmap."""
    from app.event_store import latest_stage_feedback

    return {"slug": slug, "feedback": latest_stage_feedback(email, slug)}


@app.get("/streak")
def get_streak(email: str = Depends(get_current_user_email)) -> dict:
    """Return the learner's current learning streak and monthly activity."""
    return {
        "streak_days": learning_streak(email),
        "events_this_month": events_this_month(email),
    }


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
    profile: LearnerProfile,
    background_tasks: BackgroundTasks,
    user_email: str = Depends(get_current_user_email),
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
    saved = save_profile(user_email, profile)
    if saved.onboarding_complete:
        # Refresh the rolling learner context without blocking the response.
        background_tasks.add_task(refresh_learner_context, user_email)
    return saved


class PlanUpdate(BaseModel):
    plan: Literal["free", "paid"]


@app.post("/plan")
def update_plan(
    payload: PlanUpdate, email: str = Depends(get_current_user_email)
) -> LearnerProfile:
    """Switch the learner between the free and paid plan."""
    profile = load_profile(email)
    previous = profile.plan
    if previous != payload.plan:
        profile.plan = payload.plan
        profile = save_profile(email, profile)
        record_event(email, "plan_changed", {"from": previous, "to": payload.plan})
    return profile


@app.delete("/profile")
def delete_profile(email: str = Depends(get_current_user_email)) -> dict:
    """Delete the learner's profile, progress, bookmarks and events."""
    from sqlalchemy import text

    from app.db import get_engine

    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM progress WHERE email = :email"), {"email": email})
        connection.execute(text("DELETE FROM bookmarks WHERE email = :email"), {"email": email})
        connection.execute(text("DELETE FROM events WHERE email = :email"), {"email": email})
        connection.execute(text("DELETE FROM profiles WHERE email = :email"), {"email": email})
    return {"deleted": True}


@app.get("/auth/me")
def me(email: str = Depends(get_current_user_email)) -> dict:
    """Return the authenticated identity, ensuring a user row exists."""
    get_or_create_firebase_user(email)
    return {"email": email}


@app.post("/onboarding/quiz")
async def onboarding_quiz(
    payload: QuizRequest, _email: str = Depends(get_current_user_email)
) -> QuizResponse:
    """Generate a placement quiz for the chosen track via the LLM."""
    return await generate_quiz(payload)


@app.post("/onboarding/grade")
def onboarding_grade(
    payload: GradeRequest,
    background_tasks: BackgroundTasks,
    _email: str = Depends(get_current_user_email),
) -> GradeResponse:
    """Grade a placement quiz locally and recommend a skill level."""
    response = grade_quiz(payload)
    topic = payload.questions[0].topic if payload.questions else ""
    record_event(_email, "quiz_taken", {"topic": topic, "score": response.score})
    background_tasks.add_task(refresh_learner_context, _email)
    return response


@app.post("/assistant/chat")
async def assistant_chat(
    payload: ChatRequest, _email: str = Depends(get_current_user_email)
) -> ChatResponse:
    """Reply to a learner question with profile and track context."""
    profile = load_profile(_email)
    return await chat(_email, profile, payload)

@app.get("/roadmaps/{slug}/categories")
async def get_roadmap_categories(slug: str) -> dict:
    """Return meaningful skill categories for a track, cached after first run."""
    try:
        return await get_categories(slug)
    except RoadmapNotFound:
        raise HTTPException(status_code=404, detail="Unknown roadmap slug")


@app.post("/onboarding/goal")
async def onboarding_goal(
    payload: GoalRequest, _email: str = Depends(get_current_user_email)
) -> GoalAnalysisResponse:
    """Parse a free text learning goal into a track and skill areas."""
    return await analyze_goal(payload)


@app.post("/onboarding/plan")
async def onboarding_plan(
    payload: PlanRequest, _email: str = Depends(get_current_user_email)
) -> PlanResponse:
    """Generate a personalized roadmap from the track reference data."""
    response = await generate_plan(payload)
    record_event(_email, "plan_generated", {"slug": payload.slug})
    return response



