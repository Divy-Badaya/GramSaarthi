"""
GRAMSAARTHI — Business ORM Model
Stores business opportunity data used for recommendations.
"""

from datetime import datetime
from sqlalchemy import Integer, String, BigInteger, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    emoji: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # Investment range in INR (e.g. 800000 = ₹8L)
    investment_min: Mapped[int] = mapped_column(BigInteger, default=0)
    investment_max: Mapped[int] = mapped_column(BigInteger, default=0)

    # Monthly profit range in INR
    profit_min: Mapped[int] = mapped_column(BigInteger, default=0)
    profit_max: Mapped[int] = mapped_column(BigInteger, default=0)

    # Human-readable labels (match frontend mock shape)
    investment_label: Mapped[str | None] = mapped_column(String(60), nullable=True)   # e.g. "₹8–12 Lakh"
    profit_label: Mapped[str | None] = mapped_column(String(60), nullable=True)       # e.g. "₹40–60K/month"

    demand: Mapped[str] = mapped_column(String(30), default="Medium")       # Low / Medium / High / Very High
    competition: Mapped[str] = mapped_column(String(30), default="Medium")  # Low / Medium / High / Very High
    risk: Mapped[str] = mapped_column(String(30), default="Medium")         # Low / Medium / High

    location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    score: Mapped[int] = mapped_column(Integer, default=70)   # 0–100

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
