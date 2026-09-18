"""
GRAMSAARTHI — Scheme Pydantic Schemas
Based on the official Government Schemes dataset.
"""

from typing import Any
from pydantic import BaseModel, Field


class SchemeBase(BaseModel):
    scheme_id: str
    scheme_name: str
    government_level: str
    categories: list[str] = []
    business_categories: list[str] = []
    eligibility_criteria: str
    eligibility_questions: list[str] = []
    source_url: str
    application_url: str

    # Presentation helpers
    short_description: str | None = None
    max_loan: str | None = None
    interest_rate: str | None = None
    subsidy: str | None = None


class SchemeDetail(SchemeBase):
    pass


class SchemeRecommendation(SchemeBase):
    match_score: int = Field(default=70, description="Match score between 0 and 100")
    relevance_reason: str = Field(default="", description="Why this scheme is recommended for user")
    eligibility_status: str = Field(
        default="Insufficient information",
        description="Likely eligible, Potentially eligible, Not eligible, Insufficient information",
    )
    why_eligible: str = Field(default="", description="Explanation of why user appears eligible or relevant")
    satisfied_conditions: list[str] = []
    missing_conditions: list[str] = []
    required_documents: list[str] = []
    benefits: str = Field(default="", description="Verified project-specific benefits and subsidies")
    next_action: str = Field(default="", description="Clear actionable next step for the entrepreneur")
    # Backwards-compatible aliases
    satisfied_criteria: list[str] = []
    unmet_criteria: list[str] = []
    missing_questions: list[str] = []


class SchemeListResponse(BaseModel):
    total: int
    schemes: list[SchemeRecommendation]


class UserAssessmentProfile(BaseModel):
    business: str | None = None
    business_interest: str | None = None
    ml_recommendation: str | None = None
    ml_top3: list[str] | None = None
    state: str | None = None
    district: str | None = None
    block: str | None = None
    village: str | None = None
    capital: int | float | None = None
    loan_needed: str | None = None
    experience: str | None = None
    resources: list[str] | None = None
    is_woman: bool | None = None
    is_sc_st: bool | None = None
    age: int | None = None
    gender: str | None = None
    occupation: str | None = None
    social_category: str | None = None
    annual_family_income: int | None = None
    special_categories: str | None = None
    has_land: bool | None = None
    has_bank_account: bool | None = None
    has_class_8: bool | None = None
    language: str | None = "en"
    # Phase 5: Financial & business context linkage
    project_cost: int | float | None = None
    investment: int | float | None = None
    loan_amount: int | float | None = None
    business_category: str | None = None
    subsidy_amount: int | float | None = None


class SchemeRecommendRequest(BaseModel):
    profile: UserAssessmentProfile | None = None


class EligibilityEvaluateRequest(BaseModel):
    scheme_id: str
    answers: dict[str, Any] = Field(default_factory=dict, description="Mapping of question index or text to Yes/No/Value")
    profile: UserAssessmentProfile | None = None


class EligibilityEvaluateResponse(BaseModel):
    scheme_id: str
    scheme_name: str
    eligibility_status: str  # Likely eligible, Potentially eligible, Not eligible, Insufficient information
    status_code: str         # likely_eligible, potentially_eligible, not_eligible, insufficient_information
    why_eligible: str = ""
    satisfied_conditions: list[str] = []
    missing_conditions: list[str] = []
    required_documents: list[str] = []
    benefits: str = ""
    next_action: str = ""
    # Backwards-compatible aliases
    status: str = ""
    satisfied_criteria: list[str] = []
    unmet_criteria: list[str] = []
    missing_questions: list[str] = []
    summary_note: str = ""
    disclaimer: str = (
        "Indicative guidance only. Never guarantees scheme approval or loan sanction. "
        "Final eligibility depends on official government guidelines, field verification, and bank credit appraisal."
    )

