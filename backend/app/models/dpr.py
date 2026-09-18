"""
GRAMSAARTHI — Detailed Project Report (DPR) ORM Model
Stores structured DPR reports generated for authenticated users.
"""

from datetime import datetime
from typing import Any
from sqlalchemy import Integer, String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class DPR(Base):
    __tablename__ = "dprs"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Scoped strictly to the authenticated user
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Business profile link
    business_type: Mapped[str] = mapped_column(String(120), nullable=False)
    business_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # Linked assessment and finance records
    assessment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("assessments.id", ondelete="SET NULL"), nullable=True
    )
    finance_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("finances.id", ondelete="SET NULL"), nullable=True
    )

    # Status: 'generated' | 'needs_update' | 'draft'
    status: Mapped[str] = mapped_column(String(30), default="generated", nullable=False)

    # Hash or signature of finance values at the time of generation to detect staleness
    finance_snapshot_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Complete structured DPR document containing sections, promoter info, tables, and metadata
    report_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
