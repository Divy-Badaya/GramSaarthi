"""
GRAMSAARTHI — Document ORM Model
Stores metadata and secure storage references for user-uploaded documents and verification items.
"""

from datetime import datetime
from sqlalchemy import Integer, String, BigInteger, DateTime, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Display & categorization
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # Identity, Business, Financial, Loan, Government Scheme, DPR, Other

    # Stored file metadata (nullable if checklist item is in 'Missing' state)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Original client filename (sanitized)
    file_type: Mapped[str | None] = mapped_column(String(50), nullable=True)   # MIME type e.g. application/pdf, image/jpeg, image/png
    file_size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)   # In bytes
    storage_path: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Relative safe server storage path

    # Status & review notes
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="Missing", index=True)  # Missing, Uploaded, Pending Review, Needs Attention
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Manual Verification (GRAMSAARTHI Owner/Admin verification)
    verification_status: Mapped[str] = mapped_column(String(30), nullable=False, default="PENDING", index=True)  # PENDING, VERIFIED, REJECTED, REUPLOAD_REQUIRED
    verified_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    verification_remark: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class DocumentVerificationLog(Base):
    """
    Immutable audit record for every manual verification decision
    made by a GRAMSAARTHI Administrator.
    """
    __tablename__ = "document_verification_logs"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    admin_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    decision: Mapped[str] = mapped_column(String(30), nullable=False)  # VERIFIED, REJECTED, REUPLOAD_REQUIRED
    remark: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

