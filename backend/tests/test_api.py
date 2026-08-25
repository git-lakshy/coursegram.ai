"""Endpoint tests. Coursera calls are mocked; no network access needed."""

import datetime
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
    response = client.get("/profile")
    assert response.status_code == 401


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


FAKE_TOPICS = {
    "python": ["Variables", "Functions", "Loops"],
    "frontend": ["HTML", "CSS", "JavaScript"],
}
FAKE_GRAPHS = {
    "python": {
        "slug": "python",
        "nodes": [
            {"id": "variables", "label": "Variables", "prerequisites": []},
            {"id": "functions", "label": "Functions", "prerequisites": ["variables"]},
        ],
    },
    "frontend": {
        "slug": "frontend",
        "nodes": [{"id": "html", "label": "HTML", "prerequisites": []}],
    },
}


@pytest.fixture()
def fake_roadmaps(client, monkeypatch):
    import app.main as main_mod

    monkeypatch.setattr(main_mod, "list_roadmap_slugs", lambda: sorted(FAKE_TOPICS))
    monkeypatch.setattr(
        main_mod,
        "load_roadmap_topics",
        lambda slug: FAKE_TOPICS.get(slug) or _raise(main_mod.RoadmapNotFound(slug)),
    )
    monkeypatch.setattr(
        main_mod,
        "load_roadmap_graph",
        lambda slug: FAKE_GRAPHS.get(slug) or _raise(main_mod.RoadmapNotFound(slug)),
    )
    return client


def _raise(error):
    raise error


def test_roadmap_slugs(fake_roadmaps):
    slugs = fake_roadmaps.get("/roadmaps").json()["slugs"]
    assert "python" in slugs
    assert "frontend" in slugs


def test_roadmap_topics(fake_roadmaps):
    body = fake_roadmaps.get("/roadmaps/python").json()
    assert body["slug"] == "python"
    assert body["topic_count"] == 3


def test_roadmap_unknown_slug(fake_roadmaps):
    assert fake_roadmaps.get("/roadmaps/does-not-exist").status_code == 404


def test_roadmap_traversal_slug_rejected(fake_roadmaps):
    assert fake_roadmaps.get("/roadmaps/..%2F..%2Fsecrets").status_code == 404


def test_roadmap_graph(fake_roadmaps):
    body = fake_roadmaps.get("/roadmaps/python/graph").json()
    assert body["node_count"] == 2
    assert all("prerequisites" in node for node in body["nodes"])


def test_roadmaps_database_down(client, monkeypatch):
    import app.main as main_mod
    from app.db import DatabaseNotConfigured

    def raise_db():
        raise DatabaseNotConfigured("connection refused")

    monkeypatch.setattr(main_mod, "list_roadmap_slugs", raise_db)
    response = client.get("/roadmaps")
    assert response.status_code == 503
    assert "administrator" in response.json()["detail"]


@requires_database
def test_firebase_token_profile_flow(client, monkeypatch):
    """A valid Firebase ID token authenticates and can save a profile."""
    import time
    import uuid

    import jwt
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID

    import app.auth_security as auth_security

    project_id = "test-project"
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "securetoken@test-project")])
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.now(datetime.timezone.utc))
        .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1))
        .sign(key, hashes.SHA256())
    )
    pem = cert.public_bytes(encoding=serialization.Encoding.PEM).decode()
    monkeypatch.setattr(auth_security, "FIREBASE_PROJECT_ID", project_id)
    monkeypatch.setattr(auth_security, "_firebase_certs", ({"test-kid": pem}, time.time()))

    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    now = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
    token = jwt.encode(
        {
            "iss": f"https://securetoken.google.com/{project_id}",
            "aud": project_id,
            "sub": "uid-1",
            "email": email,
            "iat": now,
            "exp": now + 3600,
        },
        key,
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )
    headers = {"Authorization": f"Bearer {token}"}

    assert client.get("/auth/me", headers=headers).json()["email"] == email
    assert client.get("/profile", headers=headers).json()["target_role_slug"] is None

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

    forged = jwt.encode(
        {"iss": f"https://securetoken.google.com/{project_id}", "aud": project_id, "sub": "u", "email": email},
        rsa.generate_private_key(public_exponent=65537, key_size=2048),
        algorithm="RS256",
        headers={"kid": "test-kid"},
    )
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401
