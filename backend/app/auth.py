"""Request authentication dependency for FastAPI.

Development uses locally issued signed tokens. Production uses Firebase
ID tokens; only verify_token in auth_security needs to change.
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth_security import InvalidToken, verify_token

import logging

logger = logging.getLogger("app.auth")

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_email(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Resolve and validate the bearer token, returning the user email."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        return verify_token(credentials.credentials)
    except InvalidToken as error:
        logger.warning("Token rejected: %s", error)
        raise HTTPException(status_code=401, detail=str(error))
