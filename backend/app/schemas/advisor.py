"""
GRAMSAARTHI — AI Advisor Pydantic Schemas
Includes user assessment context, conversation history, and active government scheme context.
"""

from typing import Any, Literal
from pydantic import BaseModel, Field


class SchemeContext(BaseModel):
    """
    Selected government scheme context passed when user asks about a specific scheme.
    Enables deep personalized advisory for eligibility, documents, subsidies, and application steps.
    """
    scheme_id: str | None = None
    scheme_name: str | None = None
    government_level: str | None = None
    category: str | None = None
    categories: list[str] | None = None
    business_categories: list[str] | None = None
    benefit: str | None = None
    benefits: str | None = None
    max_loan: str | None = None
    interest: str | None = None
    subsidy: str | None = None
    tenure: str | None = None
    who: str | None = None
    eligibility_criteria: str | None = None
    eligibility_questions: list[str] | None = None
    documents: list[str] | None = None
    docs: list[str] | None = None
    source_url: str | None = None
    application_url: str | None = None
    official_url: str | None = None

    # Evaluated user answers / status if questionnaire was completed
    user_eligibility_status: str | None = None
    status_code: str | None = None
    satisfied_criteria: list[str] | None = None
    unmet_criteria: list[str] | None = None
    missing_questions: list[str] | None = None
    user_answers: dict[str, Any] | None = None


class UserProfileContext(BaseModel):
    """
    User profile context passed with each advisor question.
    All fields optional — advisor degrades gracefully with partial info.
    """
    name: str | None = None
    location: str | None = None       # village / block (human-readable label)
    village: str | None = None        # village name
    block: str | None = None          # block / taluka name
    district: str | None = None       # district name — used by ML service
    state: str | None = None          # state name   — used by ML service
    capital: int | float | None = None  # available capital in INR
    investment_capacity: int | float | None = None  # alias for capital
    business_interest: str | None = None
    experience: str | None = None     # "Beginner" | "Intermediate" | "Expert"
    language: str | None = None       # preferred language code: "en" | "hi" | "gu"
    loan_needed: str | None = None    # "Yes" | "No" | "Not sure"
    resources: list[str] | None = None  # e.g. ["land", "livestock", "electricity"]
    is_woman: bool | None = None
    is_sc_st: bool | None = None
    age: int | None = None
    gender: str | None = None
    education: str | None = None
    occupation: str | None = None
    social_category: str | None = None
    annual_family_income: int | None = None
    annual_income_range: str | None = None
    business_status: str | None = None
    business_type: str | None = None
    skills: str | None = None
    ml_recommendation: str | None = None   # primary ML recommendation (English label)
    ml_top3: list[str] | None = None       # ML top-3 recommendations (English labels)
    ml_source: str | None = None           # "csv_lookup" | "fallback"
    scheme_context: SchemeContext | None = None


class ConversationMessage(BaseModel):
    """A single message in the conversation history."""
    role: Literal["user", "bot"]
    text: str


import re


class AdvisorRequest(BaseModel):
    """
    POST /api/advisor/ask & POST /api/advisor/voice
    Accepts typed or voice-transcribed query via `question`, `message`, or `transcript`.
    """
    question: str | None = None
    message: str | None = None         # Alias for question / chat input
    transcript: str | None = None      # Explicit alias for voice speech-to-text transcript
    language: str | None = None        # Language code: 'en' | 'hi' | 'gu'
    is_voice: bool = False             # Telemetry flag indicating speech-transcribed origin
    user_profile: UserProfileContext | None = None
    scheme_context: SchemeContext | None = None
    conversation_history: list[ConversationMessage] | None = None   # last N turns for context

    def get_effective_query(self) -> str:
        """Return the sanitized effective query text from transcript, message, or question."""
        text = self.transcript or self.message or self.question or ""
        # Sanitize control characters while preserving standard Indic and Latin text
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        return cleaned.strip()[:2500]


class VoiceAdvisorRequest(AdvisorRequest):
    """
    POST /api/advisor/voice
    Dedicated endpoint schema for speech-to-text transcribed queries.
    Inherits all fields from AdvisorRequest with is_voice defaulted to True.
    """
    is_voice: bool = True


class AdvisorResponse(BaseModel):
    """
    Response from the AI advisor.
    response: the advisor's reply text (may contain markdown)
    ml_used:  True if ML recommendation was included in the Gemini prompt
    gemini_used: True if the response was generated by Gemini
    scheme_used: True if specific government scheme context was included
    missing_fields: list of intent-specific fields needed if required info is missing
    updated_profile_fields: fields extracted and saved to user profile during conversation
    completion_percentage: current user profile completion score
    context_summary: dictionary of authenticated context modules injected into advisory (profile, assessment, finance, loan_eligibility, risk, dpr, roadmap, schemes)
    """
    response: str
    ml_used: bool = False
    gemini_used: bool = False
    scheme_used: bool = False
    missing_fields: list[str] | None = None
    updated_profile_fields: dict[str, Any] | None = None
    completion_percentage: int | None = None
    context_summary: dict[str, bool] | None = None

