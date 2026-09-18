"""
GRAMSAARTHI — Journey Routes
Provides functionality to reset or delete the current authenticated user's business journey.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.models.assessment import Assessment
from app.models.finance import Finance
from app.models.activity import Activity
from app.models.dpr import DPR
from app.schemas.journey import JourneyDeleteResponse, RoadmapResponse
from app.services.auth_service import get_current_user_required
from app.services import roadmap_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/journey", tags=["Journey"])


@router.get(
    "/roadmap",
    response_model=RoadmapResponse,
    summary="Get dynamic personalized business roadmap based on actual user progress",
)
def get_my_roadmap(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Returns the entrepreneur's live 10-step dynamic roadmap.
    Tracks completed steps, active next step, missing requirements, and navigation links.
    Strictly scoped to current_user.id.
    """
    return roadmap_service.evaluate_user_roadmap(db=db, current_user=current_user)


@router.delete(
    "/me",
    response_model=JourneyDeleteResponse,
    summary="Delete and reset current authenticated user's business journey",
)
def delete_my_journey(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Deletes all journey-specific data strictly scoped to current_user.id:
    - User's financial plans (finances)
    - User's completed assessments (assessments)
    - User's journey-related activities (activities)
    - Resets journey-specific fields on the User model.

    Crucially preserves permanent account and demographic profile data:
    - User credentials, authentication, active status, creation dates
    - Name, mobile number, email, preferred language
    - Age, gender, education, occupation
    - State, district, block, village, rural/urban
    - Social category, annual income, special categories
    - Bank account, land, equipment, commercial space, skills, work background

    The entire operation runs inside a database transaction:
    if any step fails, a rollback is triggered so data is never partially deleted.
    """
    user_id = current_user.id
    logger.info(f"[JOURNEY] Starting journey reset for user_id={user_id}")

    try:
        # 1. Delete all user finances
        db.query(Finance).filter(Finance.user_id == user_id).delete(synchronize_session=False)

        # 2. Delete all user assessments
        db.query(Assessment).filter(Assessment.user_id == user_id).delete(synchronize_session=False)

        # 3. Delete user DPR
        db.query(DPR).filter(DPR.user_id == user_id).delete(synchronize_session=False)

        # 4. Delete all user activities associated with the journey
        db.query(Activity).filter(Activity.user_id == user_id).delete(synchronize_session=False)

        # 4. Reset ONLY journey-specific business enterprise fields
        current_user.business_type = None
        current_user.business_name = None
        current_user.business_interest = None
        current_user.business_status = None
        current_user.business_investment = None
        current_user.business_goals = None
        current_user.interested_business_types = None
        current_user.desired_opportunities = None
        current_user.preferred_business_location = None
        current_user.years_in_business = None
        current_user.monthly_revenue = None
        current_user.number_of_employees = None

        # 5. Commit transaction atomically
        db.commit()
        db.refresh(current_user)

        logger.info(f"[JOURNEY] Successfully reset journey for user_id={user_id}")
        return JourneyDeleteResponse(
            status="success",
            message="Your business journey data has been deleted. You can now start a fresh business journey.",
        )

    except Exception as exc:
        db.rollback()
        logger.error(f"[JOURNEY] Failed to delete journey for user_id={user_id}: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete journey data. Changes have been rolled back.",
        )
