"""JSON file backed user store for local development.

Passwords are stored as PBKDF2 hashes, never in plaintext. In production
authentication moves to Firebase and this module is replaced by the
Firebase user record; the rest of the app only depends on the auth module.
"""

import json
import os
import secrets
from threading import Lock

from app.auth_security import hash_password

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
USERS_PATH = os.path.join(DATA_DIR, "users.json")

_lock = Lock()


class UserAlreadyExists(Exception):
    pass


class UserNotFound(Exception):
    pass


def _read_users() -> dict:
    if not os.path.exists(USERS_PATH):
        return {}
    try:
        with open(USERS_PATH, "r", encoding="utf-8") as file:
            payload = json.load(file)
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_users(users: dict) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp_path = USERS_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as file:
        json.dump(users, file, ensure_ascii=False, indent=2)
    os.replace(tmp_path, USERS_PATH)


def create_user(email: str, password: str, display_name: str = "") -> dict:
    """Create a user record with a hashed password and return it."""
    email = email.strip().lower()
    with _lock:
        users = _read_users()
        if email in users:
            raise UserAlreadyExists(email)
        record = {
            "email": email,
            "display_name": display_name,
            "password_salt": secrets.token_hex(16),
            "password_hash": "",
        }
        record["password_hash"] = hash_password(password, record["password_salt"])
        users[email] = record
        _write_users(users)
        return {k: v for k, v in record.items() if not k.startswith("password")}


def get_user_record(email: str) -> dict:
    """Return the full stored record including password fields, or raise."""
    email = email.strip().lower()
    with _lock:
        users = _read_users()
        if email not in users:
            raise UserNotFound(email)
        return users[email]
