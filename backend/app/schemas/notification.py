"""
GRAMSAARTHI — Notification Pydantic Schemas
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None
    title: str
    message: str
    type: str
    link: str | None
    is_read: bool
    created_at: datetime
    read_at: datetime | None
    time_ago: str = ""


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int
    total: int


class NotificationCreate(BaseModel):
    user_id: int | None = None
    title: str
    message: str
    type: str = "system"
    link: str | None = None
