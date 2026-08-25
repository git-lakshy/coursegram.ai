"""Password hashing and token signing for local development auth.

Everything here is standard library only. The single entry point the rest
of the app depends on for request authentication is verify_token, so the
production move to Firebase ID tokens touches only this module.
"""

import hashlib
import hmac
import json
import logging
import os
import secrets
import time
import urllib.request

import jwt
from cryptography.x509 import load_pem_x509_certificate

logger = logging.getLogger("app.auth")

SECRET_KEY_PATH = os.path.join(
    os.path.dirname(__file__), "data", "runtime", "dev_secret.key"
)
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
PBKDF2_ITERATIONS = 200_000

FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "").strip()
FIREBASE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)

_secret_key: bytes | None = None
_firebase_certs: tuple[dict, float] | None = None


def firebase_enabled() -> bool:
    return FIREBASE_PROJECT_ID != ""


def _get_secret_key() -> bytes:
    """Resolve the token signing key.

    Production deployments set SECRET_KEY in the environment. Development
    falls back to a locally generated key file so nothing breaks offline.
    """
    global _secret_key
    if _secret_key is not None:
        return _secret_key
    env_key = os.environ.get("SECRET_KEY", "").strip()
    if env_key:
        _secret_key = env_key.encode("utf-8")
        return _secret_key
    os.makedirs(os.path.dirname(SECRET_KEY_PATH), exist_ok=True)
    if os.path.exists(SECRET_KEY_PATH):
        with open(SECRET_KEY_PATH, "rb") as file:
            _secret_key = file.read()
    else:
        _secret_key = secrets.token_bytes(32)
        with open(SECRET_KEY_PATH, "wb") as file:
            file.write(_secret_key)
    return _secret_key


def hash_password(password: str, salt_hex: str) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), PBKDF2_ITERATIONS
    )
    return digest.hex()


def verify_password(password: str, salt_hex: str, expected_hash_hex: str) -> bool:
    actual = hash_password(password, salt_hex)
    return hmac.compare_digest(actual, expected_hash_hex)


def issue_token(email: str) -> str:
    """Return an HMAC signed token carrying the email and an expiry."""
    payload = {"sub": email, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    signature = hmac.new(_get_secret_key(), body, hashlib.sha256).hexdigest()
    return body.hex() + "." + signature


class InvalidToken(Exception):
    pass


def _get_firebase_certs() -> dict:
    """Fetch and cache Google's public certificates for one hour."""
    global _firebase_certs
    now = time.time()
    if _firebase_certs is not None and now - _firebase_certs[1] < 3600:
        return _firebase_certs[0]
    with urllib.request.urlopen(FIREBASE_CERTS_URL, timeout=15) as response:
        certs = json.load(response)
    _firebase_certs = (certs, now)
    return certs


def verify_firebase_token(token: str) -> str:
    """Verify a Firebase ID token and return the user's email."""
    if not firebase_enabled():
        raise InvalidToken("Firebase is not configured")
    try:
        header = jwt.get_unverified_header(token)
        certs = _get_firebase_certs()
        if header["kid"] not in certs:
            raise InvalidToken("Unknown token signing key")
        cert = load_pem_x509_certificate(certs[header["kid"]].encode("utf-8"))
        payload = jwt.decode(
            token,
            cert.public_key(),
            algorithms=["RS256"],
            audience=FIREBASE_PROJECT_ID,
            issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
            options={"verify_exp": True},
        )
    except jwt.PyJWTError as error:
        logger.warning(
            "Firebase token verification failed: %s (token alg=%s kid=%s project=%s)",
            error,
            header.get("alg") if isinstance(header, dict) else "?",
            header.get("kid") if isinstance(header, dict) else "?",
            FIREBASE_PROJECT_ID,
        )
        raise InvalidToken(f"Invalid Firebase token: {error}") from error
    except OSError as error:
        logger.warning("Could not fetch Firebase signing keys: %s", error)
        raise InvalidToken("Could not fetch token signing keys") from error
    email = payload.get("email") or ""
    if not email:
        raise InvalidToken("Firebase token has no email claim")
    return str(email).lower()


def verify_token(token: str) -> str:
    """Validate a token and return the email it was issued to.

    Firebase ID tokens are tried first when Firebase is configured; local
    signed tokens remain the development path. Callers stay unchanged.
    """
    if firebase_enabled():
        try:
            return verify_firebase_token(token)
        except InvalidToken as error:
            logger.info(
                "Firebase verification failed (%s); trying local token path", error
            )
            if token.startswith(("ey", "e30")):
                raise
    try:
        body_hex, signature = token.rsplit(".", 1)
        body = bytes.fromhex(body_hex)
    except ValueError:
        raise InvalidToken("Malformed token")
    expected = hmac.new(_get_secret_key(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise InvalidToken("Bad signature")
    payload = json.loads(body)
    if int(payload.get("exp", 0)) < time.time():
        raise InvalidToken("Token expired")
    return str(payload["sub"])
