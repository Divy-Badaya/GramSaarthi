"""
GRAMSAARTHI — Schemes Routes

GET  /api/schemes                   → List schemes with optional filters (backwards compatible)
GET  /api/schemes/{scheme_id}       → Get specific scheme details
POST /api/schemes/recommend         → Recommend and rank schemes for user assessment profile
POST /api/schemes/{scheme_id}/eligibility → Evaluate user answers for a specific scheme
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.scheme import (
    SchemeListResponse,
    SchemeRecommendation,
    SchemeRecommendRequest,
    EligibilityEvaluateRequest,
    EligibilityEvaluateResponse,
)
from app.services import scheme_service

router = APIRouter()


@router.get(
    "/schemes",
    tags=["Schemes"],
    summary="Get government schemes",
)
def get_schemes(
    location: str | None = Query(None, description="Filter by location (state/district)"),
    business: str | None = Query(None, description="Filter by business category e.g. Dairy"),
    capital: int | None = Query(None, description="User's available capital in INR"),
    category: str | None = Query(None, description="Scheme category filter e.g. Dairy, Agriculture"),
    project_cost: int | None = Query(None, description="Total project cost in INR"),
    loan_amount: int | None = Query(None, description="Requested loan amount in INR"),
    db: Session = Depends(get_db),
):
    """
    Return government schemes from the official dataset, optionally filtered by location,
    business type, or category. Results are sorted by match score (highest first).
    """
    schemes = scheme_service.get_schemes(
        db,
        location=location,
        business=business,
        capital=capital,
        category=category,
        project_cost=project_cost,
        loan_amount=loan_amount,
    )
    # Ensure descending sort by match score
    schemes.sort(key=lambda s: s.get("match", 0), reverse=True)
    return schemes



@router.get(
    "/schemes/{scheme_id}",
    tags=["Schemes"],
    summary="Get scheme details by ID",
)
def get_scheme(scheme_id: str):
    """
    Fetch complete details of a single government scheme by its ID (e.g. PMMY, PMEGP, KCC).
    """
    scheme = scheme_service.get_scheme_by_id(scheme_id)
    if not scheme:
        raise HTTPException(status_code=404, detail=f"Scheme '{scheme_id}' not found")
    return scheme


@router.post(
    "/schemes/recommend",
    response_model=SchemeListResponse,
    tags=["Schemes"],
    summary="Recommend personalized schemes based on assessment profile",
)
def recommend_schemes(req: SchemeRecommendRequest):
    """
    Evaluate user's assessment profile (business interest, ML recommendations,
    capital, loan needs, location, resources) and return all relevant official schemes
    ranked with match scores, relevance explanations, and indicative eligibility statuses.
    """
    recommendations = scheme_service.recommend_schemes(req.profile)
    return SchemeListResponse(
        total=len(recommendations),
        schemes=recommendations,
    )


@router.post(
    "/schemes/{scheme_id}/eligibility",
    response_model=EligibilityEvaluateResponse,
    tags=["Schemes"],
    summary="Evaluate eligibility for a scheme based on user answers",
)
def evaluate_eligibility(scheme_id: str, req: EligibilityEvaluateRequest):
    """
    Evaluate user's responses to official scheme eligibility questions.
    Returns satisfied criteria, unmet criteria, missing questions, and indicative status.
    """
    target_id = scheme_id or req.scheme_id
    res = scheme_service.evaluate_eligibility(
        scheme_id=target_id,
        answers=req.answers,
        profile=req.profile,
    )
    if res.scheme_name == "Unknown Scheme":
        raise HTTPException(status_code=404, detail=f"Scheme '{target_id}' not found")
    return res
