"""
GRAMSAARTHI — Notification Service
Business logic for managing, creating, and updating user & admin notifications.
"""

from datetime import datetime, timezone
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.schemas.notification import NotificationResponse, NotificationListResponse


def format_relative_time(dt: datetime | None) -> str:
    """Format a datetime into a friendly relative time string."""
    if dt is None:
        return "Recently"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    seconds = max(0, diff.total_seconds())
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        mins = int(seconds / 60)
        return f"{mins}m ago"
    if seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours}h ago"
    days = int(seconds / 86400)
    if days == 1:
        return "Yesterday"
    if days < 7:
        return f"{days}d ago"
    return dt.strftime("%d %b %Y")


def get_user_notifications(
    db: Session,
    user_id: int | None = None,
    limit: int = 50,
) -> NotificationListResponse:
    """
    Fetch notifications targeted to a user or broad system announcements.
    Includes both read and unread items, ordered by creation date descending.
    """
    query = db.query(Notification)
    if user_id is not None:
        query = query.filter(
            or_(Notification.user_id == user_id, Notification.user_id.is_(None))
        )

    total = query.count()
    unread_count = query.filter(Notification.is_read.is_(False)).count()

    raw_items = query.order_by(desc(Notification.created_at)).limit(limit).all()

    items = []
    for item in raw_items:
        resp = NotificationResponse.model_validate(item)
        resp.time_ago = format_relative_time(item.created_at)
        items.append(resp)

    return NotificationListResponse(
        items=items,
        unread_count=unread_count,
        total=total,
    )


def mark_notification_read(
    db: Session,
    notification_id: int,
    user_id: int | None = None,
) -> Notification | None:
    """Mark a specific notification as read."""
    query = db.query(Notification).filter(Notification.id == notification_id)
    if user_id is not None:
        query = query.filter(
            or_(Notification.user_id == user_id, Notification.user_id.is_(None))
        )

    notif = query.first()
    if notif and not notif.is_read:
        notif.is_read = True
        notif.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(notif)
    return notif


def mark_all_notifications_read(
    db: Session,
    user_id: int | None = None,
) -> int:
    """Mark all unread notifications for this user as read."""
    query = db.query(Notification).filter(Notification.is_read.is_(False))
    if user_id is not None:
        query = query.filter(
            or_(Notification.user_id == user_id, Notification.user_id.is_(None))
        )

    unread_items = query.all()
    count = len(unread_items)
    now = datetime.now(timezone.utc)
    for item in unread_items:
        item.is_read = True
        item.read_at = now

    if count > 0:
        db.commit()

    return count


def create_notification(
    db: Session,
    user_id: int | None,
    title: str,
    message: str,
    type: str = "system",
    link: str | None = None,
) -> Notification:
    """Create and persist a new notification."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link,
        is_read=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif
