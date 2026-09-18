"""
GRAMSAARTHI — Admin Audit Log Model
Stores immutable chronological audit records of all administrative actions performed
by GRAMSAARTHI Owner/Administrator users (user status changes, document reviews, etc.).
"""

from datetime import datetime
from sqlalchemy import Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Performing administrator identity
    admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    admin_name: Mapped[str] = mapped_column(String(120), nullable=False, default="GRAMSAARTHI Administrator")

    # Action type
    # Actions: USER_SUSPENDED, USER_BLACKLISTED, USER_RESTORED, DOCUMENT_VERIFIED,
    #          DOCUMENT_REJECTED, DOCUMENT_REUPLOAD_REQUESTED, USER_VIEWED, DOCUMENT_VIEWED
    action: Mapped[str] = mapped_column(String(60), nullable=False, index=True)

    # Target user (if applicable)
    target_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    target_user_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    target_user_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Target document (if applicable)
    target_document_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    target_document_title: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # Administrative remarks, reasons, or details
    details: Mapped[str | None] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
