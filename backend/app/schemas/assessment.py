"""
GRAMSAARTHI — Assessment Pydantic Schemas

The assessment flow:
  1. Frontend POSTs to /api/assessments  (AssessmentRequest)
  2. Backend saves to DB, returns assessment_id
  3. Frontend POSTs to /api/recommend    (RecommendRequest)
  4. Backend returns recommendation result (RecommendResponse)
"""

from typing import Any
from pydantic import BaseModel, field_validator


# ── Assessment ─────────────────────────────────────────────────────────────────

class AssessmentRequest(BaseModel):
    """POST /api/assessments — save a completed assessment form."""
    location: str | None = None
    village: str | None = None
    block: str | None = None
    district: str | None = None
    state: str | None = None
    capital: int | None = None
    business_interest: str | None = None
    experience: str | None = None

    @field_validator("capital")
    @classmethod
    def capital_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("capital must be non-negative")
        return v


class AssessmentResponse(BaseModel):
    """Response after saving an assessment."""
    assessment_id: int
    status: str = "completed"


# ── Recommendation ─────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    """
    POST /api/recommend — request a business recommendation.
    Called by recommendationService.js → analyzeAssessment().
    """
    location: str | None = None
    village: str | None = None
    block: str | None = None
    district: str | None = None
    state: str | None = None
    capital: int | None = None
    business: str | None = None      # business category name e.g. "Dairy"
    experience: str | None = None    # Beginner / Intermediate / Expert


class MetricItem(BaseModel):
    """Single metric bar in the recommendation result."""
    name: str
    value: int     # 0–100
    label: str     # e.g. "High"
    color: str     # green / amber / blue / red


class ReasonItem(BaseModel):
    """Single reason row in the recommendation result."""
    label: str
    positive: bool


class LocationDetail(BaseModel):
    """Location breakdown."""
    village: str | None = None
    block: str | None = None
    district: str | None = None
    state: str | None = None


class ModelMetadata(BaseModel):
    """Provenance and version metadata for the ML prediction."""
    model: str = "HistGradientBoosting"
    model_version: str = "1.6.1"
    prediction_type: str = "hyper_local_opportunity_score"
    features_used: int = 327
    fallback_used: bool = False


class FactorItem(BaseModel):
    """Important positive or negative factor derived from actual features and rules."""
    title: str
    detail: str
    impact: str = "positive"  # "positive" | "negative"
    metric_source: str | None = None


class SuitabilityDimension(BaseModel):
    """Suitability assessment for Location, Investment, or User Profile."""
    score: int                  # 0–100
    label: str                  # e.g. "High", "Strong", "Moderate", "Caution"
    description: str
    details: dict[str, Any] | None = None


class FinancialFeasibilityIndicator(BaseModel):
    """Financial feasibility metric."""
    metric: str
    value: str
    benchmark: str | None = None
    assessment: str = "Viable"


class BusinessExplanation(BaseModel):
    """
    Complete explainable intelligence structure for a recommended business.
    Derived strictly from actual model features, district feature store percentiles,
    capital calculations, and explicit business rules.
    """
    business: str
    recommendation_score: int
    match_percentage: int
    positive_factors: list[FactorItem]
    negative_factors: list[FactorItem]
    location_suitability: SuitabilityDimension
    investment_suitability: SuitabilityDimension
    user_profile_suitability: SuitabilityDimension
    business_opportunity_indicators: list[dict[str, Any]] = []
    financial_feasibility: list[FinancialFeasibilityIndicator] = []
    risk_level: str = "Moderate"             # "Low" | "Moderate" | "High"
    risk_factors: list[str] = []
    assumptions: list[str] = []


class RecommendResponse(BaseModel):
    """
    Response for POST /api/recommend.
    Matches the DEMO_ASSESSMENT shape from mockData.js exactly,
    so BusinessAnalysis.jsx can render it without any changes.

    Additional ML fields:
      top3                   — top-3 business recommendations from ML model
      ml_source              — 'production_ml' | 'rf_model' | 'csv_lookup' | 'fallback'
      raw_opportunity_scores — raw 10 district opportunity scores from ML model
      model_info             — model provenance and metadata
      explanation            — comprehensive explainability breakdown for primary recommendation
      top3_explanations      — explainability breakdowns for top-3 recommendations
    """
    location: LocationDetail
    capital: int | None = None
    business: str
    score: int
    recommendation: str              # e.g. "Recommended"
    reasons: list[ReasonItem]
    metrics: list[MetricItem]
    # ML-specific optional fields
    top3: list[str] | None = None    # Top-3 business recommendations from ML
    ml_source: str | None = None     # 'production_ml' | 'rf_model' | 'csv_lookup' | 'fallback'
    raw_opportunity_scores: dict[str, float] | None = None
    model_info: ModelMetadata | None = None
    explanation: BusinessExplanation | None = None
    top3_explanations: list[BusinessExplanation] | None = None


# ── Dedicated Production ML Schemas ──────────────────────────────────────────

class ProductionMLRequest(BaseModel):
    """Request schema for testing the dedicated production ML model."""
    state: str
    district: str


class BusinessRecommendationItem(BaseModel):
    """Single ranked business recommendation item."""
    rank: int
    business: str
    target: str
    score: float


class ProductionMLResponse(BaseModel):
    """Structured response from the dedicated production ML model."""
    success: bool
    state: str
    district: str
    top3: list[str]
    ranked_recommendations: list[BusinessRecommendationItem]
    raw_scores: dict[str, float]
    scores_by_business: dict[str, float]
    metadata: dict[str, Any]


# ── Business Comparison Schemas ──────────────────────────────────────────────

class BusinessCompareRequest(BaseModel):
    """POST /api/businesses/compare — compare multiple businesses."""
    businesses: list[str]

    @field_validator("businesses")
    @classmethod
    def validate_businesses(cls, v):
        if len(v) < 2:
            raise ValueError("At least 2 businesses are required for comparison.")
        if len(v) > 4:
            raise ValueError("Maximum 4 businesses can be compared at once.")
        return v


class BusinessFinancialDetail(BaseModel):
    """Detailed financial metrics for a compared business."""
    project_cost: int = 0
    user_capital: int = 0
    loan_amount: int = 0
    monthly_revenue: int = 0
    monthly_expenses: int = 0
    monthly_profit: int = 0
    profit_margin: float = 0.0
    roi: float = 0.0
    break_even_months: int = 0
    emi: int = 0
    dscr: float = 0.0


class BusinessComparisonItem(BaseModel):
    """Per-business comparison data with scores and financial metrics."""
    business_type: str
    business_name: str
    category: str = ""
    overall_score: int = 50
    is_recommended: bool = False

    # Human-readable overview
    investment: str = "—"
    estimated_profit: str = "—"
    demand: str = "Medium"
    risk: str = "Medium"

    # Numeric scores (0–100, higher = better)
    market_demand_score: int = 50
    competition_score: int = 50
    profit_potential_score: int = 50
    location_fit_score: int = 50
    risk_score: int = 50
    low_investment_score: int = 50

    # Detailed financial breakdown
    financial: dict[str, Any] = {}

    # Error flag (if calculation failed for this business)
    error: bool | None = None


class RecommendedBusiness(BaseModel):
    """Summary of the recommended business from comparison."""
    id: str
    name: str
    overall_score: int
    reason: str


class BusinessCompareResponse(BaseModel):
    """Full comparison response with per-business metrics and recommendation."""
    recommended_business: RecommendedBusiness
    businesses: list[BusinessComparisonItem]
    has_ml_data: bool = False
    has_assessment: bool = False
    user_capital: int = 100000

