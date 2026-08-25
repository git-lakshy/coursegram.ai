"""Password hashing and token signing for local development auth.

Everything here is standard library only. The single entry point the rest
of the app depends on for request authentication is verify_token, so the
production move to Firebase ID tokens touches only this module.
"""

import hashlib
import hmac
import json
import os
import secrets
import time

SECRET_KEY_PATH = os.path.join(
    os.path.dirname(__file__), "data", "runtime", "dev_secret.key"
)
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
PBKDF2_ITERATIONS = 200_000

_secret_key: bytes | None = None


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


def verify_token(token: str) -> str:
    """Validate a token and return the email it was issued to.

    This is the seam where production swaps to Firebase ID token
    verification; callers stay unchanged.
    """
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
