"""Endpoint tests. Coursera calls are mocked; no network access needed."""

import os

import pytest
from fastapi.testclient import TestClient

import app.coursera_client as coursera_client
from app.main import app

def _has_env_file() -> bool:
    from pathlib import Path

    env = Path(__file__).parent.parent / ".env"
    if not env.exists():
        return False
    return any(line.startswith("DATABASE_URL=") for line in env.read_text(encoding="utf-8").splitlines())


requires_database = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL") and not _has_env_file(),
    reason="DATABASE_URL not configured",
)


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr(
        coursera_client,
        "_fetch_all_elements",
        lambda: [
            {"id": "1", "name": "Python for Everybody", "slug": "python-for-everybody"},
            {"id": "2", "name": "React Basics", "slug": "react-basics"},
        ],
    )
    return TestClient(app)


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_profile_without_database(client, monkeypatch):
    import app.db as db

    monkeypatch.setattr(db, "DATABASE_URL", "")
    response = client.post("/auth/login", json={"email": "a@b.com", "password": "password123"})
    assert response.status_code == 503
    assert "administrator" in response.json()["detail"]


def test_courses_unfiltered(client):
    body = client.get("/courses").json()
    assert body["count"] == 2


def test_courses_filtered(client):
    body = client.get("/courses", params={"topic": "python"}).json()
    assert body["count"] == 1
    assert body["courses"][0]["name"] == "Python for Everybody"


def test_courses_upstream_failure(client, monkeypatch):
    def raise_upstream():
        raise coursera_client.UpstreamError("down")

    monkeypatch.setattr(coursera_client, "_fetch_all_elements", raise_upstream)
    assert client.get("/courses").status_code == 502


def test_roadmap_slugs(client):
    slugs = client.get("/roadmaps").json()["slugs"]
    assert "python" in slugs
    assert "frontend" in slugs


def test_roadmap_topics(client):
    body = client.get("/roadmaps/python").json()
    assert body["slug"] == "python"
    assert body["topic_count"] > 0


def test_roadmap_unknown_slug(client):
    assert client.get("/roadmaps/does-not-exist").status_code == 404


def test_roadmap_traversal_slug_rejected(client):
    assert client.get("/roadmaps/..%2F..%2Fsecrets").status_code == 404


def test_roadmap_graph(client):
    body = client.get("/roadmaps/python/graph").json()
    assert body["node_count"] > 0
    assert all("prerequisites" in node for node in body["nodes"])


@requires_database
def test_register_login_and_profile(client):
    import uuid

    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    register = client.post(
        "/auth/register",
        json={"email": email, "password": "password123", "display_name": "Test"},
    )
    assert register.status_code == 201
    token = register.json()["access_token"]

    duplicate = client.post(
        "/auth/register", json={"email": email, "password": "password123"}
    )
    assert duplicate.status_code == 409

    login = client.post(
        "/auth/login", json={"email": email, "password": "password123"}
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/auth/me", headers=headers).json()["email"] == email
    assert client.get("/profile").status_code == 401

    saved = client.put(
        "/profile",
        headers=headers,
        json={"display_name": "Test", "background": "", "skill_level": "beginner", "target_role_slug": "python"},
    )
    assert saved.status_code == 200
    assert client.get("/profile", headers=headers).json()["target_role_slug"] == "python"

    bad_role = client.put(
        "/profile",
        headers=headers,
        json={"display_name": "Test", "background": "", "skill_level": "beginner", "target_role_slug": "nope"},
    )
    assert bad_role.status_code == 422
