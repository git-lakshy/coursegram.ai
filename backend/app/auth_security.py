"""Firebase ID token verification.

The single entry point the rest of the app depends on is verify_token,
which validates a Firebase ID token and returns the user's email.
"""

import json
import logging
import os
import time
import urllib.request

import jwt
from cryptography.x509 import load_pem_x509_certificate

logger = logging.getLogger("app.auth")

FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "").strip()
FIREBASE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)

_firebase_certs: tuple[dict, float] | None = None


class InvalidToken(Exception):
    """Raised when a bearer token cannot be trusted."""


def firebase_enabled() -> bool:
    return FIREBASE_PROJECT_ID != ""


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


def verify_token(token: str) -> str:
    """Validate a Firebase ID token and return the user's email."""
    if not firebase_enabled():
        raise InvalidToken("Firebase is not configured")
    try:
        header = jwt.get_unverified_header(token)
        certs = _get_firebase_certs()
        if header["kid"] not in certs:
            raise InvalidToken("Invalid token")
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
        raise InvalidToken("Invalid token") from error
    except InvalidToken:
        raise
    except OSError as error:
        logger.warning("Could not fetch Firebase signing keys: %s", error)
        raise InvalidToken("Could not verify token") from error
    email = payload.get("email") or ""
    if not email:
        raise InvalidToken("Invalid token")
    return str(email).lower()
