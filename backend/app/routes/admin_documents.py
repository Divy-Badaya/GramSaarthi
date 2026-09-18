"""
GRAMSAARTHI — Admin Manual Document Verification Routes
Restricted strictly to authorized GRAMSAARTHI Owner / Administrator users.
Enforces role check via get_current_admin_user dependency on every endpoint.
"""

import urllib.parse
from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.schemas.document import (
    AdminDocumentItemResponse,
    AdminDocumentVerificationRequest,
    AdminVerificationStatsResponse,
    AdminVerificationLogResponse,
    DocumentResponse,
)
from app.services.auth_service import get_current_admin_user
from app.services import document_service

router = APIRouter(prefix="/admin/documents", tags=["Admin Documents"])


@router.get(
    "/stats",
    response_model=AdminVerificationStatsResponse,
    summary="Get document verification status counts for admin dashboard",
)
def get_verification_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Returns total counts of pending, verified, rejected, and re-upload required documents."""
    return document_service.admin_get_document_stats(db=db)


@router.get(
    "",
    response_model=list[AdminDocumentItemResponse],
    summary="List documents for admin manual review",
)
def list_admin_documents(
    status: str | None = Query(None, description="Filter by verification status: PENDING, VERIFIED, REJECTED, REUPLOAD_REQUIRED, ALL"),
    category: str | None = Query(None, description="Filter by category e.g. Identity, Financial, Business, Loan, DPR"),
    search: str | None = Query(None, description="Search by document title, filename, user name, phone, or district"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Returns list of submitted documents across entrepreneurs for manual verification.
    Includes document owner profile info and automated system validation checks.
    """
    return document_service.admin_list_documents(
        db=db,
        status_filter=status,
        category=category,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{doc_id}",
    response_model=AdminDocumentItemResponse,
    summary="Get full document verification details for admin",
)
def get_admin_document(
    doc_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Retrieve document metadata, entrepreneur details, and integrity check results."""
    return document_service.admin_get_document_details(db=db, doc_id=doc_id)


@router.get(
    "/{doc_id}/preview",
    summary="Securely preview document for admin manual review",
)
def preview_admin_document(
    doc_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Streams file with Content-Disposition: inline.
    Allows image/PDF rendering in authenticated admin review modal.
    """
    file_path, media_type, client_name = document_service.admin_get_document_file_path(
        db=db,
        doc_id=doc_id,
    )

    headers = {
        "Content-Disposition": f"inline; filename=\"{client_name}\"",
    }

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers=headers,
    )


@router.get(
    "/{doc_id}/download",
    summary="Securely download document for admin verification",
)
def download_admin_document(
    doc_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Streams file with Content-Disposition: attachment for administrative download."""
    file_path, media_type, client_name = document_service.admin_get_document_file_path(
        db=db,
        doc_id=doc_id,
    )

    encoded_filename = urllib.parse.quote(client_name)
    headers = {
        "Content-Disposition": f"attachment; filename=\"{client_name}\"; filename*=UTF-8''{encoded_filename}",
    }

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers=headers,
    )


@router.post(
    "/{doc_id}/verify",
    response_model=DocumentResponse,
    summary="Submit manual verification decision for document",
)
def verify_document(
    doc_id: int,
    req: AdminDocumentVerificationRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Submit verification decision:
    - VERIFIED: marks document verified by GRAMSAARTHI Administrator
    - REJECTED: marks document rejected and adds guidance remark
    - REUPLOAD_REQUIRED: marks document for entrepreneur re-upload
    Records immutable audit entry in document_verification_logs and creates activity alert.
    """
    doc = document_service.admin_verify_document(
        db=db,
        doc_id=doc_id,
        admin_user=current_admin,
        decision=req.decision,
        remark=req.remark,
    )
    return DocumentResponse.model_validate(doc)


@router.get(
    "/{doc_id}/history",
    response_model=list[AdminVerificationLogResponse],
    summary="Get verification audit history for document",
)
def get_verification_history(
    doc_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Returns chronological audit trail of all verification actions on this document."""
    return document_service.admin_get_verification_history(db=db, doc_id=doc_id)
