"""
GRAMSAARTHI — Business Comparison Service

Centralized backend engine for comparing multiple businesses side-by-side.
Combines ML opportunity scores, finance calculations, and user profile
to produce personalized comparison metrics and an overall suitability score.

Architecture:
    User Profile + Location
         ↓
    ML Business Recommendation (10 sector scores)
         ↓
    Finance Engine (per-business financial plan)
         ↓
    Comparison Engine (weighted multi-factor scoring)
         ↓
    Structured Comparison Response

Score Semantics (all 0–100, higher = better):
    - Market Demand:    Higher = stronger local market opportunity
    - Competition:      Higher = less competitive / better opportunity
    - Profit Potential: Higher = stronger projected profitability
    - Location Fit:     Higher = better suited to user's district
    - Risk Score:       Higher = lower risk / safer business
    - Low Investment:   Higher = more affordable relative to user capital
"""

import logging
import math
from typing import Any

from app.services import business_template_service
from app.services.finance_service import calculate_financial_plan
from app.services.business_ml_service import (
    business_ml_service,
    TARGET_TO_BUSINESS,
    BUSINESS_TO_TARGET,
)

logger = logging.getLogger(__name__)

# ── Configurable Scoring Weights ──────────────────────────────────────────────
# These can be calibrated later without code changes
SCORE_WEIGHTS = {
    "market_demand": 0.20,
    "competition": 0.15,
    "profit_potential": 0.20,
    "location_fit": 0.20,
    "risk_score": 0.15,
    "low_investment": 0.10,
}

# ── Business Template ID → ML Target Mapping ─────────────────────────────────
# Maps business_templates.json keys to ML model target columns
TEMPLATE_TO_ML_TARGET = {
    "dairy": "dairy_score",
    "poultry": "poultry_score",
    "retail": "retail_score",
    "textile": "textile_score",
    "food": "food_business_score",
    "fisheries": "agriculture_score",      # Fisheries maps to agriculture in ML
    "transport": "logistics_score",
    "agriculture": "agriculture_score",
}

# ── Risk Profiles by Business Type ────────────────────────────────────────────
# Used when ML data is unavailable. Based on industry norms for rural enterprises.
BUSINESS_RISK_PROFILE = {
    "dairy":       {"demand": "High",   "risk": "Medium",  "competition": "Medium"},
    "poultry":     {"demand": "High",   "risk": "Medium",  "competition": "Medium"},
    "retail":      {"demand": "High",   "risk": "Low",     "competition": "High"},
    "textile":     {"demand": "Medium", "risk": "Low",     "competition": "Medium"},
    "food":        {"demand": "High",   "risk": "Medium",  "competition": "Low-Medium"},
    "fisheries":   {"demand": "Medium", "risk": "Medium",  "competition": "Low"},
    "transport":   {"demand": "High",   "risk": "Medium-High", "competition": "Medium"},
    "agriculture": {"demand": "High",   "risk": "Medium",  "competition": "Medium"},
}

# ── Qualitative → Score Mappings ──────────────────────────────────────────────
DEMAND_SCORES = {"Very High": 95, "High": 82, "Medium": 60, "Low": 38}
RISK_TO_SAFETY = {"Low": 88, "Medium": 65, "Medium-High": 45, "High": 30, "Very High": 15}
COMPETITION_TO_OPPORTUNITY = {
    "Very Low": 92, "Low": 80, "Low-Medium": 72, "Medium": 58,
    "Medium-High": 42, "High": 28, "Very High": 12,
}


def compare_businesses(
    business_types: list[str],
    user_state: str | None = None,
    user_district: str | None = None,
    user_capital: int | None = None,
    user_experience: str | None = None,
    user_profile: Any = None,
    has_assessment: bool | None = None,
) -> dict[str, Any]:
    """
    Compare multiple businesses for the authenticated user.

    Args:
        business_types: List of business template IDs (e.g. ["dairy", "poultry", "food"])
        user_state: User's state for ML location scoring
        user_district: User's district for ML location scoring
        user_capital: User's available capital in INR
        user_experience: "Beginner" / "Intermediate" / "Expert"
        user_profile: SQLAlchemy User object for scheme matching
        has_assessment: Whether user has completed a business assessment

    Returns:
        Structured comparison with per-business metrics and recommendation.
    """
    if len(business_types) < 2:
        raise ValueError("At least 2 businesses are required for comparison.")
    if len(business_types) > 4:
        raise ValueError("Maximum 4 businesses can be compared at once.")

    capital = user_capital if user_capital and user_capital > 0 else 100000

    # ── 1. Get ML Scores (once per comparison, not per business) ──────────
    ml_scores = _get_ml_scores(user_state, user_district)

    # ── 2. Build comparison for each business ─────────────────────────────
    comparisons = []
    for biz_type in business_types:
        try:
            comparison = _build_business_comparison(
                business_type=biz_type,
                user_capital=capital,
                user_experience=user_experience or "Beginner",
                user_profile=user_profile,
                ml_scores=ml_scores,
            )
            comparisons.append(comparison)
        except Exception as exc:
            logger.warning(
                "[COMPARE] Failed to build comparison for '%s': %s", biz_type, exc
            )
            comparisons.append(_fallback_comparison(biz_type))

    # ── 3. Determine recommended business ─────────────────────────────────
    best = max(comparisons, key=lambda c: c["overall_score"])
    best["is_recommended"] = True

    # Mark non-recommended
    for c in comparisons:
        if c is not best:
            c["is_recommended"] = False

    # ── 4. Generate recommendation reason ─────────────────────────────────
    reason = _generate_recommendation_reason(best, comparisons)

    assessment_flag = (
        has_assessment
        if has_assessment is not None
        else (user_state is not None and user_district is not None)
    )

    return {
        "recommended_business": {
            "id": best["business_type"],
            "name": best["business_name"],
            "overall_score": best["overall_score"],
            "reason": reason,
        },
        "businesses": comparisons,
        "has_ml_data": ml_scores is not None,
        "has_assessment": assessment_flag,
        "user_capital": capital,
    }


def get_available_business_types() -> list[dict[str, Any]]:
    """
    Return the list of business types available for comparison.
    Uses business templates as the source of truth.
    """
    templates = business_template_service.get_all_templates()

    EMOJI_MAP = {
        "dairy": "🐄", "poultry": "🐔", "retail": "🏪", "textile": "🧵",
        "food": "🌾", "fisheries": "🐟", "transport": "🚛", "agriculture": "🌱",
    }

    result = []
    for key, tmpl in templates.items():
        if key == "generic":
            continue
        result.append({
            "id": key,
            "name": tmpl.get("name", key.title()),
            "category": tmpl.get("category", key.title()),
            "emoji": EMOJI_MAP.get(key, "🏢"),
        })

    return result


# ── Internal: ML Score Retrieval ──────────────────────────────────────────────

def _get_ml_scores(state: str | None, district: str | None) -> dict[str, float] | None:
    """
    Retrieve ML opportunity scores for the user's district.
    Returns None if ML is unavailable or location is missing.
    """
    if not state or not district:
        return None

    if not business_ml_service.is_loaded:
        try:
            business_ml_service.load()
        except Exception as exc:
            logger.warning("[COMPARE] Could not load ML model: %s", exc)
            return None

    try:
        result = business_ml_service.predict_district(state=state, district=district)
        return result.get("raw_scores", None)
    except Exception as exc:
        logger.warning(
            "[COMPARE] ML prediction failed for %s/%s: %s", state, district, exc
        )
        return None


# ── Internal: Per-Business Comparison Builder ─────────────────────────────────

def _build_business_comparison(
    business_type: str,
    user_capital: int,
    user_experience: str,
    user_profile: Any,
    ml_scores: dict[str, float] | None,
) -> dict[str, Any]:
    """Build comprehensive comparison data for a single business."""

    # 1. Template and finance data
    template = business_template_service.match_template(business_type)
    template_id = template.get("id", business_type)

    finance_data = calculate_financial_plan(
        business_type=business_type,
        user_capital=user_capital,
        user_profile=user_profile,
        status="comparison",
    )

    # 2. Extract financial metrics
    project_cost = finance_data.get("project_cost", 0)
    monthly_revenue = finance_data.get("expected_monthly_revenue", 0)
    monthly_expenses = finance_data.get("monthly_expenses", 0)
    monthly_profit = finance_data.get("monthly_profit", 0)
    profit_margin = finance_data.get("profit_margin", 0)
    roi = finance_data.get("roi", 0)
    break_even = finance_data.get("break_even_month", 24)
    emi = finance_data.get("emi", 0)
    dscr = finance_data.get("dscr", 0)
    loan_amount = finance_data.get("loan_amount", 0)

    # 3. Format human-readable values
    investment_display = _format_investment(project_cost)
    profit_display = _format_monthly_amount(monthly_profit)

    # 4. Get risk profile
    risk_profile = BUSINESS_RISK_PROFILE.get(template_id, BUSINESS_RISK_PROFILE.get("retail", {}))
    demand_label = risk_profile.get("demand", "Medium")
    risk_label = risk_profile.get("risk", "Medium")
    competition_label = risk_profile.get("competition", "Medium")

    # 5. Calculate component scores
    ml_target = TEMPLATE_TO_ML_TARGET.get(template_id)
    ml_opp_score = None
    if ml_scores and ml_target and ml_target in ml_scores:
        ml_opp_score = ml_scores[ml_target]  # 0.0–1.0 range

    # Market Demand Score
    if ml_opp_score is not None:
        market_demand_score = int(max(30, min(98, ml_opp_score * 100)))
    else:
        market_demand_score = DEMAND_SCORES.get(demand_label, 65)

    # Competition Score (opportunity = inverse of competitive pressure)
    if ml_opp_score is not None:
        # Higher ML score → better opportunity → lower effective competition
        competition_score = int(max(25, min(95, 100 - (ml_opp_score * 50))))
    else:
        competition_score = COMPETITION_TO_OPPORTUNITY.get(competition_label, 58)

    # Profit Potential Score (from actual financial metrics)
    if profit_margin > 0:
        # Scale: 0% margin → 20, 30%+ margin → 95
        profit_potential_score = int(max(20, min(95, 20 + (profit_margin * 2.5))))
    else:
        profit_potential_score = 30

    # Location Fit Score
    if ml_opp_score is not None:
        location_fit_score = int(max(30, min(98, ml_opp_score * 100)))
    else:
        location_fit_score = 60  # neutral when no ML data

    # Risk Score (higher = safer)
    risk_safety_base = RISK_TO_SAFETY.get(risk_label, 65)
    if dscr > 0:
        # Adjust by DSCR: strong DSCR boosts safety
        dscr_adj = min(15, max(-10, int((dscr - 1.0) * 15)))
        risk_score = int(max(15, min(95, risk_safety_base + dscr_adj)))
    else:
        risk_score = risk_safety_base

    # Low Investment Score (affordability relative to capital)
    if project_cost > 0 and user_capital > 0:
        ratio = user_capital / project_cost
        if ratio >= 0.25:
            low_investment_score = int(min(95, 60 + ratio * 100))
        elif ratio >= 0.10:
            low_investment_score = int(40 + ratio * 200)
        else:
            low_investment_score = int(max(15, ratio * 400))
    else:
        low_investment_score = 50

    # 6. Overall Weighted Score
    overall_score = int(max(30, min(98, round(
        SCORE_WEIGHTS["market_demand"] * market_demand_score +
        SCORE_WEIGHTS["competition"] * competition_score +
        SCORE_WEIGHTS["profit_potential"] * profit_potential_score +
        SCORE_WEIGHTS["location_fit"] * location_fit_score +
        SCORE_WEIGHTS["risk_score"] * risk_score +
        SCORE_WEIGHTS["low_investment"] * low_investment_score
    ))))

    # Experience adjustment
    exp_multiplier = {"Beginner": 0.95, "Intermediate": 1.0, "Expert": 1.05}.get(user_experience, 0.95)
    overall_score = int(max(30, min(98, round(overall_score * exp_multiplier))))

    return {
        "business_type": template_id,
        "business_name": template.get("name", business_type.title()),
        "category": template.get("category", business_type.title()),
        "overall_score": overall_score,
        "is_recommended": False,  # Set later by comparison engine

        # Human-readable overview values
        "investment": investment_display,
        "estimated_profit": profit_display,
        "demand": demand_label,
        "risk": risk_label,

        # Numeric comparison scores (0–100, higher = better)
        "market_demand_score": market_demand_score,
        "competition_score": competition_score,
        "profit_potential_score": profit_potential_score,
        "location_fit_score": location_fit_score,
        "risk_score": risk_score,
        "low_investment_score": low_investment_score,

        # Detailed financial data (for tooltips / analysis)
        "financial": {
            "project_cost": project_cost,
            "user_capital": user_capital,
            "loan_amount": loan_amount,
            "monthly_revenue": monthly_revenue,
            "monthly_expenses": monthly_expenses,
            "monthly_profit": monthly_profit,
            "profit_margin": profit_margin,
            "roi": roi,
            "break_even_months": break_even,
            "emi": emi,
            "dscr": dscr,
        },
    }


def _fallback_comparison(business_type: str) -> dict[str, Any]:
    """Generate a minimal comparison when full calculation fails."""
    templates = business_template_service.get_all_templates()
    tmpl = templates.get(business_type, templates.get("generic", {}))

    return {
        "business_type": business_type,
        "business_name": tmpl.get("name", business_type.title()),
        "category": tmpl.get("category", business_type.title()),
        "overall_score": 50,
        "is_recommended": False,
        "investment": "—",
        "estimated_profit": "—",
        "demand": "Medium",
        "risk": "Medium",
        "market_demand_score": 50,
        "competition_score": 50,
        "profit_potential_score": 50,
        "location_fit_score": 50,
        "risk_score": 50,
        "low_investment_score": 50,
        "financial": {},
        "error": True,
    }


# ── Internal: Recommendation Reason Generator ────────────────────────────────

def _generate_recommendation_reason(
    best: dict[str, Any],
    all_businesses: list[dict[str, Any]],
) -> str:
    """Generate a dynamic, fact-based recommendation reason."""
    score = best["overall_score"]
    name = best["business_name"]

    # Find the strongest dimension
    dimensions = {
        "market demand": best.get("market_demand_score", 0),
        "profit potential": best.get("profit_potential_score", 0),
        "location suitability": best.get("location_fit_score", 0),
        "low risk profile": best.get("risk_score", 0),
        "affordability": best.get("low_investment_score", 0),
        "competitive advantage": best.get("competition_score", 0),
    }

    strongest = max(dimensions, key=dimensions.get)
    strongest_val = dimensions[strongest]

    parts = [f"Highest opportunity score ({score}/100)"]

    if strongest_val >= 70:
        parts.append(f"Best {strongest} for your location")
    elif best.get("profit_potential_score", 0) >= 70:
        parts.append("Strong projected profitability")
    else:
        parts.append("Best overall suitability match")

    return " · ".join(parts)


# ── Internal: Formatting Helpers ──────────────────────────────────────────────

def _format_investment(amount: int) -> str:
    """Format investment amount as ₹XL or ₹X–YL range."""
    if amount <= 0:
        return "—"
    lakhs = amount / 100000
    if lakhs < 1:
        return f"₹{amount // 1000}K"
    # Show a range: ±20%
    low = max(1, math.floor(lakhs * 0.8))
    high = math.ceil(lakhs * 1.2)
    if low == high:
        return f"₹{low}L"
    return f"₹{low}–{high}L"


def _format_monthly_amount(amount: int) -> str:
    """Format monthly profit as ₹XK/mo."""
    if amount <= 0:
        return "—"
    if amount >= 100000:
        return f"₹{amount // 100000}.{(amount % 100000) // 10000}L/mo"
    return f"₹{amount // 1000}K/mo"
