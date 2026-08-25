"""Tests for Firebase ID token verification."""

import datetime
import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography import x509
from cryptography.x509.oid import NameOID

import app.auth_security as auth_security


PROJECT_ID = "test-project"


def _make_cert_and_key():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name(
        [x509.NameAttribute(NameOID.COMMON_NAME, "securetoken@test-project")]
    )
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.now(datetime.timezone.utc))
        .not_valid_after(datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1))
        .sign(key, hashes.SHA256())
    )
    return cert, key


@pytest.fixture()
def firebase_env(monkeypatch):
    cert, key = _make_cert_and_key()
    pem = cert.public_bytes(encoding=__import__("cryptography").hazmat.primitives.serialization.Encoding.PEM).decode()
    monkeypatch.setattr(auth_security, "FIREBASE_PROJECT_ID", PROJECT_ID)
    monkeypatch.setattr(
        auth_security, "_firebase_certs", ({"test-kid": pem}, time.time())
    )
    return key


def _make_token(key, **claims):
    payload = {
        "iss": f"https://securetoken.google.com/{PROJECT_ID}",
        "aud": PROJECT_ID,
        "sub": "firebase-uid-1",
        "email": "Learner@Example.com",
        "iat": int(datetime.datetime.now(datetime.timezone.utc).timestamp()),
        "exp": int(datetime.datetime.now(datetime.timezone.utc).timestamp()) + 3600,
        **claims,
    }
    return jwt.encode(payload, key, algorithm="RS256", headers={"kid": "test-kid"})


def test_verify_firebase_token_returns_email(firebase_env):
    token = _make_token(firebase_env)
    assert auth_security.verify_token(token) == "learner@example.com"


def test_verify_firebase_token_rejects_wrong_audience(firebase_env):
    token = _make_token(firebase_env, aud="other-project")
    with pytest.raises(auth_security.InvalidToken):
        auth_security.verify_token(token)


def test_verify_firebase_token_rejects_expired(firebase_env):
    token = _make_token(
        firebase_env,
        exp=int(datetime.datetime.now(datetime.timezone.utc).timestamp()) - 10,
    )
    with pytest.raises(auth_security.InvalidToken):
        auth_security.verify_token(token)


def test_verify_firebase_token_rejects_unknown_kid(firebase_env, monkeypatch):
    token = _make_token(firebase_env)
    certs, ts = auth_security._firebase_certs
    monkeypatch.setattr(
        auth_security, "_firebase_certs", ({"other-kid": json.dumps(certs)}, ts)
    )
    with pytest.raises(auth_security.InvalidToken):
        auth_security.verify_token(token)
