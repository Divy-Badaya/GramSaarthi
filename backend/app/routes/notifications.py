"""
GRAMSAARTHI — Notifications API Routes
Endpoints for retrieving, creating, and marking notifications as read.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    NotificationCreate,
)
from app.services.auth_service import get_current_user
from app.services import notification_service, user_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Get user's notification list and unread count",
)
def get_notifications(
    limit: int = Query(50, ge=1, le=100),
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve notifications for the current authenticated user or demo user."""
    user = current_user or user_service.get_user_profile(db)
    user_id = user.id if user else None
    return notification_service.get_user_notifications(db=db, user_id=user_id, limit=limit)


@router.put(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark a single notification as read",
)
def mark_read(
    notification_id: int,
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read for the user."""
    user = current_user or user_service.get_user_profile(db)
    user_id = user.id if user else None
    notif = notification_service.mark_notification_read(
        db=db,
        notification_id=notification_id,
        user_id=user_id,
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    resp = NotificationResponse.model_validate(notif)
    resp.time_ago = notification_service.format_relative_time(notif.created_at)
    return resp


@router.put(
    "/read-all",
    summary="Mark all notifications as read",
)
def mark_all_read(
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all unread notifications for the user as read."""
    user = current_user or user_service.get_user_profile(db)
    user_id = user.id if user else None
    count = notification_service.mark_all_notifications_read(db=db, user_id=user_id)
    return {"marked_count": count, "message": f"{count} notifications marked as read."}


@router.post(
    "",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new notification (internal/admin)",
)
def create_notification_endpoint(
    payload: NotificationCreate,
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a notification for a target user or current user."""
    user = current_user or user_service.get_user_profile(db)
    target_user_id = payload.user_id or (user.id if user else None)

    notif = notification_service.create_notification(
        db=db,
        user_id=target_user_id,
        title=payload.title,
        message=payload.message,
        type=payload.type,
        link=payload.link,
    )
    resp = NotificationResponse.model_validate(notif)
    resp.time_ago = "Just now"
    return resp
