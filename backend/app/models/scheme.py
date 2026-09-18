"""
GRAMSAARTHI — Scheme ORM Model
Government schemes for rural entrepreneurs.
"""

from datetime import datetime
from sqlalchemy import Integer, String, Float, BigInteger, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Scheme(Base):
    __tablename__ = "schemes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    benefit: Mapped[str | None] = mapped_column(String(400), nullable=True)

    # Loan details
    loan_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)   # max loan in INR
    loan_amount_label: Mapped[str | None] = mapped_column(String(40), nullable=True)   # e.g. "₹10 Lakh"
    interest_rate: Mapped[float | None] = mapped_column(Float, nullable=True)    # % p.a.
    interest_label: Mapped[str | None] = mapped_column(String(60), nullable=True)      # e.g. "7% – 9% p.a."
    tenure: Mapped[int | None] = mapped_column(Integer, nullable=True)           # months
    tenure_label: Mapped[str | None] = mapped_column(String(40), nullable=True)        # e.g. "5 years"

    eligibility: Mapped[str | None] = mapped_column(Text, nullable=True)   # JSON string or comma-separated
    who: Mapped[str | None] = mapped_column(String(300), nullable=True)
    docs: Mapped[str | None] = mapped_column(Text, nullable=True)          # JSON array as string
    tag: Mapped[str | None] = mapped_column(String(60), nullable=True)
    tag_color: Mapped[str | None] = mapped_column(String(20), nullable=True)

    state: Mapped[str | None] = mapped_column(String(120), nullable=True)  # None = national
    official_url: Mapped[str | None] = mapped_column(String(400), nullable=True)

    # Default match score for demo (will be computed dynamically in recommendation phase)
    default_match: Mapped[int] = mapped_column(Integer, default=70)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
