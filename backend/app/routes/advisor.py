"""
GRAMSAARTHI — AI Advisor Routes

POST /api/advisor/ask   → Ask the AI advisor a question with user context & progressive data collection
POST /api/advisor/voice → Dedicated endpoint for speech-to-text transcribed queries (same unified pipeline)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.schemas.advisor import AdvisorRequest, VoiceAdvisorRequest, AdvisorResponse
from app.services import advisor_service
from app.services.auth_service import security, decode_access_token

router = APIRouter()


def validate_auth_if_provided(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User | None:
    """
    FastAPI dependency: Extract user from Authorization Bearer token.
    - If Bearer token is provided but invalid/expired, raises HTTP 401 Unauthorized.
    - If no credentials are provided, returns None (allowing guest access).
    - If valid, returns authenticated User from database.
    """
    if not credentials or not credentials.credentials:
        return None

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(payload["sub"])
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or deactivated.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post(
    "/advisor/ask",
    response_model=AdvisorResponse,
    tags=["AI Advisor"],
    summary="Ask the AI Business Advisor",
)
def ask_advisor(
    req: AdvisorRequest,
    current_user: User | None = Depends(validate_auth_if_provided),
    db: Session = Depends(get_db),
):
    """
    Ask the AI Business Advisor a question (typed or transcribed).
    Receives authenticated user context, handles progressive profile collection,
    retrieves official government scheme data and ML district recommendations.
    """
    return advisor_service.get_advisor_response(req, db=db, current_user=current_user)


@router.post(
    "/advisor/voice",
    response_model=AdvisorResponse,
    tags=["AI Advisor"],
    summary="Ask the AI Business Advisor via Speech-to-Text Transcription",
)
def ask_advisor_voice(
    req: VoiceAdvisorRequest,
    current_user: User | None = Depends(validate_auth_if_provided),
    db: Session = Depends(get_db),
):
    """
    Dedicated endpoint for speech-to-text transcribed queries.
    Accepts speech transcript in `transcript`, `message`, or `question`.
    Identifies authenticated user via Bearer token, validates transcript,
    and passes directly to the same unified advisor_service pipeline.
    """
    req.is_voice = True
    return advisor_service.get_advisor_response(req, db=db, current_user=current_user)
