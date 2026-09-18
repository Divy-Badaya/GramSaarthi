"""
GRAMSAARTHI — DPR (Detailed Project Report) Pydantic Schemas
"""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field


class DPRSection(BaseModel):
    """Single section within the Detailed Project Report."""
    id: str
    title: str
    content: str
    table: list[dict[str, Any]] | None = None
    notes: str | None = None
    complete: bool = True
    order: int = 1


class DPRGenerateRequest(BaseModel):
    """Request to generate or regenerate a DPR."""
    language: str = "English"
    section_customizations: dict[str, str] | None = None


class DPRUpdateRequest(BaseModel):
    """Request to update notes or status of an existing DPR."""
    section_notes: dict[str, str] | None = None
    status: str | None = None


class DPRFinancialSummary(BaseModel):
    """Authoritative financial figures reused directly from Finance plan."""
    project_cost: int
    user_capital: int
    loan_amount: int
    margin_pct: float
    interest_rate: float
    loan_tenure: int
    moratorium: int
    emi: int
    subsidy_amount: int
    expected_monthly_revenue: int
    monthly_expenses: int
    monthly_profit: int
    annual_revenue: int
    annual_profit: int
    dscr: float
    break_even_month: int
    roi: float
    recommended_loan: int | None = None
    maximum_eligible_loan: int | None = None
    eligibility_status: str | None = None


class DPRStatusResponse(BaseModel):
    """Pre-flight check: determines whether the user is ready to generate a DPR."""
    ready: bool
    has_business: bool
    has_assessment: bool
    has_finance: bool
    business_name: str | None = None
    message: str
    next_step: str | None = None   # '/business' | '/business/assessment' | '/finance' | 'ready'
    existing_dpr_id: int | None = None
    dpr_status: str | None = None
    needs_regeneration: bool = False
    staleness_reason: str | None = None


class DPRResponse(BaseModel):
    """Complete DPR output consumed by DPR.jsx and PDF generator."""
    id: int
    user_id: int
    business_type: str
    business_name: str | None = None
    assessment_id: int | None = None
    finance_id: int | None = None
    status: str = "generated"      # 'generated' | 'needs_update' | 'draft'
    needs_regeneration: bool = False
    staleness_reason: str | None = None

    sections: list[DPRSection]
    financial_summary: dict[str, Any]
    promoter_summary: dict[str, Any]
    scheme_summary: dict[str, Any]

    created_at: datetime
    updated_at: datetime
