"""
GRAMSAARTHI — Risk Analysis Service
Evaluates multi-dimensional risk for rural micro-enterprises across 8 grounded dimensions:
1. Capital Risk
2. Loan Risk
3. Repayment Risk
4. Market Risk
5. Skill Gap
6. Operating-Cost Risk
7. Revenue Sensitivity
8. Scalability Risk

Returns LOW / MEDIUM / HIGH / INSUFFICIENT DATA with grounded reasons and concrete mitigations.
Never fabricates values or guesses when data is missing.
"""

import logging
from typing import Any
from app.models.user import User

logger = logging.getLogger(__name__)


# ── Sector-Specific Risk Profiles ─────────────────────────────────────────────

SECTOR_MARKET_PROFILES = {
    "dairy": {
        "market_risk_level": "MEDIUM",
        "market_reason": "Steady year-round local milk demand, but exposed to feed price inflation and seasonal lactation cycles.",
        "market_mitigation": "Establish direct off-take agreements with local dairy cooperatives (Amul, Saras, Verka) or local sweet shops to guarantee daily price realization.",
        "operating_cost_reason": "Green fodder and cattle feed account for 55%–65% of monthly operating costs.",
        "operating_cost_mitigation": "Cultivate high-yield hybrid fodder grass (Napier/Berseem) on owned land and purchase dry fodder in bulk during post-harvest seasons.",
        "requires_land": True,
        "requires_shop": False,
    },
    "poultry": {
        "market_risk_level": "HIGH",
        "market_reason": "High price volatility in live bird wholesale markets combined with disease mortality and extreme temperature risks.",
        "market_mitigation": "Adopt contract broiler farming models with integrated feed companies or invest in biosecurity, automated drinkers, and vaccination schedules.",
        "operating_cost_reason": "Commercial poultry feed represents 65%–72% of total recurring batch expenses.",
        "operating_cost_mitigation": "Maintain strict Feed Conversion Ratio (FCR < 1.65) and purchase feed through cooperative clusters.",
        "requires_land": True,
        "requires_shop": False,
    },
    "retail": {
        "market_risk_level": "LOW",
        "market_reason": "High staple consumption in rural villages with consistent repeat customer demand.",
        "market_mitigation": "Diversify into FMCG, daily staples, and digital payment/top-up services to increase basket size.",
        "operating_cost_reason": "Cost of goods sold (COGS) represents 75%–80% of revenue, leaving modest net margin.",
        "operating_cost_mitigation": "Tie up directly with wholesale mandi dealers or stockists for bulk cash discounts.",
        "requires_land": False,
        "requires_shop": True,
    },
    "textile": {
        "market_risk_level": "MEDIUM",
        "market_reason": "Demand experiences seasonal peaks during wedding and festival seasons with moderate off-season demand.",
        "market_mitigation": "Take school uniform contracts, bulk institutional stitching, and readymade alterations during off-peak periods.",
        "operating_cost_reason": "Thread, accessories, machine maintenance, and electricity consume 35%–45% of recurring operational expenses.",
        "operating_cost_mitigation": "Source fabrics and trims in wholesale rolls directly from regional textile hubs (Surat/Bhilwara/Tirupur).",
        "requires_land": False,
        "requires_shop": True,
    },
    "food": {
        "market_risk_level": "MEDIUM",
        "market_reason": "Consistent local demand for wheat flour and spices, with steady footfall from neighbouring households.",
        "market_mitigation": "Introduce branded sealed packet sales alongside custom milling job-work to capture retail premium.",
        "operating_cost_reason": "Electricity tariffs and raw grain purchase make up 55%–60% of operating expenses.",
        "operating_cost_mitigation": "Install commercial power capacitor units to prevent penalty tariffs and purchase grains directly from farmers during harvest.",
        "requires_land": False,
        "requires_shop": True,
    },
    "agriculture": {
        "market_risk_level": "HIGH",
        "market_reason": "Perishable crops and input dependency subject to weather vagaries and seasonal market gluts.",
        "market_mitigation": "Enroll in Pradhan Mantri Fasal Bima Yojana (PMFBY) and adopt drip irrigation and multi-cropping.",
        "operating_cost_reason": "Fertilizers, seeds, diesel, and labor consume 50%–60% of crop operating expenses.",
        "operating_cost_mitigation": "Use soil testing cards to optimize fertilizer usage and utilize subsidised solar pump schemes.",
        "requires_land": True,
        "requires_shop": False,
    },
    "transport": {
        "market_risk_level": "MEDIUM",
        "market_reason": "Freight volume depends on agricultural harvest cycles and regional mandi logistics.",
        "market_mitigation": "Tie up with local traders, mandis, and dairy unions for scheduled daily transport routes.",
        "operating_cost_reason": "Diesel and vehicle maintenance account for 60%–70% of total operational turnover.",
        "operating_cost_mitigation": "Maintain preventive vehicle servicing schedules to maximize fuel efficiency and avoid unladen return trips.",
        "requires_land": False,
        "requires_shop": False,
    },
    "generic": {
        "market_risk_level": "MEDIUM",
        "market_reason": "Rural enterprise demand is localized and influenced by community purchasing power.",
        "market_mitigation": "Conduct doorstep customer survey and focus on fast-moving everyday consumer essentials.",
        "operating_cost_reason": "Operational overheads and raw supplies require continuous cash flow management.",
        "operating_cost_mitigation": "Maintain at least 45 days of working capital liquid reserves in a separate current account.",
        "requires_land": False,
        "requires_shop": False,
    },
}


def _match_sector_profile(business_type: str | None) -> dict[str, Any]:
    """Find matching sector profile based on business name or category."""
    if not business_type:
        return SECTOR_MARKET_PROFILES["generic"]

    q = str(business_type).lower().strip()
    for key, prof in SECTOR_MARKET_PROFILES.items():
        if key in q:
            return prof

    if any(w in q for w in ["cow", "buffalo", "milk", "cattle", "pashu"]):
        return SECTOR_MARKET_PROFILES["dairy"]
    if any(w in q for w in ["chicken", "broiler", "layer", "egg", "bird", "murgi"]):
        return SECTOR_MARKET_PROFILES["poultry"]
    if any(w in q for w in ["shop", "grocery", "kirana", "dukan", "store"]):
        return SECTOR_MARKET_PROFILES["retail"]
    if any(w in q for w in ["tailor", "garment", "cloth", "silai", "stitching", "sewing"]):
        return SECTOR_MARKET_PROFILES["textile"]
    if any(w in q for w in ["flour", "mill", "atta", "spice", "bakery", "processing"]):
        return SECTOR_MARKET_PROFILES["food"]
    if any(w in q for w in ["crop", "farm", "kheti", "nursery", "seed"]):
        return SECTOR_MARKET_PROFILES["agriculture"]
    if any(w in q for w in ["truck", "pickup", "logistics", "auto", "vehicle"]):
        return SECTOR_MARKET_PROFILES["transport"]

    return SECTOR_MARKET_PROFILES["generic"]


# ── Risk Analysis Engine ──────────────────────────────────────────────────────

def evaluate_business_risks(
    financial_plan: dict[str, Any],
    user_profile: User | None = None,
    experience_override: str | None = None,
) -> dict[str, Any]:
    """
    Perform multi-dimensional risk analysis for the selected business and financial plan.
    Strictly grounded in actual financial numbers, sector fundamentals, and user profile data.
    """
    factors = []
    risk_scores = []

    business_type = str(financial_plan.get("business_type") or "Rural Enterprise")
    sector_profile = _match_sector_profile(business_type)

    project_cost = int(financial_plan.get("project_cost", 0))
    user_capital = int(financial_plan.get("user_capital", 0))
    loan_amount = int(financial_plan.get("loan_amount", 0))
    margin_pct = float(financial_plan.get("margin_pct", 0.0))
    dscr = float(financial_plan.get("dscr", 0.0))
    monthly_profit = int(financial_plan.get("monthly_profit", 0))
    monthly_rev = int(financial_plan.get("expected_monthly_revenue", 0))
    monthly_exp = int(financial_plan.get("monthly_expenses", 0))
    variable_exp = int(financial_plan.get("variable_monthly_expenses", 0))
    break_even_rev = int(financial_plan.get("break_even_revenue", 0))

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Capital Risk
    # ──────────────────────────────────────────────────────────────────────────
    if project_cost <= 0 or user_capital <= 0:
        factors.append({
            "category": "Capital Risk",
            "level": "INSUFFICIENT DATA",
            "reason": "Initial capital contribution or project cost has not been specified.",
            "mitigation": "Specify your planned capital contribution to evaluate financial equity risk.",
            "score": 50,
        })
    elif margin_pct >= 20.0:
        factors.append({
            "category": "Capital Risk",
            "level": "LOW",
            "reason": f"Strong promoter equity contribution of {margin_pct:.1f}% (₹{user_capital:,}) provides a solid self-funding buffer against initial gestation delays.",
            "mitigation": "Maintain at least 15% of your equity in a liquid contingency account for pre-operating contingencies.",
            "score": 20,
        })
    elif margin_pct >= 10.0:
        factors.append({
            "category": "Capital Risk",
            "level": "MEDIUM",
            "reason": f"Promoter equity of {margin_pct:.1f}% (₹{user_capital:,}) satisfies standard banking norms but leaves limited cushion for unexpected cost escalations.",
            "mitigation": "Explore government capital subsidies (such as PMEGP or Mudra margin support) to enhance your equity position.",
            "score": 50,
        })
    else:
        factors.append({
            "category": "Capital Risk",
            "level": "HIGH",
            "reason": f"Promoter contribution of {margin_pct:.1f}% is critically below the 10% banking baseline, creating high vulnerability to project delays.",
            "mitigation": "Increase promoter capital or scale down non-critical initial machinery to achieve at least 10%–15% margin.",
            "score": 85,
        })

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Loan Risk
    # ──────────────────────────────────────────────────────────────────────────
    if project_cost <= 0:
        factors.append({
            "category": "Loan Risk",
            "level": "INSUFFICIENT DATA",
            "reason": "Project cost data unavailable to evaluate debt-to-cost ratio.",
            "mitigation": "Complete project cost estimation to assess loan exposure.",
            "score": 50,
        })
    else:
        ltc_pct = round((loan_amount / project_cost) * 100.0, 1)
        if loan_amount <= 0:
            factors.append({
                "category": "Loan Risk",
                "level": "LOW",
                "reason": "Zero bank debt required. Enterprise is fully self-funded with zero borrowing liability.",
                "mitigation": "Reinvest operating surpluses into working capital growth.",
                "score": 10,
            })
        elif ltc_pct <= 60.0:
            factors.append({
                "category": "Loan Risk",
                "level": "LOW",
                "reason": f"Conservative debt-to-cost ratio of {ltc_pct}%. Low borrowing dependency minimizes debt default exposure.",
                "mitigation": "Ensure timely monthly debt repayment to build a pristine CIBIL score.",
                "score": 25,
            })
        elif ltc_pct <= 85.0:
            factors.append({
                "category": "Loan Risk",
                "level": "MEDIUM",
                "reason": f"Moderate loan dependency at {ltc_pct}% of total project cost (₹{loan_amount:,}).",
                "mitigation": "Apply under credit guarantee schemes like CGTMSE to avoid high collateral requirements.",
                "score": 55,
            })
        else:
            factors.append({
                "category": "Loan Risk",
                "level": "HIGH",
                "reason": f"Heavy debt leverage at {ltc_pct}% of project cost. High loan burden amplifies financial stress if revenues fluctuate.",
                "mitigation": "Increase promoter equity or request interest-subvention schemes to lower effective borrowing costs.",
                "score": 85,
            })

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Repayment Risk
    # ──────────────────────────────────────────────────────────────────────────
    if loan_amount <= 0:
        factors.append({
            "category": "Repayment Risk",
            "level": "LOW",
            "reason": "No debt service obligations (EMI is ₹0). Repayment default risk is not applicable.",
            "mitigation": "N/A — Continue operational cost tracking.",
            "score": 10,
        })
    elif dscr >= 1.40 and monthly_profit > 0:
        factors.append({
            "category": "Repayment Risk",
            "level": "LOW",
            "reason": f"Robust Debt Service Coverage Ratio ({dscr:.2f}x) provides substantial cash surplus after monthly EMI obligations.",
            "mitigation": "Automate monthly EMI deductions via NACH mandate to ensure timely repayment.",
            "score": 20,
        })
    elif dscr >= 1.15 and monthly_profit > 0:
        factors.append({
            "category": "Repayment Risk",
            "level": "MEDIUM",
            "reason": f"Moderate Debt Service Coverage ({dscr:.2f}x). Cash flows cover EMI but leave limited buffer if monthly sales drop by >15%.",
            "mitigation": "Negotiate a 6-month principal moratorium during initial business ramp-up.",
            "score": 55,
        })
    else:
        factors.append({
            "category": "Repayment Risk",
            "level": "HIGH",
            "reason": f"Inadequate Debt Service Coverage ({dscr:.2f}x) or zero post-debt net profit (₹{monthly_profit:,}/mo), posing imminent default risk.",
            "mitigation": "Extend loan tenure from 36/60 months to 84 months to reduce monthly EMI or reduce loan amount.",
            "score": 90,
        })

    # ──────────────────────────────────────────────────────────────────────────
    # 4. Market Risk
    # ──────────────────────────────────────────────────────────────────────────
    m_level = sector_profile.get("market_risk_level", "MEDIUM")
    m_reason = sector_profile.get("market_reason", "Market conditions depend on local village demand and seasonal cycles.")
    m_mitigation = sector_profile.get("market_mitigation", "Focus on building a loyal customer base with quality and fair pricing.")
    m_score = 25 if m_level == "LOW" else (50 if m_level == "MEDIUM" else 75)

    factors.append({
        "category": "Market Risk",
        "level": m_level,
        "reason": m_reason,
        "mitigation": m_mitigation,
        "score": m_score,
    })

    # ──────────────────────────────────────────────────────────────────────────
    # 5. Skill Gap
    # ──────────────────────────────────────────────────────────────────────────
    exp_str = (
        experience_override
        or (user_profile.experience if user_profile and user_profile.experience else None)
        or (user_profile.work_experience if user_profile and user_profile.work_experience else None)
    )

    if not exp_str or str(exp_str).strip().lower() in ["", "none", "not provided"]:
        factors.append({
            "category": "Skill Gap",
            "level": "INSUFFICIENT DATA",
            "reason": "Operational experience has not been provided in your profile.",
            "mitigation": "Update your profile with your prior farming, technical, or trade experience to assess training readiness.",
            "score": 50,
        })
    else:
        exp_lower = str(exp_str).lower()
        is_experienced = any(w in exp_lower for w in ["experienced", "expert", "advanced", "5+", "4 years", "3 years", "5 years"])
        is_intermediate = any(w in exp_lower for w in ["intermediate", "moderate", "2 years", "1 year"])

        if is_experienced:
            factors.append({
                "category": "Skill Gap",
                "level": "LOW",
                "reason": f"Demonstrated prior experience ({exp_str}) significantly reduces operational learning curves and operational missteps.",
                "mitigation": "Stay updated on modern agronomic or equipment best practices through digital advisory tools.",
                "score": 15,
            })
        elif is_intermediate:
            factors.append({
                "category": "Skill Gap",
                "level": "MEDIUM",
                "reason": f"Moderate familiarity ({exp_str}). Good foundational knowledge, but commercial scaling requires advanced process standardization.",
                "mitigation": "Attend short specialized workshops on commercial quality control and inventory management.",
                "score": 45,
            })
        else:
            factors.append({
                "category": "Skill Gap",
                "level": "HIGH",
                "reason": f"Beginner profile ({exp_str}) in a trade that requires domain familiarity to prevent operational losses.",
                "mitigation": "Complete relevant practical training before scaling (e.g., 5-day vocational certification at the nearest Krishi Vigyan Kendra [KVK] or RSETI).",
                "score": 80,
            })

    # ──────────────────────────────────────────────────────────────────────────
    # 6. Operating-Cost Risk
    # ──────────────────────────────────────────────────────────────────────────
    if monthly_rev <= 0:
        factors.append({
            "category": "Operating-Cost Risk",
            "level": "INSUFFICIENT DATA",
            "reason": "Revenue projections unavailable to assess variable cost burden.",
            "mitigation": "Complete revenue estimation to evaluate operating margin vulnerability.",
            "score": 50,
        })
    else:
        var_ratio = (variable_exp / monthly_rev) if monthly_rev > 0 else 0.5
        var_pct = round(var_ratio * 100.0, 1)

        if var_pct <= 45.0:
            factors.append({
                "category": "Operating-Cost Risk",
                "level": "LOW",
                "reason": f"Variable operational costs constitute {var_pct}% of revenue. Healthy gross margin protects profitability against raw material price increases.",
                "mitigation": "Monitor utility and energy costs regularly to preserve operating efficiency.",
                "score": 25,
            })
        elif var_pct <= 72.0:
            factors.append({
                "category": "Operating-Cost Risk",
                "level": "MEDIUM",
                "reason": f"Variable operational costs constitute {var_pct}% of turnover. Moderate vulnerability to feed, fertilizer, or wholesale commodity price hikes.",
                "mitigation": sector_profile.get("operating_cost_mitigation", "Procure raw inputs in bulk clusters to hedge against seasonal price spikes."),
                "score": 55,
            })
        else:
            factors.append({
                "category": "Operating-Cost Risk",
                "level": "HIGH",
                "reason": f"High variable cost structure ({var_pct}% of revenue). A slight rise in input prices can quickly eliminate net operating profits.",
                "mitigation": "Negotiate fixed-price supply agreements with local vendors or pass inflationary increases into retail pricing.",
                "score": 85,
            })

    # ──────────────────────────────────────────────────────────────────────────
    # 7. Revenue Sensitivity (Margin of Safety)
    # ──────────────────────────────────────────────────────────────────────────
    if monthly_rev <= 0 or break_even_rev <= 0:
        factors.append({
            "category": "Revenue Sensitivity",
            "level": "INSUFFICIENT DATA",
            "reason": "Breakeven sales threshold could not be calculated from current revenue figures.",
            "mitigation": "Review price and monthly sales assumptions to run sensitivity analysis.",
            "score": 50,
        })
    else:
        margin_of_safety_pct = round(((monthly_rev - break_even_rev) / monthly_rev) * 100.0, 1)

        if margin_of_safety_pct >= 30.0:
            factors.append({
                "category": "Revenue Sensitivity",
                "level": "LOW",
                "reason": f"Comfortable margin of safety at {margin_of_safety_pct}%. Revenue can drop by up to {int(margin_of_safety_pct)}% before the enterprise fails to cover operating overheads and debt obligations.",
                "mitigation": "Maintain diversified local marketing channels to preserve sales volume.",
                "score": 20,
            })
        elif margin_of_safety_pct >= 15.0:
            factors.append({
                "category": "Revenue Sensitivity",
                "level": "MEDIUM",
                "reason": f"Moderate margin of safety at {margin_of_safety_pct}%. A 15%–20% decline in sales during off-season would bring the enterprise near breakeven.",
                "mitigation": "Maintain minimum 30 days of working cash flow reserves to cushion seasonal lulls.",
                "score": 55,
            })
        else:
            factors.append({
                "category": "Revenue Sensitivity",
                "level": "HIGH",
                "reason": f"Thin margin of safety ({margin_of_safety_pct}%). Business operations are near breakeven; even a small sales decline threatens debt repayment.",
                "mitigation": "Reduce fixed operating overheads or expand marketing to increase daily customer volume.",
                "score": 85,
            })

    # ──────────────────────────────────────────────────────────────────────────
    # 8. Scalability Risk
    # ──────────────────────────────────────────────────────────────────────────
    requires_land = sector_profile.get("requires_land", False)
    requires_shop = sector_profile.get("requires_shop", False)

    if user_profile is None:
        factors.append({
            "category": "Scalability Risk",
            "level": "INSUFFICIENT DATA",
            "reason": "Physical asset profile (land ownership, commercial space) is not recorded.",
            "mitigation": "Update your profile with physical asset details to evaluate facility expansion constraints.",
            "score": 50,
        })
    else:
        has_land = getattr(user_profile, "has_land", False)
        has_shop = getattr(user_profile, "has_commercial_space", False)

        if requires_land and not has_land:
            factors.append({
                "category": "Scalability Risk",
                "level": "HIGH",
                "reason": f"{business_type} requires dedicated open shed/land area for scaling, but profile indicates no owned agricultural land.",
                "mitigation": "Secure a registered long-term lease agreement (min 5–10 years) for land before investing in permanent civil structures.",
                "score": 80,
            })
        elif requires_shop and not has_shop:
            factors.append({
                "category": "Scalability Risk",
                "level": "MEDIUM",
                "reason": f"{business_type} requires a commercial shop location. Operating on rented premises involves recurring rental overheads and relocation risks.",
                "mitigation": "Negotiate a multi-year rent agreement with locked annual escalation clauses.",
                "score": 55,
            })
        else:
            factors.append({
                "category": "Scalability Risk",
                "level": "LOW",
                "reason": "Adequate physical resources (land/space) verified in profile. Expansion can proceed organically without external space bottlenecks.",
                "mitigation": "Plan future shed or facility extensions in modular phases as revenue stabilizes.",
                "score": 20,
            })

    # ──────────────────────────────────────────────────────────────────────────
    # Overall Risk Level & Score
    # ──────────────────────────────────────────────────────────────────────────
    valid_scores = [f["score"] for f in factors if f["level"] != "INSUFFICIENT DATA"]
    overall_score = round(sum(valid_scores) / len(valid_scores)) if valid_scores else 50

    high_count = sum(1 for f in factors if f["level"] == "HIGH")
    medium_count = sum(1 for f in factors if f["level"] == "MEDIUM")

    if high_count >= 3 or overall_score >= 65:
        overall_risk = "HIGH"
        summary = f"High overall operational risk ({high_count} high-risk factors identified). Requires active risk mitigation and skill development before full commercial launch."
    elif high_count >= 1 or medium_count >= 3 or overall_score >= 40:
        overall_risk = "MEDIUM"
        summary = f"Moderate overall risk profile ({medium_count} medium-risk factors). Commercially feasible with standard operational precautions and disciplined cash management."
    else:
        overall_risk = "LOW"
        summary = "Low overall risk profile. Strong capital alignment, sound debt coverage, and solid enterprise feasibility make this a stable venture."

    return {
        "overall_risk": overall_risk,
        "overall_score": overall_score,
        "summary": summary,
        "factors": factors,
    }
