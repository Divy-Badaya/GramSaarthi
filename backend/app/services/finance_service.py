"""
GRAMSAARTHI — Centralized Financial Calculation Service
Single source of truth for financial modeling, standard banking calculations,
official scheme matching, genuine break-even derivation, and loan eligibility.
"""

import math
import logging
from typing import Any
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.finance import Finance
from app.services import business_template_service
from app.services.scheme_service import recommend_schemes
from app.schemas.scheme import UserAssessmentProfile

logger = logging.getLogger(__name__)


def calculate_financial_plan(
    business_type: str,
    user_capital: int,
    project_cost: int | None = None,
    loan_amount: int | None = None,
    interest_rate: float | None = None,
    loan_tenure: int | None = None,
    moratorium: int | None = None,
    user_profile: Any = None,
    status: str = "draft",
    business_name: str | None = None,
) -> dict[str, Any]:
    """
    Centralized financial calculation engine.
    Applies strict validation, configurable cost templates, formal DSCR,
    genuine break-even, and official scheme matching.
    """
    # ── 1. Input Validation ───────────────────────────────────────────────────
    if user_capital < 0:
        raise ValueError("User capital cannot be negative.")
    if project_cost is not None and project_cost <= 0:
        raise ValueError("Project cost must be greater than zero.")
    if interest_rate is not None and (interest_rate < 0 or interest_rate > 50.0):
        raise ValueError("Interest rate must be between 0.0% and 50.0%.")
    if loan_tenure is not None and (loan_tenure < 1 or loan_tenure > 360):
        raise ValueError("Loan tenure must be between 1 and 360 months.")
    if moratorium is not None and moratorium < 0:
        raise ValueError("Moratorium cannot be negative.")

    # ── 2. Business Template Scaling ──────────────────────────────────────────
    template = business_template_service.match_template(business_type)
    scale_data = business_template_service.compute_business_scale_and_costs(
        template=template,
        user_capital=user_capital,
        requested_project_cost=project_cost,
    )

    final_project_cost = scale_data["project_cost"]

    # If project cost is less than capital, ensure project cost is at least equal to capital
    if user_capital > final_project_cost:
        final_project_cost = max(final_project_cost, user_capital)

    # ── 3. Government Scheme & Subsidy Matching ───────────────────────────────
    scheme_info = _match_best_scheme(
        business_type=business_type,
        project_cost=final_project_cost,
        user_capital=user_capital,
        user_profile=user_profile,
    )

    subsidy_amount = scheme_info["subsidy_amount"]
    subsidy_pct = scheme_info["subsidy_percentage"]
    matched_scheme_id = scheme_info["scheme_id"]
    matched_scheme_name = scheme_info["scheme_name"]

    # ── 4. Loan, Interest & Tenure ────────────────────────────────────────────
    if loan_amount is not None and loan_amount >= 0:
        final_loan = min(loan_amount, max(0, final_project_cost - user_capital))
    else:
        final_loan = max(0, final_project_cost - user_capital - subsidy_amount)

    final_interest_rate = (
        float(interest_rate)
        if interest_rate is not None
        else scheme_info.get("interest_rate", scale_data["default_interest_rate"])
    )

    final_tenure = (
        int(loan_tenure)
        if loan_tenure is not None
        else scale_data["default_tenure_months"]
    )

    final_moratorium = (
        int(moratorium)
        if moratorium is not None
        else scale_data["default_moratorium_months"]
    )

    if final_moratorium >= final_tenure:
        final_moratorium = max(0, final_tenure - 1)

    # Margin percentage
    margin_pct = round((user_capital / final_project_cost) * 100, 1) if final_project_cost > 0 else 0.0

    # ── 5. Standard EMI Formula (with r = 0 handling) ─────────────────────────
    emi = _calculate_emi(
        principal=final_loan,
        annual_rate=final_interest_rate,
        tenure_months=final_tenure,
    )

    total_repayment = emi * final_tenure
    total_interest = max(0, total_repayment - final_loan)
    processing_fee = min(10000, max(1000, round(final_loan * 0.005))) if final_loan > 0 else 0

    # ── 6. Operational Cashflows & Profits ────────────────────────────────────
    monthly_rev = scale_data["expected_monthly_revenue"]
    monthly_exp = scale_data["monthly_expenses"]
    fixed_monthly_expenses = scale_data.get("fixed_monthly_expenses", round(monthly_exp * 0.35))
    variable_monthly_expenses = scale_data.get("variable_monthly_expenses", max(0, monthly_exp - fixed_monthly_expenses))
    monthly_net_profit = monthly_rev - monthly_exp - emi

    annual_rev = monthly_rev * 12
    annual_exp = monthly_exp * 12
    annual_profit = monthly_net_profit * 12
    profit_margin = round((monthly_net_profit / monthly_rev) * 100, 1) if monthly_rev > 0 else 0.0

    # ── 7. Formal DSCR (Debt Service Coverage Ratio) ──────────────────────────
    # Formula: Annual Cash Available for Debt Service (CFADS) / Annual Debt Obligation
    annual_cfads = annual_rev - annual_exp  # Operating income before debt service
    annual_debt_obligation = emi * 12

    if annual_debt_obligation <= 0:
        dscr = 9.99
    else:
        dscr = round(max(0.0, annual_cfads / annual_debt_obligation), 2)

    # ── 8. Genuine Break-Even Calculation ─────────────────────────────────────
    # Contribution Margin = Revenue - Variable Costs
    contribution_margin = max(0, monthly_rev - variable_monthly_expenses)
    cm_ratio = (contribution_margin / monthly_rev) if monthly_rev > 0 else 0.0
    contribution_margin_pct = round(cm_ratio * 100, 1)

    # Monthly revenue required to cover fixed overhead + EMI
    fixed_burden = fixed_monthly_expenses + emi
    break_even_revenue = round(fixed_burden / cm_ratio) if cm_ratio > 0 else monthly_rev

    # Payback horizon on initial promoter capital investment
    monthly_cashflow = monthly_rev - monthly_exp - emi
    if monthly_cashflow <= 0 or user_capital <= 0:
        break_even_month = 24  # High debt burden or immediate recovery if capital = 0
    else:
        raw_months = math.ceil(user_capital / monthly_cashflow)
        break_even_month = max(3, min(48, raw_months))

    # ── 9. Return on Investment (ROI) ─────────────────────────────────────────
    roi = round((annual_profit / final_project_cost) * 100, 1) if final_project_cost > 0 else 0.0

    # ── 10. Dynamic 12-Month Projections & Multi-Year Forecast ────────────────
    projections = _generate_12m_projections(
        monthly_rev=monthly_rev,
        fixed_exp=fixed_monthly_expenses,
        variable_exp=variable_monthly_expenses,
        emi=emi,
        principal=final_loan,
        annual_rate=final_interest_rate,
        tenure_months=final_tenure,
    )

    yearly_projections = _generate_multi_year_projections(
        projections=projections,
        monthly_rev=monthly_rev,
        monthly_exp=monthly_exp,
        emi=emi,
    )

    # ── 11. Amortization Schedule Sample ──────────────────────────────────────
    amortization = _generate_amortization_sample(
        principal=final_loan,
        annual_rate=final_interest_rate,
        tenure_months=final_tenure,
        emi=emi,
    )

    return {
        # Canonical fields
        "business_type": business_type,
        "business_name": business_name or scale_data["business_name"],
        "project_cost": final_project_cost,
        "user_capital": user_capital,
        "loan_amount": final_loan,
        "margin_pct": margin_pct,
        "interest_rate": final_interest_rate,
        "loan_tenure": final_tenure,
        "moratorium": final_moratorium,
        "emi": emi,
        "total_repayment": total_repayment,
        "total_interest": total_interest,
        "processing_fee": processing_fee,
        "expected_monthly_revenue": monthly_rev,
        "monthly_expenses": monthly_exp,
        "fixed_monthly_expenses": fixed_monthly_expenses,
        "variable_monthly_expenses": variable_monthly_expenses,
        "monthly_profit": monthly_net_profit,
        "net_monthly_profit": monthly_net_profit,
        "annual_revenue": annual_rev,
        "annual_profit": annual_profit,
        "profit_margin": profit_margin,
        "annual_debt_obligation": annual_debt_obligation,
        "annual_cfads": annual_cfads,
        "dscr": dscr,
        "break_even_month": break_even_month,
        "break_even_revenue": break_even_revenue,
        "contribution_margin_pct": contribution_margin_pct,
        "roi": roi,
        "subsidy_amount": subsidy_amount,
        "subsidy_percentage": subsidy_pct,
        "matched_scheme_id": matched_scheme_id,
        "matched_scheme_name": matched_scheme_name,
        "status": status,
        "capex_breakdown": scale_data.get("capex_breakdown", {}),
        "revenue_projections": projections,
        "monthly_projections": projections,
        "projections_12m": projections,
        "yearly_projections": yearly_projections,
        "amortization_schedule": amortization,
        # UI camelCase bridge
        "margin": user_capital,
        "projectCost": final_project_cost,
        "loan": final_loan,
        "interestRate": final_interest_rate,
        "tenure": final_tenure,
        "breakEven": break_even_month,
        "breakEvenRevenue": break_even_revenue,
        "scheme": matched_scheme_name,
        "monthlyRevenue": monthly_rev,
        "monthlyExpenses": monthly_exp,
        "fixedExpenses": fixed_monthly_expenses,
        "variableExpenses": variable_monthly_expenses,
        "monthlyProfit": monthly_net_profit,
        "profitMargin": profit_margin,
        "contributionMarginPct": contribution_margin_pct,
        "totalRepayment": total_repayment,
        "totalInterest": total_interest,
        "processingFee": processing_fee,
        "yearlyProjections": yearly_projections,
    }


def save_or_update_user_finance(
    db: Session,
    user_id: int,
    data: dict[str, Any],
    status: str = "finalized",
) -> Finance:
    """Save or update the finance record for an authenticated user."""
    rec = db.query(Finance).filter(Finance.user_id == user_id).first()

    if not rec:
        rec = Finance(user_id=user_id, status=status, **{
            k: v for k, v in data.items()
            if hasattr(Finance, k) and k not in ("id", "user_id", "created_at", "updated_at", "status")
        })
        db.add(rec)
    else:
        for k, v in data.items():
            if hasattr(rec, k) and k not in ("id", "user_id", "created_at"):
                setattr(rec, k, v)
        rec.status = status

    db.commit()
    db.refresh(rec)
    return rec


def get_user_finance(db: Session, user_id: int) -> Finance | None:
    """Retrieve finance record scoped strictly to authenticated user."""
    return db.query(Finance).filter(Finance.user_id == user_id).first()


def get_or_create_user_finance_from_assessment(
    db: Session,
    user: User,
) -> Finance | None:
    """
    Retrieve finance record for the user. If none exists, attempt to initialize
    a draft financial plan dynamically from the user's latest completed assessment,
    the district ML recommended business, or their profile business type.
    Guarantees seamless flow between Assessment and Finance without 404 errors.
    """
    rec = db.query(Finance).filter(Finance.user_id == user.id).first()
    if rec:
        return rec

    from app.models.assessment import Assessment
    latest_assessment = (
        db.query(Assessment)
        .filter(Assessment.user_id == user.id)
        .order_by(Assessment.id.desc())
        .first()
    )

    if not latest_assessment:
        return None

    biz_type = latest_assessment.business_interest
    user_cap = latest_assessment.capital or user.capital or 100000
    location_str = latest_assessment.location

    # If biz_type is unset or "AI Suggest" / "suggest", resolve it
    if not biz_type or biz_type.strip().lower() in ("ai suggest", "suggest", "none", ""):
        if user.business_type and user.business_type.strip().lower() not in ("ai suggest", "suggest", "none", ""):
            biz_type = user.business_type
        elif user.business_interest and user.business_interest.strip().lower() not in ("ai suggest", "suggest", "none", ""):
            biz_type = user.business_interest
        else:
            # Predict best business for user's district or default to Dairy
            dist = getattr(user, "district", None)
            st = getattr(user, "state", None) or "MADHYA PRADESH"
            if not dist and location_str:
                parts = [p.strip() for p in location_str.split(",")]
                if len(parts) >= 2:
                    dist = parts[-2]
                if len(parts) >= 3:
                    st = parts[-1]

            if dist:
                try:
                    from app.services.business_ml_service import business_ml_service
                    if not business_ml_service.is_loaded:
                        business_ml_service.load()
                    if business_ml_service.is_loaded:
                        pred = business_ml_service.predict_district(state=st, district=dist)
                        biz_type = pred["top3"][0] if pred.get("top3") else "Dairy"
                except Exception:
                    biz_type = "Dairy"
            else:
                biz_type = "Dairy"

    try:
        plan = calculate_financial_plan(
            business_type=biz_type,
            user_capital=user_cap,
            user_profile=user,
            status="draft",
        )
        return save_or_update_user_finance(
            db=db,
            user_id=user.id,
            data=plan,
            status="draft",
        )
    except Exception as exc:
        logger.warning("[FINANCE] Could not auto-generate finance from assessment: %s", exc)
        return None


def evaluate_loan_eligibility(finance_data: dict[str, Any]) -> dict[str, Any]:
    """
    Evaluate loan eligibility based on the user's calculated financial metrics.
    Returns status: 'Eligible', 'Potentially Eligible', or 'Not Eligible' with reasons.
    """
    margin_pct = finance_data.get("margin_pct", 0.0)
    dscr = finance_data.get("dscr", 0.0)
    monthly_profit = finance_data.get("monthly_profit", 0)
    loan_amount = finance_data.get("loan_amount", 0)
    project_cost = finance_data.get("project_cost", 1)

    score = 60
    reasons = []

    # 1. Margin contribution evaluation
    if margin_pct >= 15.0:
        score += 20
        reasons.append({"text": f"Healthy own contribution: {margin_pct}% (minimum recommended is 10%)", "positive": True})
    elif margin_pct >= 10.0:
        score += 10
        reasons.append({"text": f"Adequate promoter margin of {margin_pct}% meets banking threshold", "positive": True})
    else:
        score -= 25
        reasons.append({"text": f"Margin of {margin_pct}% is below standard 10% banking requirement", "positive": False})

    # 2. DSCR / Repayment capacity evaluation
    if dscr >= 1.40:
        score += 20
        reasons.append({"text": f"Strong Debt Service Coverage ({dscr:.2f}x) ensures safe repayment buffer", "positive": True})
    elif dscr >= 1.15:
        score += 10
        reasons.append({"text": f"Acceptable DSCR ({dscr:.2f}x) covers estimated monthly EMI", "positive": True})
    else:
        score -= 30
        reasons.append({"text": f"Tight cashflow coverage (DSCR {dscr:.2f}x) presents credit risk", "positive": False})

    # 3. Monthly Net Profit check
    if monthly_profit > 15000:
        score += 10
        reasons.append({"text": f"Projected monthly net profit of ₹{monthly_profit:,} provides financial security", "positive": True})
    elif monthly_profit > 0:
        reasons.append({"text": f"Positive projected net monthly profit of ₹{monthly_profit:,}", "positive": True})
    else:
        score -= 20
        reasons.append({"text": "Projected operational profit is insufficient to absorb full loan debt service", "positive": False})

    # 4. Status determination
    score = max(10, min(98, score))
    if score >= 75 and margin_pct >= 10.0 and dscr >= 1.20:
        status = "Eligible"
    elif score >= 50 and dscr >= 1.0:
        status = "Potentially Eligible"
    else:
        status = "Not Eligible"

    matched_scheme = None
    if finance_data.get("matched_scheme_name"):
        matched_scheme = {
            "scheme_id": finance_data.get("matched_scheme_id"),
            "name": finance_data.get("matched_scheme_name"),
            "loan_amount": f"₹{loan_amount:,}",
            "interest_rate": f"{finance_data.get('interest_rate', 7.5)}% p.a.",
            "subsidy_amount": f"₹{finance_data.get('subsidy_amount', 0):,}",
        }

    return {
        "status": status,
        "score": score,
        "reasons": reasons,
        "metrics": {
            "project_cost": project_cost,
            "user_capital": finance_data.get("user_capital", 0),
            "loan_amount": loan_amount,
            "margin_pct": margin_pct,
            "monthly_emi": finance_data.get("emi", 0),
            "dscr": dscr,
            "monthly_profit": monthly_profit,
        },
        "matched_scheme": matched_scheme,
        "disclaimer": "This is an automated project-level estimate. Final loan sanction is at the sole discretion of the lending bank and subject to documentation and KYC verification.",
    }


# ── Internal Calculation Helpers ──────────────────────────────────────────────

def _calculate_emi(principal: int, annual_rate: float, tenure_months: int) -> int:
    """Standard banking EMI formula with zero-interest handling."""
    if principal <= 0 or tenure_months <= 0:
        return 0

    r = (annual_rate / 100.0) / 12.0
    n = tenure_months

    if r <= 0:
        return round(principal / n)

    emi = principal * r * math.pow(1 + r, n) / (math.pow(1 + r, n) - 1)
    return round(emi)


def _match_best_scheme(
    business_type: str,
    project_cost: int,
    user_capital: int,
    user_profile: User | None = None,
) -> dict[str, Any]:
    """
    Match official government schemes using scheme_service without fabricating rates.
    """
    profile = UserAssessmentProfile(
        business=business_type,
        business_interest=business_type,
        capital=user_capital,
        loan_needed="yes",
        gender=user_profile.gender if user_profile else None,
        social_category=user_profile.social_category if user_profile else None,
        state=user_profile.state if user_profile else None,
        district=user_profile.district if user_profile else None,
        has_land=user_profile.has_land if user_profile else False,
    )

    schemes = recommend_schemes(profile)

    # Defaults
    best_scheme = {
        "scheme_id": "PMMY",
        "scheme_name": "Pradhan Mantri MUDRA Yojana (PMMY)",
        "interest_rate": 7.0,
        "subsidy_amount": 0,
        "subsidy_percentage": 0.0,
    }

    if not schemes:
        return best_scheme

    top = schemes[0]
    s_id = top.scheme_id
    biz_lower = (business_type or "").lower()

    if s_id == "KCC" and ("dairy" in biz_lower or "poultry" in biz_lower or "fish" in biz_lower):
        best_scheme = {
            "scheme_id": "KCC",
            "scheme_name": "Kisan Credit Card (KCC) – Allied Agri",
            "interest_rate": 4.0,  # With prompt repayment subvention
            "subsidy_amount": 0,
            "subsidy_percentage": 0.0,
        }
    elif s_id == "PMEGP":
        # 25% rural general, up to 35% for SC/ST/Women
        is_spl = user_profile and (
            (user_profile.gender and user_profile.gender.lower() in ("female", "woman"))
            or (user_profile.social_category and user_profile.social_category.upper() in ("SC", "ST"))
        )
        pct = 35.0 if is_spl else 25.0
        sub_amt = min(1250000, round(project_cost * (pct / 100.0)))
        best_scheme = {
            "scheme_id": "PMEGP",
            "scheme_name": "Prime Minister's Employment Generation Programme (PMEGP)",
            "interest_rate": 8.5,
            "subsidy_amount": sub_amt,
            "subsidy_percentage": pct,
        }
    elif s_id == "PMFME" and "food" in biz_lower:
        sub_amt = min(1000000, round(project_cost * 0.35))
        best_scheme = {
            "scheme_id": "PMFME",
            "scheme_name": "PM Formalisation of Micro Food Processing Enterprises (PMFME)",
            "interest_rate": 8.0,
            "subsidy_amount": sub_amt,
            "subsidy_percentage": 35.0,
        }
    elif s_id == "PMVISHWAKARMA" and ("tailor" in biz_lower or "textile" in biz_lower):
        best_scheme = {
            "scheme_id": "PMVISHWAKARMA",
            "scheme_name": "PM Vishwakarma Scheme (Concessional Credit)",
            "interest_rate": 5.0,
            "subsidy_amount": 15000,  # toolkit grant
            "subsidy_percentage": 0.0,
        }
    elif s_id == "NLM" and ("poultry" in biz_lower or "dairy" in biz_lower):
        sub_amt = min(2500000, round(project_cost * 0.50))
        best_scheme = {
            "scheme_id": "NLM",
            "scheme_name": "National Livestock Mission (NLM)",
            "interest_rate": 8.0,
            "subsidy_amount": sub_amt,
            "subsidy_percentage": 50.0,
        }
    else:
        # Default PMMY with Mudra tier
        tier = "Shishu" if project_cost <= 50000 else "Kishore" if project_cost <= 500000 else "Tarun"
        best_scheme = {
            "scheme_id": "PMMY",
            "scheme_name": f"PM Mudra Yojana – {tier}",
            "interest_rate": 7.0 if tier == "Tarun" else 8.0,
            "subsidy_amount": 0,
            "subsidy_percentage": 0.0,
        }

    return best_scheme


def _generate_12m_projections(
    monthly_rev: int,
    fixed_exp: int,
    variable_exp: int,
    emi: int,
    principal: int,
    annual_rate: float,
    tenure_months: int,
) -> list[dict[str, Any]]:
    """Simulate realistic 12-month startup operational ramp-up curve with cash flow and loan balances."""
    ramp_multipliers = [
        ("M1", 0.70, 0.88),
        ("M2", 0.80, 0.90),
        ("M3", 0.90, 0.94),
        ("M4", 0.96, 0.98),
        ("M5", 1.00, 1.00),
        ("M6", 1.04, 1.01),
        ("M7", 1.02, 1.00),
        ("M8", 1.05, 1.02),
        ("M9", 1.03, 1.01),
        ("M10", 1.08, 1.03),
        ("M11", 1.06, 1.02),
        ("M12", 1.10, 1.04),
    ]
    r = (annual_rate / 100.0) / 12.0
    balance = float(principal)
    rows = []

    for m, r_mul, e_mul in ramp_multipliers:
        m_rev = round(monthly_rev * r_mul)
        m_fix = int(fixed_exp)
        m_var = round(variable_exp * e_mul)
        m_tot_exp = m_fix + m_var
        op_profit = m_rev - m_tot_exp

        # Debt service & balance
        if balance > 0 and tenure_months > 0 and r >= 0:
            interest = balance * r
            prnc = min(balance, emi - interest) if emi > interest else 0
            balance = max(0.0, balance - prnc)
        else:
            balance = 0.0

        net_cf = op_profit - emi

        rows.append({
            "month": m,
            "revenue": m_rev,
            "fixed_expense": m_fix,
            "variable_expense": m_var,
            "expense": m_tot_exp,
            "expenses": m_tot_exp,
            "operating_profit": op_profit,
            "emi": emi,
            "net_profit": op_profit - emi,
            "net_cash_flow": net_cf,
            "outstanding_loan": round(balance),
        })

    return rows


def _generate_multi_year_projections(
    projections: list[dict[str, Any]],
    monthly_rev: int,
    monthly_exp: int,
    emi: int,
) -> list[dict[str, Any]]:
    """Generate 3-year summary projections for rural enterprise planning."""
    y1_rev = sum(r["revenue"] for r in projections)
    y1_exp = sum(r["expense"] for r in projections)
    y1_debt = emi * 12
    y1_profit = y1_rev - y1_exp - y1_debt

    y2_rev = round(monthly_rev * 12 * 1.08)
    y2_exp = round(monthly_exp * 12 * 1.05)
    y2_debt = emi * 12
    y2_profit = y2_rev - y2_exp - y2_debt

    y3_rev = round(monthly_rev * 12 * 1.15)
    y3_exp = round(monthly_exp * 12 * 1.09)
    y3_debt = emi * 12
    y3_profit = y3_rev - y3_exp - y3_debt

    return [
        {"year": 1, "revenue": y1_rev, "expenses": y1_exp, "profit": y1_profit, "debt_service": y1_debt, "net_cash_flow": y1_profit},
        {"year": 2, "revenue": y2_rev, "expenses": y2_exp, "profit": y2_profit, "debt_service": y2_debt, "net_cash_flow": y2_profit},
        {"year": 3, "revenue": y3_rev, "expenses": y3_exp, "profit": y3_profit, "debt_service": y3_debt, "net_cash_flow": y3_profit},
    ]


def _generate_amortization_sample(
    principal: int,
    annual_rate: float,
    tenure_months: int,
    emi: int,
) -> list[dict[str, Any]]:
    """Sample amortization schedule rows for milestone months."""
    if principal <= 0 or tenure_months <= 0:
        return []

    r = (annual_rate / 100.0) / 12.0
    balance = float(principal)
    sample_months = {1, 2, 3, 12, 24, 36, 48, 60}
    schedule = []

    for m in range(1, min(tenure_months + 1, 61)):
        interest = balance * r
        prnc = min(balance, emi - interest) if emi > interest else 0
        balance = max(0.0, balance - prnc)

        if m in sample_months or m == tenure_months:
            schedule.append({
                "month": m,
                "principal": round(prnc),
                "interest": round(interest),
                "balance": round(balance),
            })

    return schedule


def get_financial_feasibility_summary(plan: dict[str, Any]) -> dict[str, Any]:
    """
    Extract grounded operational financial feasibility indicators,
    actual parameters, and explicit assumptions from a calculated financial plan.
    """
    project_cost = int(plan.get("project_cost", 0))
    user_capital = int(plan.get("user_capital", 0))
    margin_pct = float(plan.get("margin_pct", 0.0))
    monthly_rev = int(plan.get("expected_monthly_revenue", 0))
    monthly_exp = int(plan.get("monthly_expenses", 0))
    fixed_exp = int(plan.get("fixed_monthly_expenses", 0))
    var_exp = int(plan.get("variable_monthly_expenses", 0))
    monthly_profit = int(plan.get("monthly_profit", 0))
    profit_margin = float(plan.get("profit_margin", 0.0))
    break_even_rev = int(plan.get("break_even_revenue", 0))
    break_even_month = int(plan.get("break_even_month", 0))
    dscr = float(plan.get("dscr", 0.0))
    roi = float(plan.get("roi", 0.0))
    biz_type = str(plan.get("business_type") or "Rural Enterprise")

    # Feasibility evaluation
    if user_capital <= 0 or project_cost <= 0:
        is_feasible = False
        feasibility_status = "Financially Constrained"
    elif margin_pct >= 10.0 and monthly_profit > 0 and dscr >= 1.20:
        is_feasible = True
        feasibility_status = "Highly Feasible"
    elif monthly_profit > 0 and dscr >= 1.00:
        is_feasible = True
        feasibility_status = "Feasible with Conditions"
    else:
        is_feasible = False
        feasibility_status = "Financially Constrained"

    # Scale description and assumptions
    template = business_template_service.match_template(biz_type)
    scale_data = business_template_service.compute_business_scale_and_costs(template, user_capital, project_cost)
    production_scale = scale_data.get("scale_desc", f"{biz_type} Unit")

    assumptions = []
    prod_assump = template.get("production_assumptions", {})
    if "milking_days_per_month" in prod_assump:
        assumptions.append(f"Dairy: ~{prod_assump.get('daily_milk_yield_litres_per_animal', 13)} L/day milk yield at ₹{prod_assump.get('milk_selling_price_per_litre', 42)}/L across {prod_assump.get('milking_days_per_month', 26)} milking days/month.")
    elif "live_bird_selling_price_per_kg" in prod_assump:
        assumptions.append(f"Poultry: 6 batches/year, {prod_assump.get('average_body_weight_kg', 2.1)} kg live bird average at ₹{prod_assump.get('live_bird_selling_price_per_kg', 115)}/kg with {prod_assump.get('survival_rate_pct', 96)}% survival rate.")
    elif "base_daily_sales" in prod_assump:
        assumptions.append(f"Retail: ₹{prod_assump.get('base_daily_sales', 3200):,} average daily turnover across {prod_assump.get('operating_days_per_month', 28)} operating days/month with ~20% gross margin.")
    elif "average_stitching_charges_per_garment" in prod_assump:
        assumptions.append(f"Textile: {prod_assump.get('garments_stitched_per_day_per_station', 6)} garments/day per station at ₹{prod_assump.get('average_stitching_charges_per_garment', 140)} stitching charges across 26 working days.")
    elif "base_daily_kg" in prod_assump:
        assumptions.append(f"Food Processing: Milling at ₹{prod_assump.get('milling_rate_per_kg', 4.5)}/kg plus packaged flour sales operating 26 days/month.")
    else:
        assumptions.append("Enterprise assumes standard rural operating turnover with 26–28 active working days per month.")

    assumptions.append(f"Project Cost of ₹{project_cost:,} funded via ₹{user_capital:,} promoter capital ({margin_pct:.1f}%) and bank financing.")
    assumptions.append(f"Fixed overheads estimated at ₹{fixed_exp:,}/month; break-even monthly revenue threshold is ₹{break_even_rev:,}.")

    return {
        "is_feasible": is_feasible,
        "feasibility_status": feasibility_status,
        "project_cost": project_cost,
        "user_capital": user_capital,
        "margin_pct": margin_pct,
        "monthly_revenue": monthly_rev,
        "monthly_expenses": monthly_exp,
        "fixed_monthly_expenses": fixed_exp,
        "variable_monthly_expenses": var_exp,
        "monthly_profit": monthly_profit,
        "profit_margin": profit_margin,
        "break_even_revenue": break_even_rev,
        "break_even_month": break_even_month,
        "dscr": dscr,
        "roi": roi,
        "production_scale": production_scale,
        "assumptions": assumptions,
    }

