"""User store backed by Postgres.

Passwords are stored as PBKDF2 hashes for local auth. With Firebase,
user records carry the Firebase authenticated email instead.
"""

import secrets

from sqlalchemy import text

from app.auth_security import hash_password
from app.db import get_engine


class UserAlreadyExists(Exception):
    pass


class UserNotFound(Exception):
    pass


def create_user(email: str, password: str, display_name: str = "") -> dict:
    """Create a user record with a hashed password and return public fields."""
    email = email.strip().lower()
    engine = get_engine()
    with engine.begin() as connection:
        existing = connection.execute(
            text("SELECT email FROM users WHERE email = :email"), {"email": email}
        ).fetchone()
        if existing is not None:
            raise UserAlreadyExists(email)
        salt = secrets.token_hex(16)
        connection.execute(
            text(
                "INSERT INTO users (email, display_name, password_salt, password_hash) "
                "VALUES (:email, :display_name, :salt, :hash)"
            ),
            {
                "email": email,
                "display_name": display_name,
                "salt": salt,
                "hash": hash_password(password, salt),
            },
        )
    return {"email": email, "display_name": display_name}


def get_user_record(email: str) -> dict:
    """Return the stored record including password fields, or raise."""
    email = email.strip().lower()
    engine = get_engine()
    with engine.connect() as connection:
        row = connection.execute(
            text(
                "SELECT email, display_name, password_salt, password_hash "
                "FROM users WHERE email = :email"
            ),
            {"email": email},
        ).fetchone()
    if row is None:
        raise UserNotFound(email)
    return {
        "email": row[0],
        "display_name": row[1],
        "password_salt": row[2],
        "password_hash": row[3],
    }


def get_or_create_firebase_user(email: str, display_name: str = "") -> dict:
    """Return the user for a Firebase authenticated email, creating if needed."""
    email = email.strip().lower()
    engine = get_engine()
    with engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO users (email, display_name) VALUES (:email, :display_name) "
                "ON CONFLICT (email) DO NOTHING"
            ),
            {"email": email, "display_name": display_name},
        )
    return {"email": email, "display_name": display_name}
