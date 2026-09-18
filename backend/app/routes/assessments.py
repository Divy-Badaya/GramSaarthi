"""
GRAMSAARTHI — Assessment Routes

POST /api/assessments  → Save a completed assessment
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.assessment import Assessment
from app.models.user import User
from app.schemas.assessment import AssessmentRequest, AssessmentResponse
from app.services.auth_service import get_current_user
from app.services import user_service, finance_service

router = APIRouter()


@router.post(
    "/assessments",
    response_model=AssessmentResponse,
    tags=["Assessments"],
    summary="Save a completed business assessment",
    status_code=201,
)
def create_assessment(
    req: AssessmentRequest,
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save the user's completed assessment form to the database.
    Scoped to authenticated user (or None if anonymous).

    Automatically initializes an initial draft financial plan (status='draft')
    for the user's selected business interest and capital, so the Finance
    dashboard is dynamically initialized with their real assessment parameters.
    """
    user_id = current_user.id if current_user else None

    assessment = Assessment(
        user_id=user_id,
        location=req.location,
        capital=req.capital,
        business_interest=req.business_interest,
        experience=req.experience,
        status="completed",
    )
    db.add(assessment)

    # Sync user's profile capital and business if authenticated
    if current_user:
        if req.business_interest:
            current_user.business_type = req.business_interest
            current_user.business_interest = req.business_interest
        if req.capital is not None:
            current_user.capital = req.capital
            current_user.investment_capacity = req.capital

    db.commit()
    db.refresh(assessment)

    # Automatically generate an initial DRAFT finance plan for the authenticated user
    if current_user and req.business_interest:
        try:
            biz_interest = req.business_interest or "Rural Business"
            user_cap = req.capital if req.capital is not None else 100000
            plan = finance_service.calculate_financial_plan(
                business_type=biz_interest,
                user_capital=user_cap,
                user_profile=current_user,
                status="draft",
            )
            finance_service.save_or_update_user_finance(
                db=db,
                user_id=current_user.id,
                data=plan,
                status="draft",
            )
        except Exception as exc:
            # Non-blocking draft creation
            print(f"[ASSESSMENT] Note initializing draft finance: {exc}")

    # Log activity for authenticated user only (never fallback to user 1 for anonymous)
    if current_user:
        biz_label = req.business_interest or "Business"
        location_label = req.location.split(",")[0] if req.location else "your area"
        user_service.log_activity(
            db,
            activity_type="assessment",
            title=f"Business assessment completed for {biz_label}",
            description=f"Location: {location_label} | Capital: ₹{req.capital:,}" if req.capital else None,
            icon="📊",
            user_id=current_user.id,
        )

    return AssessmentResponse(assessment_id=assessment.id, status="completed")


@router.get(
    "/assessments/latest",
    tags=["Assessments"],
    summary="Get the authenticated user's latest assessment",
)
def get_latest_assessment(
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve the most recent completed assessment for the authenticated user.
    """
    if not current_user:
        return None

    assessment = (
        db.query(Assessment)
        .filter(Assessment.user_id == current_user.id)
        .order_by(Assessment.created_at.desc())
        .first()
    )
    if not assessment:
        return None

    return {
        "assessment_id": assessment.id,
        "location": assessment.location,
        "capital": assessment.capital,
        "business_interest": assessment.business_interest,
        "experience": assessment.experience,
        "status": assessment.status,
        "created_at": assessment.created_at.isoformat() if assessment.created_at else None,
    }


@router.get(
    "/assessments",
    tags=["Assessments"],
    summary="List all assessments for the authenticated user",
)
def list_assessments(
    current_user: User | None = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve all assessments for the authenticated user.
    """
    if not current_user:
        return []

    assessments = (
        db.query(Assessment)
        .filter(Assessment.user_id == current_user.id)
        .order_by(Assessment.created_at.desc())
        .all()
    )
    return [
        {
            "assessment_id": a.id,
            "location": a.location,
            "capital": a.capital,
            "business_interest": a.business_interest,
            "experience": a.experience,
            "status": a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in assessments
    ]

