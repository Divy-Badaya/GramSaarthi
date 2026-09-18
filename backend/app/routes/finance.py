"""
GRAMSAARTHI — Finance Routes
Endpoints for user-specific financial plan retrieval, calculation, editing,
scheme matching, and estimated loan eligibility.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.schemas.finance import (
    FinanceCalculateRequest,
    FinanceUpdateRequest,
    FinanceResponse,
    LoanEligibilityResponse,
    ComprehensiveAssessmentRequest,
    ComprehensiveAssessmentResponse,
    FinancialFeasibilitySummary,
    RiskAnalysisResponse,
    SimulationRequest,
    SimulationResponse,
    ScenarioCompareRequest,
    ScenarioCompareResponse,
)
from app.services.auth_service import get_current_user, get_current_user_required
from app.services import finance_service, scheme_service, loan_eligibility_service, risk_analysis_service, simulation_service
from app.schemas.scheme import UserAssessmentProfile

router = APIRouter(prefix="/finance", tags=["Finance"])


@router.get(
    "/me",
    response_model=FinanceResponse,
    summary="Get authenticated user's financial plan",
)
def get_my_finance(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Retrieve the financial plan for the currently authenticated user.
    Returns 404 if the user has not completed an assessment or generated a plan.
    Strictly scoped to current_user.id — never leaks demo or other user data.
    """
    record = finance_service.get_or_create_user_finance_from_assessment(db, current_user)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No financial plan found. Please complete your business assessment first.",
        )

    # Re-generate dynamic curve and bridge
    plan = finance_service.calculate_financial_plan(
        business_type=record.business_type,
        business_name=record.business_name,
        user_capital=record.user_capital,
        project_cost=record.project_cost,
        loan_amount=record.loan_amount,
        interest_rate=record.interest_rate,
        loan_tenure=record.loan_tenure,
        moratorium=record.moratorium,
        user_profile=current_user,
        status=record.status,
    )
    plan["id"] = record.id
    plan["user_id"] = record.user_id
    plan["status"] = record.status

    return FinanceResponse(**plan)


@router.post(
    "/calculate",
    response_model=FinanceResponse,
    summary="Calculate financial metrics dynamically",
)
def calculate_finance(
    req: FinanceCalculateRequest,
    current_user: User | None = Depends(get_current_user),
):
    """
    Compute financial projection on-the-fly.
    Uses the centralized calculation engine and official scheme matching.
    Does not automatically save to database unless requested.
    """
    try:
        plan = finance_service.calculate_financial_plan(
            business_type=req.business_type,
            user_capital=req.user_capital,
            project_cost=req.project_cost,
            loan_amount=req.loan_amount,
            interest_rate=req.interest_rate,
            loan_tenure=req.loan_tenure,
            moratorium=req.moratorium,
            user_profile=current_user,
            status="draft",
        )
        return FinanceResponse(**plan)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.put(
    "/me",
    response_model=FinanceResponse,
    summary="Update and finalize authenticated user's financial plan",
)
def update_my_finance(
    req: FinanceUpdateRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Update financial parameters (capital, project cost, loan, tenure) for the
    authenticated user and finalize the plan (status='finalized').
    """
    existing = finance_service.get_user_finance(db, current_user.id)
    biz_type = (
        req.business_type
        or (existing.business_type if existing else None)
        or current_user.business_type
        or current_user.business_interest
        or "Rural Business"
    )
    capital = (
        req.user_capital
        if req.user_capital is not None
        else (existing.user_capital if existing else (current_user.capital or 100000))
    )

    project_cost = req.project_cost if req.project_cost is not None else (existing.project_cost if existing else None)
    loan_amount = req.loan_amount if req.loan_amount is not None else (existing.loan_amount if existing else None)
    interest_rate = req.interest_rate if req.interest_rate is not None else (existing.interest_rate if existing else None)
    loan_tenure = req.loan_tenure if req.loan_tenure is not None else (existing.loan_tenure if existing else None)
    moratorium = req.moratorium if req.moratorium is not None else (existing.moratorium if existing else None)

    try:
        plan = finance_service.calculate_financial_plan(
            business_type=biz_type,
            user_capital=capital,
            project_cost=project_cost,
            loan_amount=loan_amount,
            interest_rate=interest_rate,
            loan_tenure=loan_tenure,
            moratorium=moratorium,
            user_profile=current_user,
            status=req.status or "finalized",
        )
        if req.business_name:
            plan["business_name"] = req.business_name
        record = finance_service.save_or_update_user_finance(
            db=db,
            user_id=current_user.id,
            data=plan,
            status=req.status or "finalized",
        )
        plan["id"] = record.id
        plan["user_id"] = record.user_id
        plan["status"] = record.status
        return FinanceResponse(**plan)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get(
    "/schemes",
    summary="Get government schemes matched to user's finance plan",
)
def get_finance_schemes(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Return government schemes suited for the user's specific business type,
    project size, and loan requirement.
    """
    record = finance_service.get_or_create_user_finance_from_assessment(db, current_user)
    biz = record.business_type if record else (current_user.business_type or "Rural Business")
    cap = record.user_capital if record else (current_user.capital or 0)

    profile = UserAssessmentProfile(
        business=biz,
        business_interest=biz,
        capital=cap,
        loan_needed="yes",
        gender=current_user.gender,
        social_category=current_user.social_category,
        state=current_user.state,
        district=current_user.district,
        has_land=current_user.has_land,
    )
    return scheme_service.recommend_schemes(profile)


@router.get(
    "/eligibility",
    response_model=LoanEligibilityResponse,
    summary="Check estimated bank loan eligibility",
)
def check_loan_eligibility(
    user_capital: int | None = None,
    requested_loan: int | None = None,
    existing_debt: int = 0,
    existing_emi: int = 0,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Evaluate comprehensive bank loan eligibility using multi-constraint banking rules,
    repayment cash flow capacity, own equity contribution, business suitability,
    existing debt service, and official government scheme matching.
    Strictly scoped to current_user.id.
    """
    result = loan_eligibility_service.evaluate_user_loan_eligibility(
        db=db,
        current_user=current_user,
        override_capital=user_capital,
        override_loan=requested_loan,
        existing_debt=existing_debt,
        existing_emi=existing_emi,
    )
    return LoanEligibilityResponse(**result)


@router.post(
    "/comprehensive-assessment",
    response_model=ComprehensiveAssessmentResponse,
    summary="Evaluate connected Financial Feasibility, Loan Assessment, and 8-Factor Risk Analysis",
)
def evaluate_comprehensive_assessment(
    req: ComprehensiveAssessmentRequest,
    current_user: User | None = Depends(get_current_user),
):
    """
    Unified Phase 4 Connected Intelligence Endpoint:
    Connects selected business recommendations with actual:
    1. Financial Feasibility (actual investment, revenue, expenses, margin, assumptions)
    2. Bank Loan Assessment (estimated investment, own contribution, funding required, status, conditions)
    3. Multi-Dimensional Risk Analysis (Capital, Loan, Repayment, Market, Skill, Operating Cost, Sensitivity, Scalability)
    """
    try:
        # Step 1: Financial plan calculation (single source of truth)
        plan = finance_service.calculate_financial_plan(
            business_type=req.business_type,
            business_name=req.business_name,
            user_capital=req.user_capital,
            project_cost=req.project_cost,
            loan_amount=req.loan_amount,
            interest_rate=req.interest_rate,
            loan_tenure=req.loan_tenure,
            moratorium=req.moratorium,
            user_profile=current_user,
            status="draft",
        )

        # Step 2: Financial feasibility extraction
        feasibility_data = finance_service.get_financial_feasibility_summary(plan)

        # Step 3: Bank loan eligibility connection
        loan_data = loan_eligibility_service.evaluate_plan_loan_eligibility(
            plan=plan,
            user_profile=current_user,
            existing_debt=req.existing_debt,
            existing_emi=req.existing_emi,
        )

        # Step 4: 8-factor risk analysis
        risk_data = risk_analysis_service.evaluate_business_risks(
            financial_plan=plan,
            user_profile=current_user,
            experience_override=req.experience,
        )

        return ComprehensiveAssessmentResponse(
            business_type=plan["business_type"],
            business_name=plan["business_name"],
            financial_feasibility=FinancialFeasibilitySummary(**feasibility_data),
            loan_assessment=LoanEligibilityResponse(**loan_data),
            risk_analysis=RiskAnalysisResponse(**risk_data),
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get(
    "/comprehensive-assessment",
    response_model=ComprehensiveAssessmentResponse,
    summary="Get authenticated user's active Comprehensive Assessment",
)
def get_my_comprehensive_assessment(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Evaluate the full connected chain (Feasibility + Loan + Risk) for the authenticated user's
    active business profile and assessment.
    """
    finance_rec = finance_service.get_or_create_user_finance_from_assessment(db, current_user)
    if not finance_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business assessment found. Please complete an assessment first.",
        )

    plan = finance_service.calculate_financial_plan(
        business_type=finance_rec.business_type,
        business_name=finance_rec.business_name,
        user_capital=finance_rec.user_capital,
        project_cost=finance_rec.project_cost,
        loan_amount=finance_rec.loan_amount,
        interest_rate=finance_rec.interest_rate,
        loan_tenure=finance_rec.loan_tenure,
        moratorium=finance_rec.moratorium,
        user_profile=current_user,
        status=finance_rec.status,
    )

    feasibility_data = finance_service.get_financial_feasibility_summary(plan)
    loan_data = loan_eligibility_service.evaluate_user_loan_eligibility(
        db=db,
        current_user=current_user,
    )
    risk_data = risk_analysis_service.evaluate_business_risks(
        financial_plan=plan,
        user_profile=current_user,
    )

    return ComprehensiveAssessmentResponse(
        business_type=plan["business_type"],
        business_name=plan["business_name"],
        financial_feasibility=FinancialFeasibilitySummary(**feasibility_data),
        loan_assessment=LoanEligibilityResponse(**loan_data),
        risk_analysis=RiskAnalysisResponse(**risk_data),
    )


# ── Phase 6: What-If Simulation Endpoints ────────────────────────────────────

@router.post(
    "/simulate",
    response_model=SimulationResponse,
    summary="Simulate what-if financial scenario with variable inputs",
)
def simulate_what_if(
    req: SimulationRequest,
    current_user: User | None = Depends(get_current_user),
):
    """
    Simulate what-if scenarios by interactively adjusting investment outlay, own capital,
    loan amount, operational scale, revenue sensitivity, and cost parameters.
    Reuses central financial, loan eligibility, and risk analysis services.
    """
    try:
        return simulation_service.simulate_scenario(params=req, user_profile=current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.post(
    "/simulate/compare",
    response_model=ScenarioCompareResponse,
    summary="Compare 2 to 4 what-if scenarios side-by-side",
)
def compare_what_if_scenarios(
    req: ScenarioCompareRequest,
    current_user: User | None = Depends(get_current_user),
):
    """
    Compare multiple what-if scenarios (e.g., Dairy vs Poultry, or ₹2L vs ₹5L investment).
    Generates side-by-side comparison table, trade-off insights, and a recommendation.
    """
    try:
        return simulation_service.compare_scenarios(req=req, user_profile=current_user)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

