"""
GRAMSAARTHI — Recommendation Routes

POST /api/recommend                              → ML-powered recommendation
GET  /api/recommend/ideas                        → List of business ideas
GET  /api/recommend/district/{state}/{district}  → Direct ML district lookup
"""

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.services.auth_service import get_current_user, get_current_user_required
from app.schemas.assessment import (
    RecommendRequest,
    RecommendResponse,
    ProductionMLRequest,
    ProductionMLResponse,
    BusinessCompareRequest,
    BusinessCompareResponse,
)
from app.services import recommendation_service

router = APIRouter()


@router.post(
    "/recommend",
    response_model=RecommendResponse,
    tags=["Recommendations"],
    summary="Get ML-powered business recommendation",
)
def recommend(
    req: RecommendRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    """
    Analyze the user's assessment inputs and return an explainable business recommendation.
    Derived from actual model features, district feature store percentiles, and calculations.
    """
    rec_resp = recommendation_service.get_recommendation(db, req, user_profile=current_user)

    if current_user:
        try:
            from app.models.assessment import Assessment
            latest_assessment = (
                db.query(Assessment)
                .filter(Assessment.user_id == current_user.id)
                .order_by(Assessment.created_at.desc())
                .first()
            )
            if latest_assessment:
                if not latest_assessment.business_interest or latest_assessment.business_interest.lower() in ("ai suggest", "suggest", ""):
                    latest_assessment.business_interest = rec_resp.business
                    db.commit()
        except Exception:
            pass

    return rec_resp


@router.get(
    "/recommend/ideas",
    tags=["Recommendations"],
    summary="Get top business ideas",
)
def get_business_ideas(
    location: str | None = Query(None, description="Filter by location (future)"),
    capital: int | None = Query(None, description="Filter by available capital"),
    business: str | None = Query(None, description="Filter by business category"),
    experience: str | None = Query(None, description="Filter by experience level"),
    db: Session = Depends(get_db),
):
    """
    Return the top business opportunities from the database.
    Response matches the `BUSINESS_IDEAS` shape from mockData.js.
    """
    businesses = recommendation_service.get_business_ideas(db)

    return [
        {
            "id": b.id,
            "name": b.name,
            "emoji": b.emoji or "🏪",
            "investment": b.investment_label or f"₹{b.investment_min // 100000}–{b.investment_max // 100000} Lakh",
            "demand": b.demand,
            "competition": b.competition,
            "profit": b.profit_label or f"₹{b.profit_min // 1000}–{b.profit_max // 1000}K/month",
            "risk": b.risk,
            "score": b.score,
        }
        for b in businesses
    ]


# ── Production Business ML Testing Endpoints ─────────────────────────────────

@router.post(
    "/recommend/production-ml",
    response_model=ProductionMLResponse,
    tags=["Recommendations"],
    summary="Get business recommendations from the dedicated production ML model",
)
def recommend_production_ml(req: ProductionMLRequest):
    """
    Dedicated endpoint for the newly trained production ML model (HistGradientBoosting).
    Predicts 10 domain business opportunity scores across 979 Indian districts and ranks
    opportunities descending by score.
    """
    from app.services.business_ml_service import (
        business_ml_service,
        DistrictNotFoundError,
        InvalidLocationError,
        MLServiceError,
    )
    if not business_ml_service.is_loaded:
        try:
            business_ml_service.load()
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Production ML model not loaded: {exc}",
            )
    try:
        return business_ml_service.predict_district(state=req.state, district=req.district)
    except InvalidLocationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except DistrictNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except MLServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failure: {exc}")


@router.get(
    "/recommend/production-ml/scores/{state}/{district}",
    response_model=ProductionMLResponse,
    tags=["Recommendations"],
    summary="Direct GET inspection endpoint for the production ML model",
)
def get_production_ml_scores(state: str, district: str):
    """
    Direct GET inspection endpoint for state + district prediction using the production ML model.
    """
    from app.services.business_ml_service import (
        business_ml_service,
        DistrictNotFoundError,
        InvalidLocationError,
        MLServiceError,
    )
    if not business_ml_service.is_loaded:
        try:
            business_ml_service.load()
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Production ML model not loaded: {exc}",
            )
    try:
        return business_ml_service.predict_district(state=state, district=district)
    except InvalidLocationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except DistrictNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except MLServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference failure: {exc}")


# ── Business Comparison Endpoints ────────────────────────────────────────────

@router.post(
    "/businesses/compare",
    response_model=BusinessCompareResponse,
    tags=["Business Comparison"],
    summary="Compare multiple businesses side-by-side with personalized scoring",
)
def compare_businesses_endpoint(
    req: BusinessCompareRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Compare 2–4 businesses with personalized scoring based on the authenticated
    user's profile, location, capital, and ML-derived opportunity scores.
    Uses strict multi-user isolation (current_user.id).
    """
    from app.models.assessment import Assessment
    from app.services.business_comparison_service import compare_businesses as do_compare

    # Fetch latest completed assessment for current authenticated user
    latest_assessment = (
        db.query(Assessment)
        .filter(Assessment.user_id == current_user.id)
        .order_by(Assessment.id.desc())
        .first()
    )

    # Derive personalized capital
    user_capital = None
    if latest_assessment and latest_assessment.capital:
        user_capital = latest_assessment.capital
    elif current_user.capital:
        user_capital = current_user.capital
    elif current_user.investment_capacity:
        user_capital = current_user.investment_capacity
    else:
        user_capital = 100000

    # Derive personalized experience
    user_experience = None
    if latest_assessment and latest_assessment.experience:
        user_experience = latest_assessment.experience
    elif current_user.experience:
        user_experience = current_user.experience
    else:
        user_experience = "Beginner"

    # Derive personalized location
    user_state = current_user.state
    user_district = current_user.district
    if not user_district and latest_assessment and latest_assessment.location:
        parts = [p.strip() for p in latest_assessment.location.split(",") if p.strip()]
        if len(parts) >= 2:
            user_district = parts[-1]

    try:
        result = do_compare(
            business_types=req.businesses,
            user_state=user_state,
            user_district=user_district,
            user_capital=user_capital,
            user_experience=user_experience,
            user_profile=current_user,
            has_assessment=latest_assessment is not None,
        )
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {exc}")


@router.get(
    "/businesses/types",
    tags=["Business Comparison"],
    summary="Get available business types for comparison selector",
)
def get_business_types():
    """
    Returns the list of available business types from business templates.
    Each entry has id, name, category, and emoji for the selection UI.
    """
    from app.services.business_comparison_service import get_available_business_types
    return get_available_business_types()
