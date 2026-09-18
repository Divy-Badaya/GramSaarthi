"""
GRAMSAARTHI — Recommendation Service

Pipeline:
  1. Extract district + state from the location string.
  2. Query business_ml_service to predict hyper-local opportunity scores using
     the dedicated HistGradientBoosting model (327 features across 979 districts).
  3. Personalize and explain recommendations using personalization_service and explainability_service.

If ML is unavailable or an unmapped location is provided, _rule_based_recommendation() is the fallback.
"""

import logging
from typing import Any
from sqlalchemy.orm import Session

import re
from app.models.business import Business
from app.schemas.assessment import (
    RecommendRequest, RecommendResponse, MetricItem, ReasonItem, LocationDetail, ModelMetadata,
    BusinessExplanation
)
from app.services.business_ml_service import (
    business_ml_service,
    BUSINESS_META,
    TARGET_TO_BUSINESS,
    BUSINESS_TO_TARGET,
)
from app.services.personalization_service import personalization_service
from app.services.explainability_service import explainability_service

logger = logging.getLogger(__name__)


# ── Public API ─────────────────────────────────────────────────────────────────

def get_recommendation(db: Session, req: RecommendRequest, user_profile: Any = None) -> RecommendResponse:
    """
    Main recommendation entry point.

    Priority:
      1. Production Business ML Model (HistGradientBoosting: 327 features, 979 districts)
      2. Fallback: Rule-based engine
    """
    location = _parse_location(req.location)
    if req.village:  location.village = req.village
    if req.block:    location.block = req.block
    if req.district: location.district = req.district
    if req.state:    location.state = req.state

    # Ensure production ML service is loaded
    if not business_ml_service.is_loaded:
        try:
            business_ml_service.load()
        except Exception as load_err:
            logger.warning("[REC_SERVICE] Could not auto-load production business_ml_service: %s", load_err)

    # Auto-resolve missing state if district is present
    if not location.state and user_profile and getattr(user_profile, "state", None):
        location.state = user_profile.state

    if not location.state and business_ml_service.is_loaded and location.district:
        try:
            norm_dist = business_ml_service.normalize_location_text(location.district)
            matches = business_ml_service._feature_store_df[business_ml_service._district_norm == norm_dist]
            if len(matches) == 1:
                location.state = str(matches.iloc[0]["STATE"])
        except Exception:
            pass

    # If district is not extracted but village was set to a known unique district name (e.g. single-string input)
    if not location.district and location.village and business_ml_service.is_loaded:
        try:
            norm_vill = business_ml_service.normalize_location_text(location.village)
            matches = business_ml_service._feature_store_df[business_ml_service._district_norm == norm_vill]
            if len(matches) == 1:
                location.district = location.village
                location.village = None
                location.state = str(matches.iloc[0]["STATE"])
        except Exception:
            pass

    # 1. Primary Engine: Dedicated Production Business ML Model
    if business_ml_service.is_loaded and location.district and location.state:
        try:
            return _production_ml_recommendation(req, location, user_profile=user_profile)
        except Exception as exc:
            logger.warning(
                "[REC_SERVICE] Production ML prediction failed for district '%s': %s. "
                "Executing runtime fallback to rule-based engine.",
                location.district, exc,
            )

    # 2. Fallback: Rule-based engine
    return _rule_based_recommendation(db, req, location, user_profile=user_profile)


def _extract_biz_opportunity_index(biz: str, opportunity_indices: dict[str, float] | None, default: float = 75.0) -> float:
    """Accurately extracts the ML opportunity score for any business across all naming formats."""
    if not opportunity_indices:
        return default
    if biz in opportunity_indices:
        return float(opportunity_indices[biz])
    target_col = BUSINESS_TO_TARGET.get(biz)
    if target_col and target_col in opportunity_indices:
        return float(opportunity_indices[target_col])
    for t_col, b_name in TARGET_TO_BUSINESS.items():
        if b_name.lower() == biz.lower() and t_col in opportunity_indices:
            return float(opportunity_indices[t_col])
    biz_clean = re.sub(r"[^a-z0-9]", "", biz.lower())
    for k, v in opportunity_indices.items():
        k_clean = re.sub(r"[^a-z0-9]", "", k.lower())
        if biz_clean in k_clean or k_clean in biz_clean:
            return float(v)
    return default


def _generate_explanations(
    primary_biz: str,
    top3_businesses: list[str],
    primary_score: int,
    location: LocationDetail,
    capital: int | None,
    experience: str | None,
    opportunity_indices: dict[str, float] | None = None,
    user_profile: Any = None,
) -> tuple[BusinessExplanation, list[BusinessExplanation]]:
    """Generates comprehensive explainable intelligence structures for primary and top-3 recommendations."""
    district = location.district or ""
    state = location.state or ""
    exp = experience or "Beginner"

    # Primary explanation
    primary_opp_idx = _extract_biz_opportunity_index(primary_biz, opportunity_indices, default=75.0)

    primary_explanation = explainability_service.generate_explanation(
        business=primary_biz,
        recommendation_score=primary_score,
        district=district,
        state=state,
        capital=capital,
        experience=exp,
        opportunity_index=primary_opp_idx,
        user_profile=user_profile,
    )

    # Top-3 explanations
    top3_explanations = []
    seen = set()
    for biz in top3_businesses:
        if biz in seen:
            continue
        seen.add(biz)
        if biz.lower() == primary_biz.lower():
            top3_explanations.append(primary_explanation)
            continue

        biz_opp_idx = _extract_biz_opportunity_index(biz, opportunity_indices, default=70.0)

        cap_fit = personalization_service._compute_capital_fit(biz, capital)
        exp_fit = {"Beginner": 70, "Intermediate": 85, "Expert": 98}.get(exp, 70)
        biz_score = int(max(35, min(98, round(0.60 * biz_opp_idx + 0.20 * cap_fit + 0.20 * exp_fit))))

        biz_exp = explainability_service.generate_explanation(
            business=biz,
            recommendation_score=biz_score,
            district=district,
            state=state,
            capital=capital,
            experience=exp,
            opportunity_index=biz_opp_idx,
            user_profile=user_profile,
        )
        top3_explanations.append(biz_exp)

    return primary_explanation, top3_explanations


def _production_ml_recommendation(req: RecommendRequest, location: LocationDetail, user_profile: Any = None) -> RecommendResponse:
    """
    Calls dedicated production business_ml_service (HistGradientBoosting: 327 features,
    979 districts) to predict hyper-local business opportunity scores, then invokes
    personalization_service to apply user capital, experience, and preference rules.
    """
    pred_result = business_ml_service.predict_district(
        state=location.state or "",
        district=location.district,
    )

    raw_scores = pred_result["raw_scores"]
    opportunity_indices = {target: round(score * 100.0, 2) for target, score in raw_scores.items()}

    pers_result = personalization_service.build_recommendation(
        district=pred_result["district"],
        state=pred_result["state"],
        opportunity_indices=opportunity_indices,
        raw_opportunity_scores=raw_scores,
        capital=req.capital,
        experience=req.experience or "Beginner",
        preferred_business=req.business,
        village=location.village,
        block=location.block,
        ml_source="production_ml",
        model_info=pred_result.get("metadata"),
    )

    model_meta = None
    if pers_result.get("model_info"):
        mi = pers_result["model_info"]
        model_meta = ModelMetadata(
            model=mi.get("model_name", "HistGradientBoosting"),
            model_version=mi.get("sklearn_version", "1.6.1"),
            prediction_type=mi.get("task", "Hyper-local business opportunity score prediction"),
            features_used=mi.get("feature_count", 327),
            fallback_used=False,
        )

    # Ensure the top3 recommendations from the production ML model are preserved in order
    top3_ml = pred_result.get("top3", [])
    primary_biz = pers_result["business"]

    if req.business and req.business.strip().lower() != "suggest":
        final_top3 = [primary_biz] + [b for b in top3_ml if b != primary_biz][:2]
    else:
        final_top3 = top3_ml[:3]

    primary_exp, top3_exps = _generate_explanations(
        primary_biz=primary_biz,
        top3_businesses=final_top3,
        primary_score=pers_result["score"],
        location=pers_result["location"],
        capital=pers_result["capital"],
        experience=req.experience,
        opportunity_indices=opportunity_indices,
        user_profile=user_profile,
    )

    return RecommendResponse(
        location=pers_result["location"],
        capital=pers_result["capital"],
        business=primary_biz,
        score=pers_result["score"],
        recommendation=pers_result["recommendation"],
        reasons=pers_result["reasons"],
        metrics=pers_result["metrics"],
        top3=final_top3,
        ml_source="production_ml",
        raw_opportunity_scores=pers_result.get("raw_opportunity_scores"),
        model_info=model_meta,
        explanation=primary_exp,
        top3_explanations=top3_exps,
    )


def get_business_ideas(db: Session, limit: int = 8) -> list[Business]:
    """Return all business ideas ordered by score desc."""
    return db.query(Business).order_by(Business.score.desc()).limit(limit).all()


# ── Rule-based fallback (unchanged from previous implementation) ────────────────

DEMAND_SCORES = {
    "Very High": 95, "High": 85, "Medium": 60, "Low": 35,
}
RISK_SCORES = {
    "Low": 90, "Medium": 65, "Medium-High": 45, "High": 30, "Very High": 15,
}
COMPETITION_SCORES = {
    "Very Low": 92, "Low": 80, "Low-Medium": 72, "Medium": 58,
    "Medium-High": 42, "High": 28, "Very High": 12,
}
EXPERIENCE_MULTIPLIER = {
    "Beginner": 0.90, "Intermediate": 1.00, "Expert": 1.08,
}


def _rule_based_recommendation(db: Session, req: RecommendRequest, location: LocationDetail, user_profile: Any = None) -> RecommendResponse:
    business = _find_business(db, req.business)

    if not business:
        return _default_recommendation(req, location)

    demand_score      = DEMAND_SCORES.get(business.demand, 70)
    competition_score = COMPETITION_SCORES.get(business.competition, 60)
    risk_score        = RISK_SCORES.get(business.risk, 65)
    capital_score     = _capital_fit_score(req.capital, business.investment_min, business.investment_max)

    raw_score  = demand_score * 0.30 + capital_score * 0.25 + risk_score * 0.20 + competition_score * 0.25
    exp_mult   = EXPERIENCE_MULTIPLIER.get(req.experience or "Beginner", 0.90)
    final_score = min(99, max(30, round(raw_score * exp_mult)))

    if final_score >= 80:
        rec_label = "Recommended"
    elif final_score >= 60:
        rec_label = "Feasible"
    else:
        rec_label = "Risky"

    reasons = _build_rule_reasons(business, req.capital, final_score)
    metrics = [
        MetricItem(name="Market Demand",       value=demand_score,              label=business.demand,      color=_demand_color(demand_score)),
        MetricItem(name="Competition",         value=100 - competition_score,   label=business.competition, color=_competition_color(competition_score)),
        MetricItem(name="Profit Potential",    value=min(95, round(business.profit_max / 1200)), label="Good", color="green"),
        MetricItem(name="Location Suitability",value=min(95, final_score + 3),                  label="Good", color="green"),
        MetricItem(name="Risk Level",          value=100 - risk_score,          label=business.risk,        color=_risk_color(risk_score)),
        MetricItem(name="Investment Required", value=capital_score,             label="Moderate",           color="blue"),
    ]

    top3_list = [business.name]
    primary_exp, top3_exps = _generate_explanations(
        primary_biz=business.name,
        top3_businesses=top3_list,
        primary_score=final_score,
        location=location,
        capital=req.capital,
        experience=req.experience,
        opportunity_indices=None,
        user_profile=user_profile,
    )

    return RecommendResponse(
        location=location,
        capital=req.capital,
        business=business.name,
        score=final_score,
        recommendation=rec_label,
        reasons=reasons,
        metrics=metrics,
        top3=top3_list,
        explanation=primary_exp,
        top3_explanations=top3_exps,
    )


def _capital_fit_score(capital: int | None, inv_min: int, inv_max: int) -> int:
    if capital is None:
        return 70
    if capital >= inv_min:
        return 92
    ratio = capital / inv_min if inv_min > 0 else 1
    return max(30, int(ratio * 90))


def _parse_location(location: str | None) -> LocationDetail:
    if not location:
        return LocationDetail()
    parts = [p.strip() for p in location.split(",")]
    if len(parts) >= 4:
        return LocationDetail(
            village=parts[0],
            block=parts[1],
            district=parts[2],
            state=parts[3],
        )
    elif len(parts) == 3:
        return LocationDetail(
            village=parts[0],
            district=parts[1],
            state=parts[2],
        )
    elif len(parts) == 2:
        return LocationDetail(
            district=parts[0],
            state=parts[1],
        )
    return LocationDetail(village=parts[0])


def _find_business(db: Session | None, business_name: str | None) -> Business | None:
    if not db:
        return None
    try:
        if not business_name:
            return db.query(Business).order_by(Business.score.desc()).first()

        name_lower = business_name.lower()
        result = (
            db.query(Business)
            .filter(Business.category.ilike(f"%{name_lower}%"))
            .order_by(Business.score.desc())
            .first()
        )
        if result:
            return result
        return (
            db.query(Business)
            .filter(Business.name.ilike(f"%{name_lower}%"))
            .order_by(Business.score.desc())
            .first()
        )
    except Exception as exc:
        logger.warning("[REC_SERVICE] Database query failed in _find_business: %s. Using default recommendation.", exc)
        return None


def _build_rule_reasons(business: Business, capital: int | None, score: int) -> list[ReasonItem]:
    reasons = []
    if business.demand in ("High", "Very High"):
        reasons.append(ReasonItem(label=f"High local demand for {business.name.lower()}", positive=True))
    else:
        reasons.append(ReasonItem(label="Moderate local demand — market exists but competitive", positive=True))

    if capital and capital >= business.investment_min:
        reasons.append(ReasonItem(label="Fits your available capital", positive=True))
    else:
        reasons.append(ReasonItem(label="Bank loan will be required to bridge capital gap", positive=True))

    if business.competition in ("Low", "Very Low", "Low-Medium"):
        reasons.append(ReasonItem(label="Low to moderate competition in rural areas", positive=True))
    else:
        reasons.append(ReasonItem(label="Moderate competition — differentiation needed", positive=False))

    if business.risk in ("Low", "Medium"):
        reasons.append(ReasonItem(label="Manageable risk level for new entrepreneurs", positive=True))
    else:
        reasons.append(ReasonItem(label="Higher risk — careful planning recommended", positive=False))

    if score >= 75:
        reasons.append(ReasonItem(label="Strong overall market feasibility for your location", positive=True))

    return reasons


def _default_recommendation(req: RecommendRequest, location: LocationDetail, reason: str = "", user_profile: Any = None) -> RecommendResponse:
    biz_name = req.business or "Dairy"
    primary_exp, top3_exps = _generate_explanations(
        primary_biz=biz_name,
        top3_businesses=[biz_name],
        primary_score=78,
        location=location,
        capital=req.capital,
        experience=req.experience,
        opportunity_indices=None,
        user_profile=user_profile,
    )
    return RecommendResponse(
        location=location,
        capital=req.capital,
        business=biz_name,
        score=78,
        recommendation="Feasible",
        reasons=[
            ReasonItem(label="Good local demand for rural businesses", positive=True),
            ReasonItem(label="Capital appears sufficient for entry-level operations", positive=True),
            ReasonItem(label="Government schemes available for this sector", positive=True),
        ],
        metrics=[
            MetricItem(name="Market Demand",        value=80, label="High",     color="green"),
            MetricItem(name="Competition",          value=45, label="Medium",   color="amber"),
            MetricItem(name="Profit Potential",     value=75, label="Good",     color="green"),
            MetricItem(name="Location Suitability", value=78, label="Good",     color="green"),
            MetricItem(name="Risk Level",           value=40, label="Medium",   color="amber"),
            MetricItem(name="Investment Required",  value=70, label="Moderate", color="blue"),
        ],
        explanation=primary_exp,
        top3_explanations=top3_exps,
    )


def _demand_color(score: int) -> str:
    if score >= 80: return "green"
    if score >= 55: return "amber"
    return "red"


def _competition_color(score: int) -> str:
    if score >= 75: return "green"
    if score >= 50: return "amber"
    return "red"


def _risk_color(score: int) -> str:
    if score >= 75: return "green"
    if score >= 50: return "amber"
    return "red"
