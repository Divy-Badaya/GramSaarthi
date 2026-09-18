"""
GRAMSAARTHI — Authentication Service
Handles password hashing (PBKDF2-HMAC-SHA256), JWT token issuance/verification,
OTP generation/validation, and FastAPI user security dependencies.
"""

import os
import time
import random
import hashlib
import logging
from datetime import datetime, timedelta, timezone
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.models.user import User

logger = logging.getLogger(__name__)

# ── Cryptographic & JWT Config ────────────────────────────────────────────────
SECRET_KEY = getattr(settings, "JWT_SECRET_KEY")
ALGORITHM = getattr(settings, "JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_DAYS = getattr(settings, "ACCESS_TOKEN_EXPIRE_DAYS", 7)

# In-memory OTP storage: mobile_number -> {"otp": str, "expires_at": float}
_OTP_CACHE: dict[str, dict] = {}

security = HTTPBearer(auto_error=False)


# ── Password Hashing (PBKDF2-HMAC-SHA256) ──────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash password using salted PBKDF2-HMAC-SHA256 (100,000 rounds)."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(password: str, hashed: str | None) -> bool:
    """Verify password against stored salt:hash string."""
    if not hashed or ":" not in hashed:
        return False
    try:
        salt_hex, key_hex = hashed.split(":", 1)
        salt = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return key.hex() == key_hex
    except Exception as exc:
        logger.warning("[AUTH] Password verification exception: %s", exc)
        return False


# ── JWT Token Handling ────────────────────────────────────────────────────────

def create_access_token(user_id: int, extra_data: dict | None = None) -> str:
    """Create a signed JWT access token valid for 7 days."""
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if extra_data:
        payload.update(extra_data)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Validate and decode JWT token. Returns payload dict or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError as exc:
        logger.debug("[AUTH] Invalid JWT token: %s", exc)
        return None


# ── OTP Management ────────────────────────────────────────────────────────────

def clean_mobile_number(raw: str) -> str:
    """Strip spaces, dashes, +91 prefix and return 10-digit number."""
    cleaned = str(raw).strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    return cleaned


def send_or_generate_otp(mobile_number: str) -> str:
    """
    Generate a 6-digit OTP valid for 10 minutes.
    In production, this would trigger an SMS gateway.
    In this prototype, it stores in memory and returns the OTP for easy dev testing.
    """
    phone = clean_mobile_number(mobile_number)
    otp = f"{random.randint(100000, 999999)}"
    _OTP_CACHE[phone] = {
        "otp": otp,
        "expires_at": time.time() + 600,  # 10 minutes
    }
    logger.info("[AUTH] Generated OTP %s for %s", otp, phone)
    print(f"[GRAMSAARTHI OTP] Generated OTP for {phone}: {otp}")
    return otp


def verify_otp(mobile_number: str, otp: str) -> bool:
    """
    Validate provided OTP for the given mobile number.
    Supports standard demo OTP '123456' for rapid evaluation or testing.
    """
    phone = clean_mobile_number(mobile_number)
    submitted = str(otp).strip()

    # Universal prototype test OTP
    if submitted == "123456":
        return True

    entry = _OTP_CACHE.get(phone)
    if not entry:
        return False

    if time.time() > entry["expires_at"]:
        _OTP_CACHE.pop(phone, None)
        return False

    if entry["otp"] == submitted:
        _OTP_CACHE.pop(phone, None)
        return True

    return False


# ── FastAPI Dependencies ──────────────────────────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    """
    FastAPI dependency: Extract user from Authorization Bearer token.
    Returns User if valid token, or None if unauthenticated.
    """
    if not credentials or not credentials.credentials:
        return None

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None

    try:
        user_id = int(payload["sub"])
        user = db.query(User).filter(
            User.id == user_id,
            User.is_active == True,
            User.status == "ACTIVE",
        ).first()
        return user
    except Exception:
        return None


def get_current_user_required(
    current_user: User | None = Depends(get_current_user),
) -> User:
    """
    FastAPI dependency: Requires authenticated user or raises HTTP 401.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_user_required),
) -> User:
    """
    FastAPI dependency: Requires authenticated GRAMSAARTHI Administrator / Owner.
    Raises HTTP 403 Forbidden if current user is not authorized.
    """
    is_admin = getattr(current_user, "is_admin", False)
    role = str(getattr(current_user, "role", "user")).strip().lower()
    if not is_admin and role not in ("admin", "owner", "administrator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Authorized GRAMSAARTHI Administrator role required.",
        )
    return current_user

