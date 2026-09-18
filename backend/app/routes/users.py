"""
GRAMSAARTHI — User & Profile Routes

GET /api/user/profile             → Get user profile (authenticated user or demo fallback)
PUT /api/user/profile             → Update user profile
GET /api/user/profile/completion  → Get profile completion score & missing fields
GET /api/user/activity            → Get recent activity history
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import (
    UserDetailedProfileResponse,
    UserDetailedProfileUpdate,
    ProfileCompletionResponse,
)
from app.services.auth_service import get_current_user
from app.services import user_service
from app.services.profile_service import calculate_profile_completion

router = APIRouter()


@router.get(
    "/user/profile",
    response_model=UserDetailedProfileResponse,
    tags=["User"],
    summary="Get user profile",
)
def get_user_profile(
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get profile for the authenticated user.
    Falls back gracefully to demo user (id=1) if unauthenticated.
    """
    user = current_user or user_service.get_user_profile(db)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found. Please run init_db.py or log in.",
        )

    completion = calculate_profile_completion(user)
    user_data = UserDetailedProfileResponse.model_validate(user)
    user_data.completion_percentage = completion["percentage"]
    return user_data


@router.put(
    "/user/profile",
    response_model=UserDetailedProfileResponse,
    tags=["User"],
    summary="Update user profile",
)
def update_user_profile(
    updates: UserDetailedProfileUpdate,
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update profile fields for the authenticated user (or demo user).
    Only provided non-null fields are updated (PATCH semantics).
    """
    user = current_user or user_service.get_user_profile(db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    data = updates.model_dump(exclude_unset=True)

    # Handle aliases
    if "full_name" in data and not data.get("name"):
        data["name"] = data["full_name"]
    if "mobile_number" in data and not data.get("phone"):
        data["phone"] = data["mobile_number"]
    if "preferred_language" in data and not data.get("language"):
        data["language"] = data["preferred_language"]

    for field, value in data.items():
        if hasattr(user, field):
            setattr(user, field, value)

    # If capital or investment_capacity updated, sync both
    if "capital" in data and data["capital"] is not None:
        user.investment_capacity = data["capital"]
        user.business_investment = data["capital"]
    elif "investment_capacity" in data and data["investment_capacity"] is not None:
        user.capital = data["investment_capacity"]
        user.business_investment = data["investment_capacity"]

    db.commit()
    db.refresh(user)

    completion = calculate_profile_completion(user)
    user_data = UserDetailedProfileResponse.model_validate(user)
    user_data.completion_percentage = completion["percentage"]
    return user_data


@router.get(
    "/user/profile/completion",
    response_model=ProfileCompletionResponse,
    tags=["User"],
    summary="Get profile completion percentage & missing fields",
)
def get_profile_completion(
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Calculate and return the completion percentage, list of completed fields,
    and missing fields with recommended actions for the user dashboard & profile.
    """
    user = current_user or user_service.get_user_profile(db)
    res = calculate_profile_completion(user)
    return ProfileCompletionResponse(**res)


@router.get("/user/activity", tags=["User"], summary="Get recent user activities")
def get_activity(
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return recent activity history for current user (or demo user)."""
    uid = current_user.id if current_user else user_service.DEMO_USER_ID
    activities = user_service.get_recent_activities(db, user_id=uid)

    result = []
    for act in activities:
        time_str = _format_time(act.created_at)
        result.append({
            "id": act.id,
            "type": act.activity_type,
            "text": act.title,
            "time": time_str,
            "icon": act.icon or "📋",
        })

    return result


def _format_time(dt: datetime) -> str:
    """Convert a datetime to a human-readable relative string."""
    if dt is None:
        return "Recently"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    seconds = diff.total_seconds()
    if seconds < 3600:
        mins = int(seconds / 60)
        return f"{mins} minute{'s' if mins != 1 else ''} ago" if mins > 0 else "Just now"
    if seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = int(seconds / 86400)
    if days == 1:
        return "Yesterday"
    if days < 7:
        return f"{days} days ago"
    return dt.strftime("%d %b %Y")
