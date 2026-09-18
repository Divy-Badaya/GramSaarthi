"""
GRAMSAARTHI — Centralized Loan Eligibility Engine
Evaluates rural entrepreneur loan eligibility using multi-constraint banking rules,
repayment cash flow capacity, own equity contribution, business suitability,
existing debt service, and official government scheme matching.

Single source of truth: reuses the existing Finance calculation engine.
All user queries are strictly scoped to current_user.id.
"""

import math
import logging
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.finance import Finance
from app.models.assessment import Assessment
from app.services import finance_service, scheme_service, business_template_service
from app.schemas.scheme import UserAssessmentProfile

logger = logging.getLogger(__name__)


# ── Centralized Eligibility Rules Configuration ───────────────────────────────

ELIGIBILITY_RULES = {
    # Equity / Margin norms
    "MIN_MARGIN_PCT": 10.0,            # Standard RBI / Banking minimum margin for priority micro-enterprises
    "HEALTHY_MARGIN_PCT": 15.0,        # Preferred promoter equity buffer
    "EXCELLENT_MARGIN_PCT": 25.0,      # Premium equity contribution
    "CRITICAL_LOW_MARGIN_PCT": 5.0,    # Hard cutoff below which loan is unviable

    # Debt Service Coverage Ratio (DSCR = Annual CFADS / Annual Debt Service)
    "MIN_DSCR": 1.00,                  # Bare minimum breakeven cash flow
    "ACCEPTABLE_DSCR": 1.20,           # Standard commercial banking threshold for micro-enterprises
    "STRONG_DSCR": 1.40,               # Robust safety buffer
    "EXCELLENT_DSCR": 1.75,            # Superior repayment capability

    # Repayment capacity buffer (safety margin required when estimating maximum allowable EMI)
    "REPAYMENT_SAFETY_BUFFER": 1.25,   # Requires operational cash flow to cover allowable EMI by 1.25x

    # Maximum debt leverage relative to annual CFADS (Cash Flow Available for Debt Service)
    "MAX_DEBT_TO_ANNUAL_CFADS": 3.75,

    # Maximum allowable Fixed Obligation to Income Ratio (existing EMI + proposed EMI <= 50% of operating surplus)
    "MAX_FOIR": 0.50,

    # Maximum Loan to Cost (LTC) share funded by bank
    "MAX_LOAN_TO_COST_PCT": 0.90,

    # Standard ceiling for unsecured micro-enterprise credit in rural priority lending (Mudra Tarun / KCC)
    "MAX_UNSECURED_PRIORITY_LOAN": 2000000,  # ₹20 Lakh
}

DISCLAIMER_TEXT = (
    "GRAMSAARTHI Indicative Loan Eligibility Assessment. This assessment is an automated project-level estimate "
    "based on projected cash flows, own contribution, and verified business scale. Final loan sanction, margin "
    "stipulations, interest concessions, and disbursement remain at the sole discretion of the lending bank "
    "subject to credit appraisal, KYC, and document verification."
)


# ── Internal Calculation Helpers ──────────────────────────────────────────────

def _calculate_max_principal_from_emi(allowable_monthly_emi: float, annual_rate: float, tenure_months: int) -> int:
    """
    Reverse standard banking EMI formula to determine maximum principal loan
    supported by a given monthly debt service capacity.
    """
    if allowable_monthly_emi <= 0 or tenure_months <= 0:
        return 0

    r = (annual_rate / 100.0) / 12.0
    n = tenure_months

    if r <= 0:
        return round(allowable_monthly_emi * n)

    try:
        pow_rn = math.pow(1 + r, n)
        principal = allowable_monthly_emi * (pow_rn - 1) / (r * pow_rn)
        return max(0, round(principal))
    except (OverflowError, ValueError):
        return round(allowable_monthly_emi * n)


def _compute_eligibility_score(
    margin_pct: float,
    dscr: float,
    monthly_profit: int,
    has_experience: bool,
    has_assessment: bool,
    has_assets: bool,
    loan_within_cap: bool,
    existing_debt_ratio: float,
) -> int:
    """
    Transparent, weighted scoring (0–100 scale).
    - Own Contribution: 25 pts
    - Repayment Capacity (DSCR): 30 pts
    - Net Operational Profit: 20 pts
    - Business Viability & Assessment: 15 pts
    - Asset & Banking Readiness: 10 pts
    """
    score = 0

    # 1. Own Contribution (25 points)
    if margin_pct >= ELIGIBILITY_RULES["EXCELLENT_MARGIN_PCT"]:
        score += 25
    elif margin_pct >= ELIGIBILITY_RULES["HEALTHY_MARGIN_PCT"]:
        score += 20
    elif margin_pct >= ELIGIBILITY_RULES["MIN_MARGIN_PCT"]:
        score += 15
    elif margin_pct >= ELIGIBILITY_RULES["CRITICAL_LOW_MARGIN_PCT"]:
        score += 8
    else:
        score += 0

    # 2. DSCR / Repayment Capacity (30 points)
    if dscr >= ELIGIBILITY_RULES["STRONG_DSCR"]:
        score += 30
    elif dscr >= ELIGIBILITY_RULES["ACCEPTABLE_DSCR"]:
        score += 24
    elif dscr >= 1.10:
        score += 16
    elif dscr >= ELIGIBILITY_RULES["MIN_DSCR"]:
        score += 10
    else:
        score += 0

    # 3. Monthly Net Profitability (20 points)
    if monthly_profit >= 25000:
        score += 20
    elif monthly_profit >= 15000:
        score += 16
    elif monthly_profit >= 8000:
        score += 12
    elif monthly_profit > 0:
        score += 6
    else:
        score += 0

    # 4. Business Viability & Assessment (15 points)
    if has_assessment and has_experience:
        score += 15
    elif has_assessment:
        score += 11
    else:
        score += 6

    # 5. Asset & Banking Readiness (10 points)
    if has_assets:
        score += 10
    else:
        score += 5

    # Penalties for exceeding borrowing capacity or existing debt burden
    if not loan_within_cap:
        score -= 15

    if existing_debt_ratio > 0.40:
        score -= 15
    elif existing_debt_ratio > 0.20:
        score -= 8

    return max(10, min(98, score))


# ── Core Eligibility Evaluation Engine ────────────────────────────────────────

def evaluate_user_loan_eligibility(
    db: Session,
    current_user: User,
    override_capital: int | None = None,
    override_loan: int | None = None,
    existing_debt: int = 0,
    existing_emi: int = 0,
) -> dict[str, Any]:
    """
    Main entry point for calculating dynamic, multi-constraint loan eligibility.
    Strictly scoped to current_user.id.
    """
    user_id = current_user.id

    # 1. Fetch latest assessment
    latest_assessment = (
        db.query(Assessment)
        .filter(Assessment.user_id == user_id)
        .order_by(Assessment.id.desc())
        .first()
    )

    # 2. Fetch or initialize finance record
    finance_rec = db.query(Finance).filter(Finance.user_id == user_id).first()
    if not finance_rec and latest_assessment:
        finance_rec = finance_service.get_or_create_user_finance_from_assessment(db, current_user)

    if not finance_rec and not latest_assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business assessment or financial plan found. Please complete an assessment first.",
        )

    biz_type = (
        (finance_rec.business_type if finance_rec else None)
        or current_user.business_type
        or current_user.business_interest
        or (latest_assessment.business_interest if latest_assessment else None)
        or "Rural Enterprise"
    )

    # 3. Determine financial plan baseline vs simulation overrides
    if override_capital is None and override_loan is None and finance_rec is not None:
        # Use authoritative saved Finance plan directly
        project_cost = int(finance_rec.project_cost)
        user_capital = int(finance_rec.user_capital)
        requested_loan = int(finance_rec.loan_amount)
        margin_pct = float(finance_rec.margin_pct)
        interest_rate = float(finance_rec.interest_rate)
        loan_tenure = int(finance_rec.loan_tenure)
        moratorium = int(finance_rec.moratorium)
        emi = int(finance_rec.emi)
        monthly_revenue = int(finance_rec.expected_monthly_revenue)
        monthly_expenses = int(finance_rec.monthly_expenses)
        monthly_profit = int(finance_rec.monthly_profit)
        annual_cfads = int(finance_rec.annual_cfads)
        base_dscr = float(finance_rec.dscr)
        subsidy_amt = int(finance_rec.subsidy_amount)
        matched_scheme_name = finance_rec.matched_scheme_name or "PM Mudra Yojana"
        matched_scheme_id = finance_rec.matched_scheme_id or "PMMY"
    else:
        # User is simulating adjustments or finance record is being freshly initialized
        effective_capital = (
            override_capital
            if override_capital is not None and override_capital > 0
            else (finance_rec.user_capital if finance_rec else None)
            or (latest_assessment.capital if latest_assessment and latest_assessment.capital else None)
            or current_user.capital
            or 100000
        )

        project_cost_hint = (
            max(finance_rec.project_cost, effective_capital)
            if finance_rec and finance_rec.project_cost > 0
            else None
        )

        plan = finance_service.calculate_financial_plan(
            business_type=biz_type,
            user_capital=effective_capital,
            project_cost=project_cost_hint,
            loan_amount=override_loan,
            interest_rate=finance_rec.interest_rate if finance_rec else None,
            loan_tenure=finance_rec.loan_tenure if finance_rec else None,
            moratorium=finance_rec.moratorium if finance_rec else None,
            user_profile=current_user,
            status="draft",
        )

        project_cost = int(plan["project_cost"])
        user_capital = int(plan["user_capital"])
        requested_loan = int(override_loan if override_loan is not None and override_loan > 0 else plan["loan_amount"])
        margin_pct = round((user_capital / project_cost) * 100.0, 1) if project_cost > 0 else 0.0
        interest_rate = float(plan["interest_rate"])
        loan_tenure = int(plan["loan_tenure"])
        moratorium = int(plan["moratorium"])
        emi = int(plan["emi"])
        monthly_revenue = int(plan["expected_monthly_revenue"])
        monthly_expenses = int(plan["monthly_expenses"])
        monthly_profit = int(plan["monthly_profit"])
        annual_cfads = int(plan["annual_cfads"])  # (monthly_rev - monthly_exp) * 12
        base_dscr = float(plan.get("dscr", 1.5))
        subsidy_amt = int(plan.get("subsidy_amount", 0))
        matched_scheme_name = plan.get("scheme") or "PM Mudra Yojana"
        matched_scheme_id = plan.get("matched_scheme_id", "PMMY")

    # 4. Integrate existing debt obligations into cashflow analysis
    total_monthly_debt_service = emi + existing_emi
    adjusted_annual_debt = total_monthly_debt_service * 12
    if existing_emi > 0:
        adjusted_dscr = (
            round(annual_cfads / adjusted_annual_debt, 2)
            if adjusted_annual_debt > 0
            else 0.0
        )
    else:
        adjusted_dscr = base_dscr

    # 5. Multi-Constraint Maximum Eligible Loan Calculation
    # Constraint 1: Project cost based limit (Max 90% bank financing)
    cap_project = int(project_cost * ELIGIBILITY_RULES["MAX_LOAN_TO_COST_PCT"])

    # Constraint 2: Promoter equity leverage limit (Based on 10% minimum margin requirement)
    min_margin_share = ELIGIBILITY_RULES["MIN_MARGIN_PCT"] / 100.0
    cap_contribution = max(0, int((user_capital / min_margin_share) - user_capital))

    # Constraint 3: Repayment / Cash Flow capacity
    # Available net monthly cash flow after existing obligations, cushioned by 1.25x safety buffer
    operational_monthly_surplus = max(0, monthly_revenue - monthly_expenses)
    net_monthly_cf_available = max(0, operational_monthly_surplus - existing_emi)
    allowable_monthly_emi = net_monthly_cf_available / ELIGIBILITY_RULES["REPAYMENT_SAFETY_BUFFER"]
    cap_repayment = _calculate_max_principal_from_emi(
        allowable_monthly_emi=allowable_monthly_emi,
        annual_rate=interest_rate,
        tenure_months=loan_tenure,
    )

    # Constraint 4: Total debt leverage limit
    cap_leverage = max(0, int(annual_cfads * ELIGIBILITY_RULES["MAX_DEBT_TO_ANNUAL_CFADS"]) - existing_debt)

    # Constraint 5: Unsecured rural credit program ceiling
    cap_priority_ceiling = ELIGIBILITY_RULES["MAX_UNSECURED_PRIORITY_LOAN"]

    # Final Maximum Eligible Loan = Conservative minimum of all realistic constraints
    raw_max_eligible = min(
        cap_project,
        cap_contribution,
        cap_repayment,
        cap_leverage,
        cap_priority_ceiling,
    )

    # Round down to clean thousands
    maximum_eligible_loan = max(0, (raw_max_eligible // 5000) * 5000)

    # 6. Recommended Loan
    if requested_loan <= maximum_eligible_loan:
        recommended_loan = requested_loan
    else:
        recommended_loan = maximum_eligible_loan

    # 7. Determine Eligibility Status
    # Status rules based on comprehensive criteria
    has_healthy_margin = margin_pct >= ELIGIBILITY_RULES["MIN_MARGIN_PCT"]
    has_healthy_dscr = adjusted_dscr >= ELIGIBILITY_RULES["ACCEPTABLE_DSCR"]
    has_positive_profit = monthly_profit > 0
    loan_within_limits = requested_loan <= maximum_eligible_loan

    if user_capital <= 0 or project_cost <= 0:
        status_label = "Insufficient information"
        status_key = "insufficient_information"
    elif has_healthy_margin and has_healthy_dscr and has_positive_profit and loan_within_limits:
        status_label = "Eligible"
        status_key = "eligible"
    elif adjusted_dscr >= ELIGIBILITY_RULES["MIN_DSCR"] and margin_pct >= ELIGIBILITY_RULES["CRITICAL_LOW_MARGIN_PCT"] and has_positive_profit:
        status_label = "Potentially Eligible"
        status_key = "partially_eligible"
    else:
        status_label = "Not Eligible"
        status_key = "not_currently_eligible"

    # 8. Dynamic Indicative Score (0-100)
    has_exp = bool(
        (latest_assessment and latest_assessment.experience and "beginner" not in str(latest_assessment.experience).lower())
        or current_user.experience
        or current_user.work_experience
    )
    has_assessment_flag = latest_assessment is not None
    has_assets_flag = bool(current_user.has_land or current_user.has_commercial_space or current_user.has_bank_account)
    existing_debt_ratio = (existing_emi / operational_monthly_surplus) if operational_monthly_surplus > 0 else 0.0

    score = _compute_eligibility_score(
        margin_pct=margin_pct,
        dscr=adjusted_dscr,
        monthly_profit=monthly_profit,
        has_experience=has_exp,
        has_assessment=has_assessment_flag,
        has_assets=has_assets_flag,
        loan_within_cap=loan_within_limits,
        existing_debt_ratio=existing_debt_ratio,
    )

    # 9. Transparent Structured Factors
    factors = [
        {
            "id": "own_contribution",
            "name": "Promoter Contribution (Margin)",
            "status": "Good" if margin_pct >= 15.0 else ("Moderate" if margin_pct >= 10.0 else "Needs Attention"),
            "value": f"{margin_pct}% (₹{user_capital:,})",
            "benchmark": "Min 10% required by banks",
            "positive": margin_pct >= 10.0,
        },
        {
            "id": "repayment_capacity",
            "name": "Repayment Capacity (DSCR)",
            "status": "Good" if adjusted_dscr >= 1.30 else ("Moderate" if adjusted_dscr >= 1.15 else "Needs Attention"),
            "value": f"{adjusted_dscr:.2f}x coverage",
            "benchmark": "Minimum 1.20x benchmark",
            "positive": adjusted_dscr >= 1.20,
        },
        {
            "id": "operating_profit",
            "name": "Net Operating Cash Flow",
            "status": "Good" if monthly_profit > 12000 else ("Moderate" if monthly_profit > 0 else "Needs Attention"),
            "value": f"₹{monthly_profit:,}/month after EMI",
            "benchmark": "Positive post-debt surplus",
            "positive": monthly_profit > 0,
        },
        {
            "id": "loan_to_capacity",
            "name": "Requested vs Maximum Capacity",
            "status": "Good" if requested_loan <= maximum_eligible_loan else "Needs Attention",
            "value": f"₹{requested_loan:,} requested vs ₹{maximum_eligible_loan:,} max",
            "benchmark": "Requested amount <= max eligible",
            "positive": requested_loan <= maximum_eligible_loan,
        },
        {
            "id": "business_viability",
            "name": "Enterprise Suitability & Experience",
            "status": "Good" if has_exp else "Moderate",
            "value": str(current_user.experience or (latest_assessment.experience if latest_assessment else "Standard rural enterprise skills")),
            "benchmark": "Practical skill or domain familiarity",
            "positive": has_exp or has_assessment_flag,
        },
    ]

    if existing_emi > 0:
        factors.append({
            "id": "existing_debt",
            "name": "Existing Debt Obligation",
            "status": "Needs Attention" if existing_debt_ratio > 0.35 else "Moderate",
            "value": f"₹{existing_emi:,}/month existing EMI",
            "benchmark": "Below 35% of operational surplus",
            "positive": existing_debt_ratio <= 0.35,
        })

    # 10. Positive Factors (Strengths)
    positive_factors = []
    if margin_pct >= 15.0:
        positive_factors.append(f"Strong promoter equity contribution of {margin_pct}% (₹{user_capital:,}) well above banking baseline.")
    elif margin_pct >= 10.0:
        positive_factors.append(f"Promoter margin contribution of {margin_pct}% meets standard bank threshold.")

    if adjusted_dscr >= 1.30:
        positive_factors.append(f"Strong Debt Service Coverage Ratio ({adjusted_dscr:.2f}x) provides robust cushion against operational revenue variance.")
    elif adjusted_dscr >= 1.15:
        positive_factors.append(f"Adequate Debt Service Coverage ({adjusted_dscr:.2f}x) covers monthly EMI obligations.")

    if monthly_profit > 10000:
        positive_factors.append(f"Healthy projected net monthly profit of ₹{monthly_profit:,} ensures owner livelihood and timely debt servicing.")

    if loan_within_limits:
        positive_factors.append(f"Requested loan of ₹{requested_loan:,} is comfortably within the calculated capacity of ₹{maximum_eligible_loan:,}.")

    if current_user.has_bank_account:
        positive_factors.append("Active priority-sector bank account and KYC readiness verified.")

    # 11. Limiting Factors (Bottlenecks)
    limiting_factors = []
    if requested_loan > maximum_eligible_loan:
        excess = requested_loan - maximum_eligible_loan
        limiting_factors.append(
            f"Requested loan amount (₹{requested_loan:,}) exceeds the maximum eligible borrowing capacity of ₹{maximum_eligible_loan:,} by ₹{excess:,}."
        )

    if margin_pct < 10.0:
        limiting_factors.append(
            f"Promoter margin contribution of {margin_pct}% is below the standard 10% banking equity threshold."
        )

    if adjusted_dscr < 1.20:
        limiting_factors.append(
            f"Debt Service Coverage Ratio ({adjusted_dscr:.2f}x) is below the recommended 1.20x commercial banking standard."
        )

    if monthly_profit <= 0:
        limiting_factors.append(
            "Projected operational expenses and loan debt service equal or exceed monthly gross revenue, leaving no cash surplus."
        )

    if existing_emi > 0 and existing_debt_ratio > 0.30:
        limiting_factors.append(
            f"Existing monthly debt commitments of ₹{existing_emi:,} consume {int(existing_debt_ratio * 100)}% of operational cash flow."
        )

    # 12. Actionable Improvement Recommendations
    recommendations = []
    if requested_loan > maximum_eligible_loan:
        recommendations.append(
            f"Reduce requested loan to ₹{recommended_loan:,} or scale down non-critical initial equipment to match debt capacity."
        )

    if margin_pct < 15.0:
        shortfall = max(0, int(project_cost * 0.15) - user_capital)
        recommendations.append(
            f"Increase promoter contribution by ₹{shortfall:,} to raise margin to 15%, improving bank approval score."
        )

    if adjusted_dscr < 1.30 and loan_tenure < 84:
        recommendations.append(
            f"Request a longer loan tenure (e.g. 60–84 months) or negotiate a 6-month principal moratorium to reduce monthly EMI and boost DSCR."
        )

    if subsidy_amt > 0:
        recommendations.append(
            f"Apply under {matched_scheme_name} to leverage back-ended capital subsidy of ₹{subsidy_amt:,}, significantly lowering net debt burden."
        )
    else:
        recommendations.append(
            "Explore credit-linked government schemes (such as PMEGP or Mudra Tarun) to access interest subvention or credit guarantees under CGTMSE."
        )

    # 13. Matched Schemes Integration
    matched_schemes_list = []
    try:
        scheme_profile = UserAssessmentProfile(
            business=biz_type,
            business_interest=biz_type,
            capital=user_capital,
            loan_needed="yes",
            gender=current_user.gender,
            social_category=current_user.social_category,
            state=current_user.state,
            district=current_user.district,
            has_land=current_user.has_land,
        )
        schemes = scheme_service.recommend_schemes(scheme_profile)
        for s in schemes[:3]:
            matched_schemes_list.append({
                "scheme_id": getattr(s, "scheme_id", "SCHEME"),
                "name": getattr(s, "scheme_name", getattr(s, "name", "Scheme")),
                "max_loan": getattr(s, "max_loan", "₹10,00,000"),
                "interest": getattr(s, "interest_rate", getattr(s, "interest", "7% - 9% p.a.")),
                "subsidy": getattr(s, "subsidy", "Up to 25%"),
                "tenure": getattr(s, "tenure", "5 - 7 Years"),
                "match_pct": getattr(s, "match_score", getattr(s, "match", 75)),
            })
    except Exception as exc:
        logger.warning("[LOAN_ELIGIBILITY] Could not fetch detailed scheme recommendations: %s", exc)

    matched_scheme_obj = None
    if matched_schemes_list:
        top = matched_schemes_list[0]
        matched_scheme_obj = {
            "scheme_id": top["scheme_id"],
            "name": top["name"],
            "loan_amount": f"₹{recommended_loan:,}",
            "interest_rate": top.get("interest") or f"{interest_rate}% p.a.",
            "subsidy_amount": f"₹{subsidy_amt:,}" if subsidy_amt > 0 else (top.get("subsidy") or "Credit Guarantee Cover"),
        }
    else:
        matched_scheme_obj = {
            "scheme_id": matched_scheme_id,
            "name": matched_scheme_name,
            "loan_amount": f"₹{recommended_loan:,}",
            "interest_rate": f"{interest_rate}% p.a.",
            "subsidy_amount": f"₹{subsidy_amt:,}" if subsidy_amt > 0 else "Credit Guarantee Cover",
        }

    # 15. Reasons for backward compatibility
    reasons = []
    for pf in positive_factors:
        reasons.append({"text": pf, "positive": True})
    for lf in limiting_factors:
        reasons.append({"text": lf, "positive": False})

    # Important conditions for banking approval
    important_conditions = [
        "Maintain minimum 10%–15% promoter margin equity contribution.",
        "Maintain operational Debt Service Coverage Ratio (DSCR) above 1.20x.",
        "Valid KYC documents, Aadhaar verification, and active priority-sector savings/current bank account.",
        "Clear credit appraisal and satisfactory CIBIL track record (no active willful default history).",
        "Final loan sanction, interest concession, and disbursement remain at the sole discretion of the lending bank under RBI guidelines.",
    ]

    funding_req = max(0, project_cost - user_capital)
    possible_loan = requested_loan if requested_loan > 0 else (recommended_loan or funding_req)

    return {
        "status": status_label,
        "status_key": status_key,
        "score": score,
        "eligibility_score": score,
        "requested_loan": requested_loan,
        "maximum_eligible_loan": maximum_eligible_loan,
        "recommended_loan": recommended_loan,
        "project_cost": project_cost,
        "user_capital": user_capital,
        "margin_pct": margin_pct,
        "interest_rate": interest_rate,
        "loan_tenure": loan_tenure,
        "moratorium": moratorium,
        "monthly_emi": emi,
        "dscr": adjusted_dscr,
        "monthly_profit": monthly_profit,
        # Explicit Phase 4 Loan Connection Fields
        "estimated_investment": project_cost,
        "own_contribution": user_capital,
        "own_contribution_pct": margin_pct,
        "funding_requirement": funding_req,
        "possible_loan_requirement": possible_loan,
        "eligibility_result": status_label,
        "important_conditions": important_conditions,
        "factors": factors,
        "positive_factors": positive_factors,
        "limiting_factors": limiting_factors,
        "recommendations": recommendations,
        "reasons": reasons,
        "metrics": {
            "project_cost": project_cost,
            "user_capital": user_capital,
            "loan_amount": requested_loan,
            "maximum_eligible_loan": maximum_eligible_loan,
            "recommended_loan": recommended_loan,
            "margin_pct": margin_pct,
            "monthly_emi": emi,
            "dscr": adjusted_dscr,
            "monthly_profit": monthly_profit,
            "interest_rate": interest_rate,
            "loan_tenure": loan_tenure,
        },
        "matched_scheme": matched_scheme_obj,
        "matched_schemes": matched_schemes_list,
        "disclaimer": DISCLAIMER_TEXT,
    }


def evaluate_plan_loan_eligibility(
    plan: dict[str, Any],
    user_profile: User | None = None,
    existing_debt: int = 0,
    existing_emi: int = 0,
) -> dict[str, Any]:
    """
    Evaluate loan eligibility directly for an arbitrary financial plan dictionary.
    Reuses the exact banking formulas without requiring DB state.
    """
    project_cost = int(plan.get("project_cost", 0))
    user_capital = int(plan.get("user_capital", 0))
    requested_loan = int(plan.get("loan_amount", 0))
    margin_pct = float(plan.get("margin_pct", 0.0))
    interest_rate = float(plan.get("interest_rate", 7.0))
    loan_tenure = int(plan.get("loan_tenure", 60))
    moratorium = int(plan.get("moratorium", 6))
    emi = int(plan.get("emi", 0))
    monthly_rev = int(plan.get("expected_monthly_revenue", 0))
    monthly_exp = int(plan.get("monthly_expenses", 0))
    monthly_profit = int(plan.get("monthly_profit", 0))
    annual_cfads = int(plan.get("annual_cfads", 0))
    base_dscr = float(plan.get("dscr", 1.5))
    subsidy_amt = int(plan.get("subsidy_amount", 0))
    biz_type = str(plan.get("business_type") or "Rural Enterprise")

    # Debt service obligations
    total_monthly_debt_service = emi + existing_emi
    adjusted_annual_debt = total_monthly_debt_service * 12
    if existing_emi > 0 and adjusted_annual_debt > 0:
        adjusted_dscr = round(annual_cfads / adjusted_annual_debt, 2)
    else:
        adjusted_dscr = base_dscr

    # Multi-Constraint limits
    cap_project = int(project_cost * ELIGIBILITY_RULES["MAX_LOAN_TO_COST_PCT"])
    min_margin_share = ELIGIBILITY_RULES["MIN_MARGIN_PCT"] / 100.0
    cap_contribution = max(0, int((user_capital / min_margin_share) - user_capital)) if user_capital > 0 else 0

    operational_monthly_surplus = max(0, monthly_rev - monthly_exp)
    net_monthly_cf_available = max(0, operational_monthly_surplus - existing_emi)
    allowable_monthly_emi = net_monthly_cf_available / ELIGIBILITY_RULES["REPAYMENT_SAFETY_BUFFER"]
    cap_repayment = _calculate_max_principal_from_emi(
        allowable_monthly_emi=allowable_monthly_emi,
        annual_rate=interest_rate,
        tenure_months=loan_tenure,
    )
    cap_leverage = max(0, int(annual_cfads * ELIGIBILITY_RULES["MAX_DEBT_TO_ANNUAL_CFADS"]) - existing_debt)
    cap_priority_ceiling = ELIGIBILITY_RULES["MAX_UNSECURED_PRIORITY_LOAN"]

    raw_max_eligible = min(
        cap_project,
        cap_contribution,
        cap_repayment,
        cap_leverage,
        cap_priority_ceiling,
    )
    maximum_eligible_loan = max(0, (raw_max_eligible // 5000) * 5000)
    recommended_loan = min(requested_loan, maximum_eligible_loan) if requested_loan > 0 else maximum_eligible_loan

    # Status classification
    has_healthy_margin = margin_pct >= ELIGIBILITY_RULES["MIN_MARGIN_PCT"]
    has_healthy_dscr = adjusted_dscr >= ELIGIBILITY_RULES["ACCEPTABLE_DSCR"]
    has_positive_profit = monthly_profit > 0
    loan_within_limits = requested_loan <= maximum_eligible_loan

    if user_capital <= 0 or project_cost <= 0:
        status_label = "Insufficient information"
        status_key = "insufficient_information"
    elif has_healthy_margin and has_healthy_dscr and has_positive_profit and loan_within_limits:
        status_label = "Eligible"
        status_key = "eligible"
    elif adjusted_dscr >= ELIGIBILITY_RULES["MIN_DSCR"] and margin_pct >= ELIGIBILITY_RULES["CRITICAL_LOW_MARGIN_PCT"] and has_positive_profit:
        status_label = "Potentially Eligible"
        status_key = "partially_eligible"
    else:
        status_label = "Not Eligible"
        status_key = "not_currently_eligible"

    # Indicative Score
    has_exp = bool(user_profile and (user_profile.experience or user_profile.work_experience))
    has_assets_flag = bool(user_profile and (user_profile.has_land or user_profile.has_commercial_space or user_profile.has_bank_account))
    existing_debt_ratio = (existing_emi / operational_monthly_surplus) if operational_monthly_surplus > 0 else 0.0

    score = _compute_eligibility_score(
        margin_pct=margin_pct,
        dscr=adjusted_dscr,
        monthly_profit=monthly_profit,
        has_experience=has_exp,
        has_assessment=True,
        has_assets=has_assets_flag,
        loan_within_cap=loan_within_limits,
        existing_debt_ratio=existing_debt_ratio,
    )

    important_conditions = [
        "Maintain minimum 10%–15% promoter margin equity contribution.",
        "Maintain operational Debt Service Coverage Ratio (DSCR) above 1.20x.",
        "Valid KYC documents, Aadhaar verification, and active priority-sector savings/current bank account.",
        "Clear credit appraisal and satisfactory CIBIL track record (no active willful default history).",
        "Final loan sanction, interest concession, and disbursement remain at the sole discretion of the lending bank under RBI guidelines.",
    ]

    funding_req = max(0, project_cost - user_capital)
    possible_loan = requested_loan if requested_loan > 0 else (recommended_loan or funding_req)

    positive_factors = []
    limiting_factors = []
    if margin_pct >= 15.0:
        positive_factors.append(f"Strong promoter equity contribution of {margin_pct}% (₹{user_capital:,}) well above banking baseline.")
    elif margin_pct >= 10.0:
        positive_factors.append(f"Promoter margin contribution of {margin_pct}% meets standard bank threshold.")
    else:
        limiting_factors.append(f"Promoter margin contribution of {margin_pct}% is below the standard 10% banking equity threshold.")

    if adjusted_dscr >= 1.30:
        positive_factors.append(f"Strong Debt Service Coverage Ratio ({adjusted_dscr:.2f}x) provides robust cushion.")
    elif adjusted_dscr < 1.20:
        limiting_factors.append(f"Debt Service Coverage Ratio ({adjusted_dscr:.2f}x) is below the recommended 1.20x commercial banking standard.")

    if monthly_profit > 10000:
        positive_factors.append(f"Healthy projected net monthly profit of ₹{monthly_profit:,} ensures timely debt servicing.")
    elif monthly_profit <= 0:
        limiting_factors.append("Projected operational expenses and debt service exceed monthly revenue, leaving no cash surplus.")

    reasons = [{"text": p, "positive": True} for p in positive_factors] + [{"text": l, "positive": False} for l in limiting_factors]

    return {
        "status": status_label,
        "status_key": status_key,
        "score": score,
        "eligibility_score": score,
        "requested_loan": requested_loan,
        "maximum_eligible_loan": maximum_eligible_loan,
        "recommended_loan": recommended_loan,
        "project_cost": project_cost,
        "user_capital": user_capital,
        "margin_pct": margin_pct,
        "interest_rate": interest_rate,
        "loan_tenure": loan_tenure,
        "moratorium": moratorium,
        "monthly_emi": emi,
        "dscr": adjusted_dscr,
        "monthly_profit": monthly_profit,
        "estimated_investment": project_cost,
        "own_contribution": user_capital,
        "own_contribution_pct": margin_pct,
        "funding_requirement": funding_req,
        "possible_loan_requirement": possible_loan,
        "eligibility_result": status_label,
        "important_conditions": important_conditions,
        "factors": [],
        "positive_factors": positive_factors,
        "limiting_factors": limiting_factors,
        "recommendations": [],
        "reasons": reasons,
        "metrics": {
            "project_cost": project_cost,
            "user_capital": user_capital,
            "loan_amount": requested_loan,
            "maximum_eligible_loan": maximum_eligible_loan,
            "recommended_loan": recommended_loan,
            "margin_pct": margin_pct,
            "monthly_emi": emi,
            "dscr": adjusted_dscr,
            "monthly_profit": monthly_profit,
            "interest_rate": interest_rate,
            "loan_tenure": loan_tenure,
        },
        "matched_scheme": {
            "scheme_id": plan.get("matched_scheme_id") or "PMMY",
            "name": plan.get("matched_scheme_name") or "PM Mudra Yojana",
            "loan_amount": f"₹{recommended_loan:,}",
            "interest_rate": f"{interest_rate}% p.a.",
            "subsidy_amount": f"₹{subsidy_amt:,}" if subsidy_amt > 0 else "Credit Guarantee Cover",
        },
        "matched_schemes": [],
        "disclaimer": DISCLAIMER_TEXT,
    }
