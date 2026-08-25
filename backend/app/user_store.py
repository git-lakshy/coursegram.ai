"""User store backed by Postgres.

User records carry the Firebase authenticated email; rows are created on
first authenticated request.
"""

from sqlalchemy import text

from app.db import get_engine


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
