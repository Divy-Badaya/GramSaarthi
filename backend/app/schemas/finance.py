"""
GRAMSAARTHI — Finance Pydantic Schemas
Strict validation, canonical snake_case models, and camelCase UI bridge.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Any


class MonthlyProjection(BaseModel):
    month: str
    revenue: int
    fixed_expense: int = 0
    variable_expense: int = 0
    expense: int
    expenses: int | None = None
    operating_profit: int = 0
    emi: int = 0
    net_profit: int | None = None
    net_cash_flow: int = 0
    outstanding_loan: int = 0


class YearlyProjection(BaseModel):
    year: int
    revenue: int
    expenses: int
    profit: int
    debt_service: int
    net_cash_flow: int


class AmortizationRow(BaseModel):
    month: int
    principal: int
    interest: int
    balance: int


class FinanceCalculateRequest(BaseModel):
    business_type: str = Field(..., description="Selected business interest or category")
    user_capital: int = Field(..., ge=0, description="Capital contribution in INR")
    project_cost: int | None = Field(None, ge=0, description="Total project cost in INR (optional)")
    loan_amount: int | None = Field(None, ge=0, description="Loan required in INR (optional)")
    interest_rate: float | None = Field(None, ge=0.0, le=50.0, description="Annual interest rate % (optional)")
    loan_tenure: int | None = Field(None, ge=1, le=360, description="Loan tenure in months (optional)")
    moratorium: int | None = Field(None, ge=0, le=60, description="Moratorium in months (optional)")

    @field_validator("business_type")
    @classmethod
    def validate_biz(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("business_type cannot be empty")
        return s


class ComprehensiveAssessmentRequest(FinanceCalculateRequest):
    business_name: str | None = None
    existing_debt: int = 0
    existing_emi: int = 0
    experience: str | None = None


class FinanceUpdateRequest(BaseModel):
    business_type: str | None = None
    business_name: str | None = None
    project_cost: int | None = Field(None, ge=0)
    user_capital: int | None = Field(None, ge=0)
    loan_amount: int | None = Field(None, ge=0)
    interest_rate: float | None = Field(None, ge=0.0, le=50.0)
    loan_tenure: int | None = Field(None, ge=1, le=360)
    moratorium: int | None = Field(None, ge=0, le=60)
    status: str | None = Field(None, description="'draft' or 'finalized'")


class FinanceResponse(BaseModel):
    # Identification
    id: int | None = None
    user_id: int | None = None
    business_type: str
    business_name: str | None = None

    # Canonical snake_case financial fields
    project_cost: int
    user_capital: int
    loan_amount: int
    margin_pct: float
    interest_rate: float
    loan_tenure: int
    moratorium: int
    emi: int
    total_repayment: int
    total_interest: int
    processing_fee: int

    # Operating financials & breakdown
    expected_monthly_revenue: int
    monthly_expenses: int
    fixed_monthly_expenses: int = 0
    variable_monthly_expenses: int = 0
    monthly_profit: int
    annual_revenue: int
    annual_profit: int
    profit_margin: float = 0.0
    break_even_revenue: int = 0
    contribution_margin_pct: float = 0.0

    # Debt service metrics
    annual_debt_obligation: int
    annual_cfads: int
    dscr: float
    break_even_month: int
    roi: float

    # Scheme / Subsidy linkage
    subsidy_amount: int = 0
    subsidy_percentage: float = 0.0
    matched_scheme_id: str | None = None
    matched_scheme_name: str | None = None

    # Lifecycle status: 'draft' vs 'finalized'
    status: str = "draft"

    # Dynamic projection data
    revenue_projections: list[MonthlyProjection] = []
    projections_12m: list[MonthlyProjection] = []
    monthly_projections: list[MonthlyProjection] = []
    yearly_projections: list[YearlyProjection] = []
    amortization_schedule: list[AmortizationRow] = []
    capex_breakdown: dict[str, int] = {}
    net_monthly_profit: int | None = None

    # ── UI camelCase Compatibility Bridge ─────────────────────────────────────
    margin: int
    projectCost: int
    loan: int
    interestRate: float
    tenure: int
    breakEven: int
    scheme: str | None = None
    monthlyRevenue: int | None = None
    monthlyExpenses: int | None = None
    monthlyProfit: int | None = None
    totalRepayment: int | None = None
    totalInterest: int | None = None
    processingFee: int | None = None
    fixedExpenses: int | None = None
    variableExpenses: int | None = None
    profitMargin: float | None = None
    breakEvenRevenue: int | None = None
    contributionMarginPct: float | None = None
    yearlyProjections: list[YearlyProjection] = []

    model_config = ConfigDict(from_attributes=True)


class LoanEligibilityReason(BaseModel):
    text: str
    positive: bool


class LoanEligibilityResponse(BaseModel):
    status: str  # "Eligible" | "Potentially eligible" | "Not eligible" | "Insufficient information"
    status_key: str = "eligible"  # "eligible" | "partially_eligible" | "not_currently_eligible" | "insufficient_information"
    score: int
    eligibility_score: int = 70
    requested_loan: int = 0
    maximum_eligible_loan: int = 0
    recommended_loan: int = 0
    project_cost: int = 0
    user_capital: int = 0
    margin_pct: float = 0.0
    interest_rate: float = 7.0
    loan_tenure: int = 60
    moratorium: int = 6
    monthly_emi: int = 0
    dscr: float = 1.35
    monthly_profit: int = 0

    # Explicit Part 2 Loan Connection Fields
    estimated_investment: int | None = None
    own_contribution: int | None = None
    own_contribution_pct: float | None = None
    funding_requirement: int | None = None
    possible_loan_requirement: int | None = None
    eligibility_result: str | None = None
    important_conditions: list[str] = []

    factors: list[dict[str, Any]] = []
    positive_factors: list[str] = []
    limiting_factors: list[str] = []
    recommendations: list[str] = []
    reasons: list[LoanEligibilityReason] = []
    metrics: dict[str, Any] = {}
    matched_scheme: dict[str, Any] | None = None
    matched_schemes: list[dict[str, Any]] = []
    disclaimer: str


class RiskCategoryItem(BaseModel):
    category: str
    level: str  # "LOW" | "MEDIUM" | "HIGH" | "INSUFFICIENT DATA"
    reason: str
    mitigation: str
    score: int = 0


class RiskAnalysisResponse(BaseModel):
    overall_risk: str  # "LOW" | "MEDIUM" | "HIGH"
    overall_score: int = 50
    summary: str
    factors: list[RiskCategoryItem] = []


class FinancialFeasibilitySummary(BaseModel):
    is_feasible: bool
    feasibility_status: str  # "Highly Feasible" | "Feasible with Conditions" | "Financially Constrained"
    project_cost: int
    user_capital: int
    margin_pct: float
    monthly_revenue: int
    monthly_expenses: int
    fixed_monthly_expenses: int = 0
    variable_monthly_expenses: int = 0
    monthly_profit: int
    profit_margin: float = 0.0
    break_even_revenue: int = 0
    break_even_month: int = 0
    dscr: float = 0.0
    roi: float = 0.0
    production_scale: str = ""
    assumptions: list[str] = []


class ComprehensiveAssessmentResponse(BaseModel):
    business_type: str
    business_name: str
    financial_feasibility: FinancialFeasibilitySummary
    loan_assessment: LoanEligibilityResponse
    risk_analysis: RiskAnalysisResponse


# ── Phase 6: What-If Simulation & Scenario Comparison Schemas ───────────────

class SimulationRequest(BaseModel):
    business_type: str
    user_capital: int = Field(..., ge=0, description="Own promoter contribution in INR")
    project_cost: int | None = Field(None, ge=0, description="Total project investment outlay in INR")
    loan_amount: int | None = Field(None, ge=0, description="Requested bank term loan in INR")
    interest_rate: float | None = Field(None, ge=0.0, le=50.0, description="Annual interest rate percentage")
    loan_tenure: int | None = Field(None, ge=1, le=360, description="Loan tenure in months")
    moratorium: int | None = Field(None, ge=0, le=60, description="Moratorium period in months")
    revenue_multiplier: float | None = Field(1.0, ge=0.1, le=5.0, description="Revenue sensitivity factor (e.g. 0.8 to 1.2)")
    custom_monthly_revenue: int | None = Field(None, ge=0, description="Explicit monthly turnover in INR")
    expense_multiplier: float | None = Field(1.0, ge=0.1, le=5.0, description="Expense sensitivity factor (e.g. 0.9 to 1.3)")
    custom_monthly_expenses: int | None = Field(None, ge=0, description="Explicit monthly operational expense in INR")
    scale_units: int | None = Field(None, ge=1, description="Physical operational capacity units")
    label: str | None = Field(None, description="Scenario label for comparison (e.g. 'Baseline', 'Scenario A')")


class SimulationResponse(BaseModel):
    scenario_label: str
    business_type: str
    business_name: str
    project_cost: int
    user_capital: int
    margin_pct: float
    loan_amount: int
    interest_rate: float
    loan_tenure: int
    moratorium: int
    emi: int
    total_interest: int
    total_repayment: int
    expected_monthly_revenue: int
    monthly_revenue: int | None = None
    monthly_expenses: int
    fixed_monthly_expenses: int
    variable_monthly_expenses: int
    monthly_profit: int
    annual_revenue: int
    annual_profit: int
    profit_margin: float
    dscr: float
    break_even_month: int
    break_even_revenue: int
    roi: float
    scale_description: str
    loan_eligibility: dict[str, Any]
    risk_summary: dict[str, Any]
    matched_scheme: dict[str, Any]
    assumptions: list[str]


class ScenarioCompareRequest(BaseModel):
    scenarios: list[SimulationRequest] = Field(..., min_length=2, max_length=4)


class ScenarioCompareResponse(BaseModel):
    scenarios: list[SimulationResponse]
    comparison_table: list[dict[str, Any]]
    insights: list[str]
    recommended_scenario_label: str

