"""
GRAMSAARTHI — User ORM Model
Organized into Basic, Personal, Eligibility, Business, Skills/Resources, and Preferences.
"""

from datetime import datetime
from sqlalchemy import Integer, String, BigInteger, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # ── Basic Information ──────────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(180), nullable=True, unique=True, index=True)
    language: Mapped[str] = mapped_column(String(60), default="Hindi", nullable=False)
    state: Mapped[str | None] = mapped_column(String(120), nullable=True)
    district: Mapped[str | None] = mapped_column(String(120), nullable=True)
    block: Mapped[str | None] = mapped_column(String(120), nullable=True)
    village: Mapped[str | None] = mapped_column(String(120), nullable=True)
    rural_or_urban: Mapped[str | None] = mapped_column(String(60), nullable=True)

    # ── Personal Information ───────────────────────────────────────────────────
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(60), nullable=True)
    education: Mapped[str | None] = mapped_column(String(100), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # ── Eligibility Information ───────────────────────────────────────────────
    social_category: Mapped[str | None] = mapped_column(String(60), nullable=True)
    annual_family_income: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    annual_income_range: Mapped[str | None] = mapped_column(String(100), nullable=True)
    special_categories: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Business Profile ───────────────────────────────────────────────────────
    business_status: Mapped[str | None] = mapped_column(String(100), nullable=True)
    business_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    business_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    years_in_business: Mapped[int | None] = mapped_column(Integer, nullable=True)
    monthly_revenue: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    number_of_employees: Mapped[int | None] = mapped_column(Integer, nullable=True)
    business_investment: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    capital: Mapped[int | None] = mapped_column(BigInteger, nullable=True)       # Keep for backward compatibility
    business_interest: Mapped[str | None] = mapped_column(String(100), nullable=True)
    experience: Mapped[str | None] = mapped_column(String(60), nullable=True)

    # ── Business Interests ─────────────────────────────────────────────────────
    interested_business_types: Mapped[str | None] = mapped_column(String(255), nullable=True)
    investment_capacity: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    business_goals: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Skills & Experience ────────────────────────────────────────────────────
    skills: Mapped[str | None] = mapped_column(String(255), nullable=True)
    work_experience: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Resources ──────────────────────────────────────────────────────────────
    has_bank_account: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    has_land: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    has_commercial_space: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    has_equipment: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    other_relevant_resources: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Preferences ────────────────────────────────────────────────────────────
    desired_opportunities: Mapped[str | None] = mapped_column(String(255), nullable=True)
    preferred_business_location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    other_relevant_preferences: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # ── Security & Metadata ────────────────────────────────────────────────────
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="user", nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False, index=True)  # ACTIVE, SUSPENDED, BLACKLISTED
    status_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    blacklist_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status_updated_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # ── Property Aliases for Compatibility ────────────────────────────────────
    @property
    def full_name(self) -> str:
        return self.name

    @full_name.setter
    def full_name(self, value: str):
        self.name = value

    @property
    def mobile_number(self) -> str | None:
        return self.phone

    @mobile_number.setter
    def mobile_number(self, value: str | None):
        self.phone = value

    @property
    def preferred_language(self) -> str:
        return self.language

    @preferred_language.setter
    def preferred_language(self, value: str):
        self.language = value

    @property
    def is_woman(self) -> bool:
        return str(self.gender).strip().lower() in ("female", "woman", "महिला")

    @property
    def is_sc_st(self) -> bool:
        return str(self.social_category).strip().upper() in ("SC", "ST")
