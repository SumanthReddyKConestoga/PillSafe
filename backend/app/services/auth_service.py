import uuid
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from jose import JWTError

from app.models.user import User, UserRole
from app.models.patient import Patient
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.config import settings
from app.core import redis as redis_module

logger = logging.getLogger(__name__)


class AuthError(Exception):
    def __init__(self, message: str, code: str = "AUTH_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


async def register_user(db: AsyncSession, payload: RegisterRequest) -> tuple[User, str, str]:
    result = await db.execute(select(User).where(User.email == payload.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise AuthError("An account with this email already exists.", code="EMAIL_TAKEN")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.PATIENT,
    )
    db.add(user)
    await db.flush()

    patient = Patient(
        user_id=user.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        date_of_birth=payload.date_of_birth,
        preferred_language=payload.preferred_language,
    )
    db.add(patient)
    await db.flush()

    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = create_refresh_token(str(user.id))
    logger.info("User registered", extra={"user_id": str(user.id), "email": user.email})
    return user, access_token, refresh_token


async def login_user(db: AsyncSession, payload: LoginRequest) -> tuple[User, str, str]:
    result = await db.execute(
        select(User)
        .options(selectinload(User.patient))
        .where(User.email == payload.email, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise AuthError("Invalid email or password.", code="INVALID_CREDENTIALS")

    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = create_refresh_token(str(user.id))
    logger.info("User logged in", extra={"user_id": str(user.id)})
    return user, access_token, refresh_token


async def logout_user(token: str) -> None:
    try:
        payload = decode_token(token)
        jti = payload.get("sub", "") + ":" + str(payload.get("iat", ""))
        exp = payload.get("exp", 0)
        now = int(datetime.now(timezone.utc).timestamp())
        ttl = max(exp - now, 1)
        await redis_module.blacklist_token(jti, ttl)
    except JWTError as exc:
        logger.warning("Logout attempted with invalid token: %s", exc)


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> tuple[str, str]:
    try:
        payload = decode_token(refresh_token)
    except JWTError as exc:
        raise AuthError("Invalid or expired refresh token.", code="INVALID_REFRESH_TOKEN") from exc

    if payload.get("type") != "refresh":
        raise AuthError("Token type mismatch.", code="TOKEN_TYPE_MISMATCH")

    user_id = payload.get("sub")
    result = await db.execute(
        select(User)
        .options(selectinload(User.patient))
        .where(User.id == uuid.UUID(user_id), User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise AuthError("User not found or inactive.", code="USER_NOT_FOUND")

    # Blacklist old refresh token
    jti = user_id + ":" + str(payload.get("iat", ""))
    exp = payload.get("exp", 0)
    now = int(datetime.now(timezone.utc).timestamp())
    ttl = max(exp - now, 1)
    await redis_module.blacklist_token(jti, ttl)

    new_access = create_access_token(str(user.id), user.role.value)
    new_refresh = create_refresh_token(str(user.id))
    return new_access, new_refresh


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.patient))
        .where(User.id == uuid.UUID(user_id), User.is_active == True)
    )
    return result.scalar_one_or_none()
