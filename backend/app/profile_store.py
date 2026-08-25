"""Persistence for per learner profiles.

Until a real database is introduced, profiles are stored as a JSON file
under app/data, keyed by the authenticated learner's email. Writes are
atomic so a crash mid write cannot corrupt stored data.
"""

import json
import os
from threading import Lock

from app.models import LearnerProfile

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "runtime")
PROFILES_PATH = os.path.join(DATA_DIR, "profiles.json")

_lock = Lock()


def _read_profiles() -> dict:
    if not os.path.exists(PROFILES_PATH):
        return {}
    try:
        with open(PROFILES_PATH, "r", encoding="utf-8") as file:
            payload = json.load(file)
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def load_profile(user_email: str) -> LearnerProfile:
    """Load the profile for a user, or return defaults when none exists."""
    with _lock:
        payload = _read_profiles().get(user_email)
    if not isinstance(payload, dict):
        return LearnerProfile()
    try:
        return LearnerProfile(**payload)
    except Exception:
        return LearnerProfile()


def save_profile(user_email: str, profile: LearnerProfile) -> LearnerProfile:
    """Persist the profile for a user atomically and return it."""
    with _lock:
        profiles = _read_profiles()
        profiles[user_email] = profile.model_dump()
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp_path = PROFILES_PATH + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as file:
            json.dump(profiles, file, ensure_ascii=False, indent=2)
        os.replace(tmp_path, PROFILES_PATH)
    return profile
