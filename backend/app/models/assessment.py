"""
GRAMSAARTHI — Assessment ORM Model
Stores each completed business assessment form submission.
"""

from datetime import datetime
from sqlalchemy import Integer, String, BigInteger, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Foreign key to users table (nullable for anonymous/demo use)
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Assessment inputs
    location: Mapped[str | None] = mapped_column(String(300), nullable=True)    # e.g. "Khajuri Kalan, Sehore"
    capital: Mapped[int | None] = mapped_column(BigInteger, nullable=True)       # in INR
    business_interest: Mapped[str | None] = mapped_column(String(100), nullable=True)
    experience: Mapped[str | None] = mapped_column(String(60), nullable=True)

    status: Mapped[str] = mapped_column(String(30), default="completed")

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
