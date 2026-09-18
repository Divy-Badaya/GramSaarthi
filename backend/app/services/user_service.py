"""
GRAMSAARTHI — User Service
Business logic for user profile and activity history.
"""

from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.activity import Activity
from app.schemas.user import UserProfileUpdate


# ── Constants ──────────────────────────────────────────────────────────────────

DEMO_USER_ID = 1   # The seeded demo user — used for all unauthenticated requests


# ── Profile ────────────────────────────────────────────────────────────────────

def get_user_profile(db: Session, user_id: int = DEMO_USER_ID) -> User | None:
    """Return a user by id."""
    return db.query(User).filter(User.id == user_id).first()


def update_user_profile(db: Session, updates: UserProfileUpdate, user_id: int = DEMO_USER_ID) -> User | None:
    """Apply partial updates to the demo user profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    data = updates.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


# ── Activity ───────────────────────────────────────────────────────────────────

def get_recent_activities(db: Session, user_id: int = DEMO_USER_ID, limit: int = 10) -> list[Activity]:
    """Return the most recent activities for a user, newest first."""
    return (
        db.query(Activity)
        .filter(Activity.user_id == user_id)
        .order_by(desc(Activity.created_at))
        .limit(limit)
        .all()
    )


def log_activity(
    db: Session,
    activity_type: str,
    title: str,
    description: str | None = None,
    icon: str | None = None,
    user_id: int = DEMO_USER_ID,
) -> Activity:
    """Create a new activity log entry."""
    activity = Activity(
        user_id=user_id,
        activity_type=activity_type,
        title=title,
        description=description,
        icon=icon,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity
