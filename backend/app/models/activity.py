"""
GRAMSAARTHI — Activity ORM Model
Tracks user activity history (assessments, scheme views, DPR saves, etc.)
"""

from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Foreign key to users (nullable for demo use)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    activity_type: Mapped[str] = mapped_column(String(60), nullable=False)  # assessment / scheme / dpr / loan
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)     # emoji icon

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
