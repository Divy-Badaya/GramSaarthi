"""
GRAMSAARTHI — Finance ORM Model
Stores authenticated user's calculated and personalized financial plan.
"""

from datetime import datetime
from sqlalchemy import Integer, String, BigInteger, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Finance(Base):
    __tablename__ = "finances"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Scoped strictly to the authenticated user
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Business profile link
    business_type: Mapped[str] = mapped_column(String(120), nullable=False)
    business_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # Project structure & capital
    project_cost: Mapped[int] = mapped_column(BigInteger, nullable=False)
    user_capital: Mapped[int] = mapped_column(BigInteger, nullable=False)
    loan_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    margin_pct: Mapped[float] = mapped_column(Float, nullable=False)

    # Loan parameters
    interest_rate: Mapped[float] = mapped_column(Float, nullable=False)
    loan_tenure: Mapped[int] = mapped_column(Integer, nullable=False)  # in months
    moratorium: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # in months
    emi: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Government scheme & subsidy linkage
    subsidy_amount: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    subsidy_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    matched_scheme_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    matched_scheme_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # Operating financials & profit
    expected_monthly_revenue: Mapped[int] = mapped_column(BigInteger, nullable=False)
    monthly_expenses: Mapped[int] = mapped_column(BigInteger, nullable=False)
    monthly_profit: Mapped[int] = mapped_column(BigInteger, nullable=False)
    annual_revenue: Mapped[int] = mapped_column(BigInteger, nullable=False)
    annual_profit: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # Debt service metrics
    annual_debt_obligation: Mapped[int] = mapped_column(BigInteger, nullable=False)
    annual_cfads: Mapped[int] = mapped_column(BigInteger, nullable=False)  # Cash Flow Available for Debt Service
    dscr: Mapped[float] = mapped_column(Float, nullable=False)
    break_even_month: Mapped[int] = mapped_column(Integer, nullable=False)
    roi: Mapped[float] = mapped_column(Float, nullable=False)

    # Status: 'draft' (generated from assessment) vs 'finalized' (confirmed by user)
    status: Mapped[str] = mapped_column(String(30), default="draft", nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
