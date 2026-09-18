"""
GRAMSAARTHI — DPR (Detailed Project Report) API Endpoints
All endpoints are strictly authenticated and scoped to current_user.id.
Multi-user safe: prevents cross-user access.
"""

import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.models.dpr import DPR
from app.schemas.dpr import (
    DPRStatusResponse,
    DPRResponse,
    DPRGenerateRequest,
    DPRUpdateRequest,
)
from app.services.auth_service import get_current_user_required
from app.services import dpr_service, dpr_pdf_service

router = APIRouter(prefix="/dpr", tags=["DPR"])


@router.get(
    "/status",
    response_model=DPRStatusResponse,
    summary="Check DPR pre-flight readiness and staleness status",
)
def get_status(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Evaluates whether the user has completed Business Selection, Assessment,
    and Finance Plan prerequisites to generate a DPR.
    Also detects if an existing DPR needs regeneration due to updated financials.
    Strictly scoped to current_user.id.
    """
    return dpr_service.get_dpr_status(db=db, current_user=current_user)


@router.get(
    "/me",
    response_model=DPRResponse,
    summary="Get current user's generated DPR",
)
def get_my_dpr(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Retrieve the DPR document for the current authenticated user.
    Returns 404 if user has not yet generated a report.
    Never exposes another user's DPR.
    """
    dpr = dpr_service.get_user_dpr(db=db, current_user=current_user)
    if not dpr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No DPR found for this account. Complete your financial plan and click 'Generate DPR'.",
        )
    return dpr


@router.post(
    "/generate",
    response_model=DPRResponse,
    summary="Generate or regenerate a Detailed Project Report",
)
def generate_dpr_endpoint(
    req: DPRGenerateRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Generates a fresh DPR combining User Profile, Business Selection, Assessment,
    authoritative Finance calculations, and Matched Government Schemes.
    Updates the DPR status to 'generated' and stores the financial snapshot hash.
    Strictly scoped to current_user.id.
    """
    return dpr_service.generate_dpr(
        db=db,
        current_user=current_user,
        language=req.language,
        section_customizations=req.section_customizations,
    )


@router.put(
    "/me",
    response_model=DPRResponse,
    summary="Update section notes or status of current user's DPR",
)
def update_my_dpr(
    req: DPRUpdateRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Save user edits, notes, or status flags to the current user's DPR."""
    return dpr_service.update_user_dpr(
        db=db,
        current_user=current_user,
        section_notes=req.section_notes,
        new_status=req.status,
    )


@router.delete(
    "/me",
    summary="Delete current user's DPR",
)
def delete_my_dpr(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Deletes the current user's DPR record without affecting user account or profile."""
    dpr = db.query(DPR).filter(DPR.user_id == current_user.id).first()
    if not dpr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No DPR found to delete.",
        )
    db.delete(dpr)
    db.commit()
    return {"status": "success", "message": "Detailed Project Report deleted successfully."}


@router.get(
    "/download",
    summary="Download DPR as a professional PDF document",
)
def download_dpr_pdf(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Generates and streams a professional ReportLab PDF of the authenticated user's DPR.
    Uses exact same data as the DPR preview and Finance model.
    """
    dpr = dpr_service.get_user_dpr(db=db, current_user=current_user)
    if not dpr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cannot download: No DPR found. Please generate your report first.",
        )

    # Convert Pydantic model to dictionary
    dpr_dict = dpr.model_dump()

    try:
        pdf_stream = dpr_pdf_service.generate_dpr_pdf_buffer(dpr_dict)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF document: {str(exc)}",
        )

    safe_title = (dpr.business_name or dpr.business_type or "GramSaarthi_DPR").replace(" ", "_")
    filename = f"DPR_{safe_title}_{current_user.id}.pdf"
    encoded_filename = urllib.parse.quote(filename)

    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{encoded_filename}"
        },
    )
