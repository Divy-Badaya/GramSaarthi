"""
GRAMSAARTHI — Document Management Routes
All endpoints require JWT Bearer authentication and are strictly isolated
to current_user.id. Cross-user access is impossible.
"""

import urllib.parse
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.schemas.document import (
    DocumentResponse,
    DocumentSummaryResponse,
    DocumentUpdateRequest,
    DocumentUploadResponse,
    SmartChecklistResponse,
)
from app.services.auth_service import get_current_user_required
from app.services import document_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get(
    "",
    response_model=list[DocumentResponse],
    summary="List current user's documents",
)
def list_documents(
    category: str | None = Query(None, description="Filter by category (Identity, Business, Financial, etc.)"),
    status: str | None = Query(None, description="Filter by status (Missing, Uploaded, Pending Review, Needs Attention)"),
    search: str | None = Query(None, description="Search by document title or filename"),
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Returns documents for authenticated user only.
    Supports optional category, status, and search query filters.
    """
    return document_service.get_user_documents(
        db=db,
        user_id=current_user.id,
        category=category,
        status_filter=status,
        search=search,
    )


@router.get(
    "/checklist",
    response_model=SmartChecklistResponse,
    summary="Get dynamic smart document checklist based on project journey",
)
def get_smart_checklist(
    scheme_id: str | None = Query(None, description="Evaluate requirements for a specific scheme code e.g. PMEGP, KCC"),
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Builds a dynamic document checklist synthesizing:
    - User profile & KYC
    - Active business assessment / recommended business
    - Matched scheme & loan requirements
    - DPR status & uploaded files
    """
    return document_service.build_smart_document_checklist(
        db=db,
        user_id=current_user.id,
        target_scheme_id=scheme_id,
    )


@router.get(
    "/summary",
    response_model=DocumentSummaryResponse,
    summary="Get document counts summary for current user",
)
def get_summary(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Returns aggregated document status counts (total, uploaded, pending_review, needs_attention, missing)
    and category distribution for current user.
    """
    return document_service.get_document_stats(db=db, user_id=current_user.id)


@router.post(
    "/initialize-checklist",
    response_model=list[DocumentResponse],
    summary="Populate standard document checklist for user",
)
def initialize_checklist(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Populates standard required document checklist items (Aadhaar, PAN, Bank Statement, DPR, etc.)
    with status 'Missing' if not already present.
    """
    return document_service.initialize_standard_checklist(db=db, user_id=current_user.id)


@router.get(
    "/{doc_id}",
    response_model=DocumentResponse,
    summary="Get document details by ID",
)
def get_document(
    doc_id: int,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Retrieve document metadata.
    Returns 404 if document does not exist or does not belong to current user.
    """
    return document_service.get_user_document_by_id(
        db=db,
        user_id=current_user.id,
        doc_id=doc_id,
    )


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new document",
)
def upload_document(
    file: UploadFile = File(..., description="PDF, JPG, or PNG document (max 10MB)"),
    title: str = Form(..., description="Document display title e.g. 'Aadhaar Card'"),
    category: str = Form(default="Other", description="Document category"),
    remarks: str | None = Form(default=None, description="Optional notes"),
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Upload a document file with multi-layer validation (extension, MIME, magic bytes, file size).
    Stores file securely on server with UUID filename and associates with current user.
    """
    doc = document_service.upload_new_document(
        db=db,
        user_id=current_user.id,
        file=file,
        title=title,
        category=category,
        remarks=remarks,
    )
    return DocumentUploadResponse(
        status="success",
        message=f"Document '{doc.title}' uploaded successfully.",
        document=DocumentResponse.model_validate(doc),
    )


@router.put(
    "/{doc_id}/upload",
    response_model=DocumentUploadResponse,
    summary="Replace file for an existing document",
)
def replace_document(
    doc_id: int,
    file: UploadFile = File(..., description="Replacement PDF, JPG, or PNG file"),
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Replaces existing document file on disk with a new one.
    Updates file metadata and status to 'Uploaded'.
    Verifies user ownership.
    """
    doc = document_service.replace_document_file(
        db=db,
        user_id=current_user.id,
        doc_id=doc_id,
        file=file,
    )
    return DocumentUploadResponse(
        status="success",
        message=f"File for '{doc.title}' replaced successfully.",
        document=DocumentResponse.model_validate(doc),
    )


@router.put(
    "/{doc_id}",
    response_model=DocumentResponse,
    summary="Update document metadata",
)
def update_document(
    doc_id: int,
    req: DocumentUpdateRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """Update title, category, status, or remarks of an existing document."""
    return document_service.update_document_metadata(
        db=db,
        user_id=current_user.id,
        doc_id=doc_id,
        data=req,
    )


@router.delete(
    "/{doc_id}",
    summary="Delete a document",
)
def delete_document(
    doc_id: int,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Permanently deletes document and its physical file.
    Verifies user ownership.
    """
    document_service.delete_document(
        db=db,
        user_id=current_user.id,
        doc_id=doc_id,
    )
    return {"status": "success", "message": "Document deleted successfully."}


@router.get(
    "/{doc_id}/download",
    summary="Securely download a document",
)
def download_document(
    doc_id: int,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Streams file with Content-Disposition: attachment.
    Requires authentication; strictly checks ownership.
    """
    file_path, media_type, client_name = document_service.get_document_file_path(
        db=db,
        user_id=current_user.id,
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


@router.get(
    "/{doc_id}/preview",
    summary="Preview a document in browser",
)
def preview_document(
    doc_id: int,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """
    Streams file with Content-Disposition: inline.
    Allows image/PDF rendering in authenticated preview modal or iframe.
    Requires authentication; strictly checks ownership.
    """
    file_path, media_type, client_name = document_service.get_document_file_path(
        db=db,
        user_id=current_user.id,
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
