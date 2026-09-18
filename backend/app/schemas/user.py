"""
GRAMSAARTHI — User Pydantic Schemas
Defines request/response shapes for Auth, Progressive Profile, and Completeness.
"""

from typing import Any
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth Schemas ───────────────────────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    """Request body for POST /api/auth/send-otp."""
    mobile_number: str


class SendOtpResponse(BaseModel):
    """Response body for POST /api/auth/send-otp."""
    status: str = "success"
    message: str
    otp: str | None = None          # Sent in prototype/dev mode for testing ease
    expires_in: int = 600           # 10 minutes


class UserSignupRequest(BaseModel):
    """
    Mandatory 7 fields + optional email for initial sign up:
    1. full_name
    2. mobile_number
    3. otp
    4. password
    5. preferred_language
    6. state
    7. district
    Email is optional.
    """
    full_name: str
    mobile_number: str
    otp: str
    password: str
    preferred_language: str = "Hindi"
    state: str
    district: str
    email: str | None = None

    @field_validator("mobile_number")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        cleaned = v.strip().replace(" ", "").replace("-", "")
        if cleaned.startswith("+91"):
            cleaned = cleaned[3:]
        if not cleaned.isdigit() or len(cleaned) != 10:
            raise ValueError("Mobile number must be a valid 10-digit number")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v.strip()) < 4:
            raise ValueError("Password/PIN must be at least 4 characters")
        return v.strip()


class UserLoginRequest(BaseModel):
    """Request body for POST /api/auth/login."""
    identifier: str                 # Mobile number or email
    password: str


# ── Profile Completeness Schemas ───────────────────────────────────────────────

class CompletedFieldItem(BaseModel):
    key: str
    label: str
    value: Any = None


class MissingFieldItem(BaseModel):
    key: str
    label: str
    category: str
    icon: str | None = None


class ProfileCompletionResponse(BaseModel):
    """Visual progress report for dashboard & profile page."""
    percentage: int
    completed_fields: list[CompletedFieldItem]
    missing_fields: list[MissingFieldItem]
    message: str


# ── Detailed User Profile Schemas ──────────────────────────────────────────────

class UserDetailedProfileResponse(BaseModel):
    id: int
    name: str
    full_name: str | None = None
    phone: str | None = None
    mobile_number: str | None = None
    email: str | None = None
    language: str = "Hindi"
    preferred_language: str | None = None

    # Location
    state: str | None = None
    district: str | None = None
    block: str | None = None
    village: str | None = None
    rural_or_urban: str | None = None

    # Personal
    age: int | None = None
    gender: str | None = None
    education: str | None = None
    occupation: str | None = None

    # Eligibility
    social_category: str | None = None
    annual_family_income: int | None = None
    annual_income_range: str | None = None
    special_categories: str | None = None

    # Business
    business_status: str | None = None
    business_type: str | None = None
    business_name: str | None = None
    years_in_business: int | None = None
    monthly_revenue: int | None = None
    number_of_employees: int | None = None
    business_investment: int | None = None
    capital: int | None = None
    business_interest: str | None = None
    experience: str | None = None

    # Business Interests
    interested_business_types: str | None = None
    investment_capacity: int | None = None
    business_goals: str | None = None

    # Skills & Resources
    skills: str | None = None
    work_experience: str | None = None
    has_bank_account: bool | None = None
    has_land: bool | None = None
    has_commercial_space: bool | None = None
    has_equipment: bool | None = None
    other_relevant_resources: str | None = None

    # Preferences
    desired_opportunities: str | None = None
    preferred_business_location: str | None = None
    other_relevant_preferences: str | None = None

    # Role & Security
    is_admin: bool = False
    role: str = "user"

    # Derived
    completion_percentage: int = 0

    model_config = {"from_attributes": True}


class UserDetailedProfileUpdate(BaseModel):
    name: str | None = None
    full_name: str | None = None
    phone: str | None = None
    mobile_number: str | None = None
    email: str | None = None
    language: str | None = None
    preferred_language: str | None = None

    # Location
    state: str | None = None
    district: str | None = None
    block: str | None = None
    village: str | None = None
    rural_or_urban: str | None = None

    # Personal
    age: int | None = None
    gender: str | None = None
    education: str | None = None
    occupation: str | None = None

    # Eligibility
    social_category: str | None = None
    annual_family_income: int | None = None
    annual_income_range: str | None = None
    special_categories: str | None = None

    # Business
    business_status: str | None = None
    business_type: str | None = None
    business_name: str | None = None
    years_in_business: int | None = None
    monthly_revenue: int | None = None
    number_of_employees: int | None = None
    business_investment: int | None = None
    capital: int | None = None
    business_interest: str | None = None
    experience: str | None = None

    # Business Interests
    interested_business_types: str | None = None
    investment_capacity: int | None = None
    business_goals: str | None = None

    # Skills & Resources
    skills: str | None = None
    work_experience: str | None = None
    has_bank_account: bool | None = None
    has_land: bool | None = None
    has_commercial_space: bool | None = None
    has_equipment: bool | None = None
    other_relevant_resources: str | None = None

    # Preferences
    desired_opportunities: str | None = None
    preferred_business_location: str | None = None
    other_relevant_preferences: str | None = None


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserDetailedProfileResponse


# ── Backward Compatible Schemas ───────────────────────────────────────────────

class UserProfileResponse(BaseModel):
    """Maintained for backward compatibility."""
    id: int
    name: str
    village: str | None = None
    district: str | None = None
    state: str | None = None
    capital: int | None = None
    phone: str | None = None
    language: str = "Hindi"
    business_interest: str | None = None
    experience: str | None = None

    model_config = {"from_attributes": True}


class UserProfileUpdate(BaseModel):
    """Maintained for backward compatibility."""
    name: str | None = None
    phone: str | None = None
    village: str | None = None
    district: str | None = None
    state: str | None = None
    capital: int | None = None
    language: str | None = None
    business_interest: str | None = None
    experience: str | None = None


class ActivityItem(BaseModel):
    id: int
    type: str
    text: str
    time: str
    icon: str | None = None

    model_config = {"from_attributes": True}


class ActivityListResponse(BaseModel):
    activities: list[ActivityItem]
