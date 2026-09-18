"""
GRAMSAARTHI — Document Service
Provides secure file upload, multi-layer validation, storage management,
and scoped database operations for user documents.
"""

import os
import re
import uuid
import logging
from pathlib import Path
from typing import BinaryIO

from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from datetime import datetime
from app.config import settings
from app.models.document import Document, DocumentVerificationLog
from app.models.admin_audit import AdminAuditLog
from app.models.activity import Activity
from app.models.user import User
from app.models.assessment import Assessment
from app.models.finance import Finance
from app.models.dpr import DPR
from app.models.notification import Notification
from app.schemas.document import (
    DocumentSummaryResponse,
    DocumentUpdateRequest,
    SmartChecklistItem,
    SmartChecklistResponse,
    AdminDocumentItemResponse,
    AdminDocumentOwnerInfo,
    AdminVerificationStatsResponse,
    AdminVerificationLogResponse,
)
from app.services.scheme_service import SCHEME_METADATA
from app.services import scheme_service, loan_eligibility_service, dpr_pdf_service

logger = logging.getLogger(__name__)


# Allowed extension and MIME configuration
ALLOWED_EXTENSIONS = {"pdf", "jpg", "jpeg", "png"}
ALLOWED_MIMES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
}

# Magic signatures (first N bytes of file)
MAGIC_SIGNATURES = {
    "pdf": [b"%PDF"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "png": [b"\x89PNG\r\n\x1a\n"],
}

# Max upload limit in bytes (10MB default)
MAX_FILE_SIZE = getattr(settings, "MAX_UPLOAD_SIZE_BYTES", 10 * 1024 * 1024)


def get_upload_dir() -> Path:
    """Ensure upload directory exists and return resolved Path."""
    upload_path = Path(settings.UPLOAD_DIR).resolve()
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path


def sanitize_filename(name: str) -> str:
    """Sanitize client-provided filename to prevent directory traversal or malformed strings."""
    if not name:
        return "document"
    # Take only the basename
    base = Path(name).name
    # Keep alphanumeric, dot, underscore, dash, space
    clean = re.sub(r"[^a-zA-Z0-9._\- ]", "_", base).strip()
    return clean[:120] if clean else "document"


def validate_file_content(file: UploadFile, header_bytes: bytes, ext: str) -> None:
    """
    Validate extension, mime type, and binary magic bytes.
    Raises HTTPException(400) if validation fails.
    """
    ext_lower = ext.lower().lstrip(".")
    if ext_lower not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '.{ext_lower}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
        )

    # Check content type header if provided
    ct = (file.content_type or "").lower().strip()
    if ct and ct not in ALLOWED_MIMES and ct != "application/octet-stream":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file MIME type '{file.content_type}'. Allowed types: PDF, JPEG, PNG.",
        )

    # Magic byte signature check
    valid_magics = MAGIC_SIGNATURES.get(ext_lower)
    if valid_magics:
        has_valid_sig = any(header_bytes.startswith(sig) for sig in valid_magics)
        if not has_valid_sig:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File content does not match genuine .{ext_lower} format (magic byte mismatch).",
            )


def save_upload_stream(file: UploadFile, ext: str) -> tuple[str, int, str]:
    """
    Stream and write file to secure UUID location inside UPLOAD_DIR.
    Enforces maximum size limit during streaming.
    Returns (relative_storage_path, total_bytes, resolved_mime_type).
    """
    upload_dir = get_upload_dir()
    clean_ext = ext.lower().lstrip(".")
    unique_name = f"{uuid.uuid4().hex}.{clean_ext}"
    dest_path = (upload_dir / unique_name).resolve()

    # Path traversal assertion
    if not dest_path.is_relative_to(upload_dir):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Illegal storage destination.",
        )

    total_bytes = 0
    header_bytes = b""
    chunk_size = 64 * 1024  # 64 KB chunks

    try:
        with open(dest_path, "wb") as out_f:
            while True:
                chunk = file.file.read(chunk_size)
                if not chunk:
                    break
                if total_bytes == 0:
                    header_bytes = chunk[:16]
                    validate_file_content(file, header_bytes, clean_ext)

                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_SIZE:
                    # Exceeded size limit: remove partially written file
                    out_f.close()
                    if dest_path.exists():
                        dest_path.unlink(missing_ok=True)
                    raise HTTPException(
                        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024 * 1024)} MB.",
                    )


                out_f.write(chunk)

        if total_bytes == 0:
            if dest_path.exists():
                dest_path.unlink(missing_ok=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

    except HTTPException:
        if dest_path.exists():
            dest_path.unlink(missing_ok=True)
        raise
    except Exception as exc:
        if dest_path.exists():
            dest_path.unlink(missing_ok=True)
        logger.error("[DOCUMENTS] Error writing uploaded file: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store uploaded file safely on server.",
        )

    # Standardize MIME
    resolved_mime = {
        "pdf": "application/pdf",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
    }.get(clean_ext, "application/octet-stream")

    return unique_name, total_bytes, resolved_mime


def delete_physical_file(storage_path_name: str | None) -> None:
    """Safely delete stored file from disk if present."""
    if not storage_path_name:
        return
    upload_dir = get_upload_dir()
    file_path = (upload_dir / storage_path_name).resolve()
    if file_path.is_relative_to(upload_dir) and file_path.is_file():
        try:
            file_path.unlink(missing_ok=True)
        except Exception as exc:
            logger.warning("[DOCUMENTS] Could not remove physical file %s: %s", storage_path_name, exc)


# ── Database Operations (All scoped to user_id) ───────────────────────────────

def get_user_documents(
    db: Session,
    user_id: int,
    category: str | None = None,
    status_filter: str | None = None,
    search: str | None = None,
) -> list[Document]:
    """Retrieve list of documents owned by user_id with optional filters."""
    query = db.query(Document).filter(Document.user_id == user_id)

    if category and category.strip() and category.lower() != "all":
        query = query.filter(Document.category.ilike(category.strip()))

    if status_filter and status_filter.strip() and status_filter.lower() != "all":
        query = query.filter(Document.status.ilike(status_filter.strip()))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Document.title.ilike(term)) | (Document.file_name.ilike(term))
        )

    return query.order_by(Document.id.asc()).all()


def initialize_standard_checklist(db: Session, user_id: int) -> list[Document]:
    """
    Populates standard required document checklist items for a user if they have none.
    """
    default_docs = [
        {"title": "Aadhaar Card", "category": "Identity", "status": "Missing"},
        {"title": "PAN Card", "category": "Identity", "status": "Missing"},
        {"title": "Bank Statement (Last 6 Months)", "category": "Financial", "status": "Missing"},
        {"title": "Detailed Project Report (DPR)", "category": "DPR", "status": "Missing"},
        {"title": "Business Premises / Land Records", "category": "Business", "status": "Missing"},
        {"title": "Machinery / Equipment Quotation", "category": "Loan", "status": "Missing"},
        {"title": "Scheme Application Form", "category": "Government Scheme", "status": "Missing"},
    ]

    existing_titles = {d.title.lower() for d in db.query(Document).filter(Document.user_id == user_id).all()}
    added = []
    for item in default_docs:
        if item["title"].lower() not in existing_titles:
            doc = Document(
                user_id=user_id,
                title=item["title"],
                category=item["category"],
                status=item["status"],
            )
            db.add(doc)
            added.append(doc)

    if added:
        db.commit()

    return db.query(Document).filter(Document.user_id == user_id).order_by(Document.id.asc()).all()



def get_document_stats(db: Session, user_id: int) -> DocumentSummaryResponse:
    """Calculate summary document and verification counts for the authenticated user."""
    docs = db.query(Document).filter(Document.user_id == user_id).all()

    total = len(docs)
    uploaded = sum(1 for d in docs if d.status == "Uploaded")
    pending_review = sum(1 for d in docs if d.status == "Pending Review")
    needs_attention = sum(1 for d in docs if d.status == "Needs Attention")
    missing = sum(1 for d in docs if d.status == "Missing")

    # Verification statistics
    pending_verification = sum(1 for d in docs if (getattr(d, "verification_status", "PENDING") or "PENDING") == "PENDING" and d.status != "Missing")
    verified = sum(1 for d in docs if getattr(d, "verification_status", "") == "VERIFIED")
    rejected = sum(1 for d in docs if getattr(d, "verification_status", "") == "REJECTED")
    reupload_required = sum(1 for d in docs if getattr(d, "verification_status", "") == "REUPLOAD_REQUIRED")

    categories_count: dict[str, int] = {}
    for d in docs:
        cat = d.category or "Other"
        categories_count[cat] = categories_count.get(cat, 0) + 1

    return DocumentSummaryResponse(
        total=total,
        uploaded=uploaded,
        pending_review=pending_review,
        needs_attention=needs_attention,
        missing=missing,
        pending_verification=pending_verification,
        verified=verified,
        rejected=rejected,
        reupload_required=reupload_required,
        categories_count=categories_count,
    )


def get_user_document_by_id(db: Session, user_id: int, doc_id: int) -> Document:
    """
    Retrieve specific document belonging to user_id.
    Raises HTTP 404 if not found or belongs to another user.
    """
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == user_id,
    ).first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )
    return doc


def upload_new_document(
    db: Session,
    user_id: int,
    file: UploadFile,
    title: str,
    category: str,
    remarks: str | None = None,
) -> Document:
    """Validate, store physical file, and create new Document record or update matching placeholder."""
    clean_title = (title or "").strip()
    if not clean_title:
        clean_title = sanitize_filename(file.filename or "Uploaded Document")

    # Determine extension
    ext = (Path(file.filename or "").suffix or "").lstrip(".")
    if not ext:
        ext = "pdf"

    storage_name, file_size, resolved_mime = save_upload_stream(file, ext)

    # Check if a matching empty placeholder exists for this user (e.g. from initialize_checklist)
    placeholder = (
        db.query(Document)
        .filter(
            Document.user_id == user_id,
            Document.title.ilike(clean_title),
            Document.status == "Missing",
            Document.storage_path.is_(None),
        )
        .first()
    )

    if placeholder:
        placeholder.title = clean_title
        if category and category.strip():
            placeholder.category = category.strip()
        placeholder.file_name = sanitize_filename(file.filename or clean_title)
        placeholder.file_type = resolved_mime
        placeholder.file_size = file_size
        placeholder.storage_path = storage_name
        placeholder.status = "Uploaded"
        placeholder.remarks = remarks
        # Reset manual verification state on fresh upload
        placeholder.verification_status = "PENDING"
        placeholder.verified_by = None
        placeholder.verified_at = None
        placeholder.verification_remark = None
        db.commit()
        db.refresh(placeholder)
        logger.info("[DOCUMENTS] Updated placeholder document %s for user %s (status=PENDING)", placeholder.id, user_id)
        return placeholder

    doc = Document(
        user_id=user_id,
        title=clean_title,
        category=category.strip() if category else "Other",
        file_name=sanitize_filename(file.filename or clean_title),
        file_type=resolved_mime,
        file_size=file_size,
        storage_path=storage_name,
        status="Uploaded",
        remarks=remarks,
        verification_status="PENDING",
        verified_by=None,
        verified_at=None,
        verification_remark=None,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    logger.info("[DOCUMENTS] Created document %s for user %s (verification_status=PENDING)", doc.id, user_id)
    return doc


def replace_document_file(
    db: Session,
    user_id: int,
    doc_id: int,
    file: UploadFile,
) -> Document:
    """
    Replace the physical file of an existing document.
    Removes previous physical file, updates file metadata, and resets verification to 'PENDING'.
    """
    doc = get_user_document_by_id(db, user_id, doc_id)

    old_storage = doc.storage_path

    ext = (Path(file.filename or "").suffix or "").lstrip(".")
    if not ext:
        ext = "pdf"

    storage_name, file_size, resolved_mime = save_upload_stream(file, ext)

    # Delete previous physical file if any
    delete_physical_file(old_storage)

    doc.file_name = sanitize_filename(file.filename or doc.title)
    doc.file_type = resolved_mime
    doc.file_size = file_size
    doc.storage_path = storage_name
    doc.status = "Uploaded"
    # Reset verification status on new file replacement
    doc.verification_status = "PENDING"
    doc.verified_by = None
    doc.verified_at = None
    doc.verification_remark = None

    db.commit()
    db.refresh(doc)
    logger.info("[DOCUMENTS] Replaced file for document %s (user %s, verification_status=PENDING)", doc.id, user_id)
    return doc


def update_document_metadata(
    db: Session,
    user_id: int,
    doc_id: int,
    data: DocumentUpdateRequest,
) -> Document:
    """
    Update title, category, status, or remarks of an existing document.
    Normal user cannot update verification_status or verified_by.
    """
    doc = get_user_document_by_id(db, user_id, doc_id)

    if data.title is not None and data.title.strip():
        doc.title = data.title.strip()
    if data.category is not None and data.category.strip():
        doc.category = data.category.strip()
    if data.status is not None and data.status.strip():
        doc.status = data.status.strip()
    if data.remarks is not None:
        doc.remarks = data.remarks.strip() if data.remarks else None

    db.commit()
    db.refresh(doc)
    return doc


def delete_document(db: Session, user_id: int, doc_id: int) -> None:
    """
    Delete document and its physical file from disk.
    Strictly verifies ownership.
    """
    doc = get_user_document_by_id(db, user_id, doc_id)
    delete_physical_file(doc.storage_path)
    db.delete(doc)
    db.commit()
    logger.info("[DOCUMENTS] Deleted document %s (user %s)", doc_id, user_id)


def sync_dpr_document(db: Session, user_id: int, dpr: DPR | None = None) -> Document | None:
    """
    Ensure the user's DPR is synchronized with the documents table.
    - If dpr is present and status is 'generated', document status is 'Uploaded'
    - If dpr is present and status is 'needs_update', document status is 'Needs Attention'
    - Creates or writes physical ReportLab PDF to UPLOAD_DIR if not already present
    """
    if dpr is None:
        dpr = db.query(DPR).filter(DPR.user_id == user_id).first()

    if not dpr:
        return None

    # Check if DPR is stale compared to current finance parameters
    finance_rec = db.query(Finance).filter(Finance.user_id == user_id).first()
    if finance_rec and dpr.finance_snapshot_hash:
        from app.services.dpr_service import compute_finance_snapshot_hash
        current_hash = compute_finance_snapshot_hash(finance_rec)
        if dpr.finance_snapshot_hash != current_hash and dpr.status != "needs_update":
            dpr.status = "needs_update"
            db.commit()

    # Check for existing DPR document in documents table
    doc = (
        db.query(Document)
        .filter(
            Document.user_id == user_id,
            (Document.category == "DPR") | (Document.title.ilike("%Detailed Project Report%")),
        )
        .first()
    )

    safe_title = re.sub(r"[^a-zA-Z0-9_\-]", "_", dpr.business_name or dpr.business_type or "Project").strip("_")
    file_name = f"DPR_{safe_title}_{user_id}.pdf"
    storage_file = f"dpr_{user_id}_{dpr.id}.pdf"
    upload_dir = get_upload_dir()
    disk_path = (upload_dir / storage_file).resolve()

    # Generate physical file if missing or dpr status is generated
    file_size = None
    if dpr.report_data and dpr.status == "generated":
        try:
            pdf_buf = dpr_pdf_service.generate_dpr_pdf_buffer(dpr.report_data)
            pdf_bytes = pdf_buf.getvalue()
            with open(disk_path, "wb") as f:
                f.write(pdf_bytes)
            file_size = len(pdf_bytes)
        except Exception as exc:
            logger.warning("[DOCUMENTS] Could not pre-generate DPR PDF for user %s: %s", user_id, exc)

    if not file_size and disk_path.is_file():
        file_size = disk_path.stat().st_size

    target_status = "Uploaded" if dpr.status == "generated" else ("Needs Attention" if dpr.status == "needs_update" else "Missing")
    remarks = (
        "Generated via GramSaarthi DPR Studio. Bankable ReportLab PDF ready."
        if dpr.status == "generated"
        else "Financial figures updated. Open DPR Studio to re-sync report."
    )

    if not doc:
        doc = Document(
            user_id=user_id,
            title="Detailed Project Report (DPR)",
            category="DPR",
            file_name=file_name,
            file_type="application/pdf",
            file_size=file_size,
            storage_path=storage_file if disk_path.is_file() else None,
            status=target_status,
            remarks=remarks,
        )
        db.add(doc)
    else:
        doc.title = "Detailed Project Report (DPR)"
        doc.category = "DPR"
        doc.file_name = file_name
        doc.file_type = "application/pdf"
        if file_size:
            doc.file_size = file_size
        if disk_path.is_file():
            doc.storage_path = storage_file
        doc.status = target_status
        doc.remarks = remarks

    db.commit()
    db.refresh(doc)
    return doc


def get_document_file_path(db: Session, user_id: int, doc_id: int) -> tuple[Path, str, str]:
    """
    Verify ownership, check file existence, and return (resolved_path, media_type, client_filename).
    Raises HTTP 404 if document has no physical file or file is missing from disk.
    For DPR documents, generates PDF buffer if missing from disk.
    """
    doc = get_user_document_by_id(db, user_id, doc_id)

    upload_dir = get_upload_dir()

    # If this is a DPR document and the physical file is missing from disk, regenerate it
    if doc.category == "DPR" and (not doc.storage_path or not (upload_dir / doc.storage_path).is_file()):
        dpr = db.query(DPR).filter(DPR.user_id == user_id).first()
        if dpr and dpr.report_data:
            sync_dpr_document(db, user_id, dpr)
            doc = get_user_document_by_id(db, user_id, doc_id)

    if not doc.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document has no uploaded file content.",
        )

    file_path = (upload_dir / doc.storage_path).resolve()

    if not file_path.is_relative_to(upload_dir) or not file_path.is_file():
        logger.error("[DOCUMENTS] Physical file missing for doc %s at %s", doc_id, file_path)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file is missing from storage.",
        )

    media_type = doc.file_type or "application/octet-stream"
    client_name = doc.file_name or f"{doc.title}.pdf"
    return file_path, media_type, client_name


def build_smart_document_checklist(
    db: Session,
    user_id: int,
    target_scheme_id: str | None = None,
) -> SmartChecklistResponse:
    """
    Synthesize dynamic document requirements for the authenticated user by connecting:
    - User Profile (demographics, social category, land, bank account, commercial premises)
    - Latest Assessment (assessed business interest, score, recommendation)
    - Active Finance plan (loan requirement, project cost, matched scheme)
    - Centralized Loan Eligibility Engine (score, underwriting recommendations)
    - Generated DPR (dprs table synchronized to documents portfolio)
    - Official Government Scheme requirements (SCHEME_METADATA)
    - Existing uploaded documents in database (with prioritized reconciliation)
    """
    user = db.query(User).filter(User.id == user_id).first()
    latest_assessment = (
        db.query(Assessment)
        .filter(Assessment.user_id == user_id)
        .order_by(Assessment.id.desc())
        .first()
    )
    finance = (
        db.query(Finance)
        .filter(Finance.user_id == user_id)
        .order_by(Finance.id.desc())
        .first()
    )
    dpr = db.query(DPR).filter(DPR.user_id == user_id).first()

    # Sync DPR to documents portfolio if DPR exists
    dpr_doc = sync_dpr_document(db, user_id, dpr) if dpr else None

    # Retrieve current documents owned by user
    uploaded_docs = db.query(Document).filter(Document.user_id == user_id).all()

    # Determine active business
    active_biz = ""
    if finance and finance.business_type:
        active_biz = finance.business_type
    elif latest_assessment and latest_assessment.business_interest:
        active_biz = latest_assessment.business_interest
    elif user and user.business_type:
        active_biz = user.business_type
    elif user and user.business_interest:
        active_biz = user.business_interest
    else:
        active_biz = "Rural Enterprise"

    # Query available matching schemes for user's profile and active business
    available_schemes: list[dict] = []
    try:
        user_cap = user.capital if user else (latest_assessment.capital if latest_assessment else None)
        rec_schemes = scheme_service.get_schemes(db, business=active_biz, capital=user_cap)
        for sc in rec_schemes[:6]:
            available_schemes.append({
                "id": sc.get("id"),
                "name": sc.get("name"),
                "match_score": sc.get("match", 0),
                "category": sc.get("category", ""),
                "subsidy": sc.get("subsidy", ""),
                "max_loan": sc.get("max_loan", ""),
            })
    except Exception as exc:
        logger.debug("[DOCUMENTS] Could not query available schemes: %s", exc)

    # Determine active matched scheme
    scheme_id = None
    scheme_name = None
    if target_scheme_id and target_scheme_id.upper() in SCHEME_METADATA:
        scheme_id = target_scheme_id.upper()
        match = next((s for s in available_schemes if s["id"] == scheme_id), None)
        scheme_name = match["name"] if match else SCHEME_METADATA[scheme_id].get("who", scheme_id)
    elif finance and finance.matched_scheme_id and finance.matched_scheme_id in SCHEME_METADATA:
        scheme_id = finance.matched_scheme_id
        scheme_name = finance.matched_scheme_name
    elif available_schemes:
        scheme_id = available_schemes[0]["id"]
        scheme_name = available_schemes[0]["name"]
    elif user and getattr(user, "matched_scheme_id", None) and user.matched_scheme_id in SCHEME_METADATA:
        scheme_id = user.matched_scheme_id

    if not scheme_id or scheme_id not in SCHEME_METADATA:
        scheme_id = "PMMY"
        scheme_name = "Pradhan Mantri MUDRA Yojana (PMMY)"
    elif not scheme_name:
        scheme_name = f"Government Scheme ({scheme_id})"

    # Determine loan requirement & evaluate loan eligibility
    loan_amount = finance.loan_amount if finance else 0
    has_loan = bool(loan_amount and loan_amount > 0) or (finance is not None)
    loan_elig_score = None
    loan_elig_status = None
    if user and (finance or latest_assessment):
        try:
            loan_eval = loan_eligibility_service.evaluate_user_loan_eligibility(db, user)
            if loan_eval:
                loan_elig_score = loan_eval.get("eligibility_score")
                loan_elig_status = loan_eval.get("eligibility_status")
        except Exception as exc:
            logger.debug("[DOCUMENTS] Could not evaluate loan eligibility: %s", exc)

    # Build raw requirement specs
    requirements: list[dict] = []

    # ── 1. Core Identity & Universal KYC ──────────────────────────────────────
    requirements.append({
        "id": "req_aadhaar",
        "title": "Aadhaar Card",
        "category": "Identity",
        "required_for": ["Universal Government KYC", "Direct Benefit Transfer (DBT)", f"{scheme_id} Verification"],
        "reason": "Mandatory biometric and identity verification across all Indian institutional banks and government portals.",
        "source": "kyc",
    })
    requirements.append({
        "id": "req_pan",
        "title": "PAN Card",
        "category": "Identity",
        "required_for": ["Commercial Bank Account", "Credit Appraisal (CIBIL)", "Tax Compliance"],
        "reason": "Required for institutional loan sanction, credit bureau evaluation, and transactions exceeding ₹50,000.",
        "source": "kyc",
    })

    # ── 2. Loan & Banking Requirements ────────────────────────────────────────
    if has_loan:
        requirements.append({
            "id": "req_bank_stmt",
            "title": "Bank Statement (Last 6 Months)",
            "category": "Financial",
            "required_for": ["Institutional Bank Loan Appraisal", "Debt Service Coverage (DSCR) Audit"],
            "reason": "Demonstrates operating cash flow, banking discipline, and debt repayment capability for credit underwriters.",
            "source": "loan",
        })
        requirements.append({
            "id": "req_quotation",
            "title": "Machinery / Equipment Quotation",
            "category": "Loan",
            "required_for": ["Term Loan Sanction", "Direct Vendor Disbursement"],
            "reason": "Standard banking condition under RBI guidelines to justify capital expenditure outlay prior to loan disbursement.",
            "source": "loan",
        })
        # If loan exceeds unsecured priority limit (₹20 Lakh), require collateral property deed
        if loan_amount and loan_amount > 2000000:
            requirements.append({
                "id": "req_collateral_docs",
                "title": "Collateral Property Title Deed / Valuation Certificate",
                "category": "Loan",
                "required_for": ["Commercial Bank Loan Appraisal", "Secondary Collateral Security"],
                "reason": "Required by commercial lending institutions for credit facilities exceeding unsecured priority sector limits (₹20 Lakh).",
                "source": "loan",
            })

    # ── 3. Demographic & Category Specific Requirements ──────────────────────
    if user and user.social_category and str(user.social_category).strip().upper() in ("SC", "ST", "OBC"):
        cat_name = str(user.social_category).strip().upper()
        requirements.append({
            "id": "req_caste_cert",
            "title": "Caste / Category Certificate",
            "category": "Identity",
            "required_for": [f"{cat_name} Affirmative Subsidy", f"{scheme_id} Priority Verification"],
            "reason": f"Official certificate required to verify {cat_name} classification for higher government margin money subsidies.",
            "source": "kyc",
        })

    if user and user.rural_or_urban and "rural" in str(user.rural_or_urban).lower() and scheme_id == "PMEGP":
        requirements.append({
            "id": "req_rural_cert",
            "title": "Rural Area Certificate",
            "category": "Government Scheme",
            "required_for": ["PMEGP Rural Area Subsidy (35% vs 25% Urban)"],
            "reason": "Certificate from Gram Panchayat or Block Development Officer (BDO) verifying rural unit location.",
            "source": "scheme",
            "scheme_id": "PMEGP",
        })

    # ── 4. Business-Specific Requirements (From active business) ──────────────
    biz_lower = active_biz.lower()
    if any(k in biz_lower for k in ["dairy", "cattle", "livestock", "milk", "buffalo"]):
        requirements.append({
            "id": "req_biz_dairy_space",
            "title": "Livestock & Shed Space Declaration",
            "category": "Business",
            "required_for": [f"{active_biz} Viability", "Animal Welfare Verification"],
            "reason": "Proves physical shelter capacity, stall-feeding arrangements, and green fodder cultivation access.",
            "source": "business",
        })
        requirements.append({
            "id": "req_biz_dairy_premises",
            "title": "Premises Lease Deed / Land Record",
            "category": "Business",
            "required_for": [f"{active_biz} Location Possession", "Bank Collateral Appraisal"],
            "reason": "Validates legal right to operate rural dairy unit on family-owned or leased rural farmland.",
            "source": "business",
        })
    elif any(k in biz_lower for k in ["poultry", "broiler", "layer"]):
        requirements.append({
            "id": "req_biz_poultry_lease",
            "title": "Poultry Farm Land Lease or Ownership Proof",
            "category": "Business",
            "required_for": [f"{active_biz} Unit Setup", "Biosecurity Compliance"],
            "reason": "Minimum 10-year registered lease deed or ownership document satisfying rural biosecurity buffer norms.",
            "source": "business",
        })
        requirements.append({
            "id": "req_biz_poultry_training",
            "title": "Training / Experience Certificate in Poultry",
            "category": "Business",
            "required_for": ["Technical Feasibility Assessment", "Bank Loan Underwriting"],
            "reason": "Certification from KVK or recognized animal husbandry institute demonstrating flock management proficiency.",
            "source": "business",
        })
    elif any(k in biz_lower for k in ["food", "bakery", "spice", "flour", "oil", "processing"]):
        requirements.append({
            "id": "req_biz_fssai",
            "title": "FSSAI Registration / Food Safety Intent",
            "category": "Business",
            "required_for": ["Food Safety Compliance", "Commercial Retail Clearance"],
            "reason": "Regulatory food safety registration required by banks to finance food manufacturing and packaging enterprises.",
            "source": "business",
        })
        requirements.append({
            "id": "req_biz_premises_food",
            "title": "Commercial Premises / Unit Possession Proof",
            "category": "Business",
            "required_for": ["FSSAI Inspection", "Machinery Installation"],
            "reason": "Proof of commercial / rural industrial shed with access to potable water and electricity.",
            "source": "business",
        })
    elif any(k in biz_lower for k in ["agriculture", "farming", "crop", "horticulture", "solar"]):
        requirements.append({
            "id": "req_biz_khasra",
            "title": "Farmer Land Record (Khasra / Khatauni / Patta)",
            "category": "Business",
            "required_for": ["Agricultural Land Verification", "Scheme Subsidy Disbursement"],
            "reason": "Official land revenue extract verifying cultivable operational landholding in the applicant's name.",
            "source": "business",
        })
    elif any(k in biz_lower for k in ["retail", "shop", "kirana", "store", "digital"]):
        requirements.append({
            "id": "req_biz_shop_rent",
            "title": "Shop Commercial Premises Rent Agreement",
            "category": "Business",
            "required_for": ["Shop & Establishment Act Verification", "Business Location Proof"],
            "reason": "Commercial tenancy agreement proving a designated physical storefront with trade license eligibility.",
            "source": "business",
        })
    else:
        requirements.append({
            "id": "req_biz_udyam",
            "title": "Udyam MSME Registration Certificate",
            "category": "Business",
            "required_for": ["Priority Sector Lending Benefits", "Interest Subvention"],
            "reason": "Formal government certificate proving MSME classification under Ministry of MSME guidelines.",
            "source": "business",
        })
        requirements.append({
            "id": "req_biz_premises_gen",
            "title": "Premises Agreement or Ownership Proof",
            "category": "Business",
            "required_for": [f"{active_biz} Location Possession", "Bank Security"],
            "reason": "Title or tenancy deed confirming lawful possession of the rural enterprise premises.",
            "source": "business",
        })

    # ── 5. Matched Scheme Requirements (From SCHEME_METADATA) ────────────────
    scheme_meta = SCHEME_METADATA.get(scheme_id)
    if scheme_meta and "docs" in scheme_meta:
        for s_doc in scheme_meta["docs"]:
            s_clean = s_doc.strip()
            lower_s = s_clean.lower()
            if "aadhaar" in lower_s:
                for r in requirements:
                    if r["id"] == "req_aadhaar" and f"{scheme_id} Eligibility" not in r["required_for"]:
                        r["required_for"].append(f"{scheme_id} Eligibility")
                continue
            if "pan" in lower_s:
                for r in requirements:
                    if r["id"] == "req_pan" and f"{scheme_id} Sanction" not in r["required_for"]:
                        r["required_for"].append(f"{scheme_id} Sanction")
                continue
            if "bank statement" in lower_s:
                for r in requirements:
                    if r["id"] == "req_bank_stmt" and f"{scheme_id} Disbursement" not in r["required_for"]:
                        r["required_for"].append(f"{scheme_id} Disbursement")
                continue
            if "caste" in lower_s and any(r["id"] == "req_caste_cert" for r in requirements):
                for r in requirements:
                    if r["id"] == "req_caste_cert" and f"{scheme_id} Subsidy" not in r["required_for"]:
                        r["required_for"].append(f"{scheme_id} Subsidy")
                continue
            if "rural" in lower_s and any(r["id"] == "req_rural_cert" for r in requirements):
                continue
            if "dpr" in lower_s or "project report" in lower_s:
                continue

            # Unique scheme requirement
            requirements.append({
                "id": f"req_scheme_{len(requirements)}",
                "title": s_clean,
                "category": "Government Scheme",
                "required_for": [f"{scheme_name or scheme_id} Application", f"{scheme_id} Subsidy Verification"],
                "reason": f"Mandatory eligibility document specified under official {scheme_id} government guidelines.",
                "source": "scheme",
                "scheme_id": scheme_id,
            })

    # ── 6. Detailed Project Report (DPR) Integration ──────────────────────────
    dpr_req = {
        "id": "req_dpr",
        "title": "Detailed Project Report (DPR)",
        "category": "DPR",
        "required_for": ["Institutional Bank Loan Appraisal", f"{scheme_name or 'Scheme'} Subsidy Sanction"],
        "reason": "19-section techno-economic project report with projected cash flows, debt service coverage (DSCR), and break-even analysis.",
        "source": "dpr",
        "is_dpr": True,
    }

    if dpr:
        dpr_req["dpr_id"] = dpr.id
        if dpr_doc:
            dpr_req["document_id"] = dpr_doc.id
            dpr_req["file_name"] = dpr_doc.file_name
            dpr_req["file_type"] = dpr_doc.file_type
            dpr_req["file_size"] = dpr_doc.file_size
            dpr_req["updated_at"] = dpr_doc.updated_at or dpr_doc.created_at
        else:
            dpr_req["file_name"] = f"DPR_{dpr.business_name or dpr.business_type or 'Project'}_{user_id}.pdf"
            dpr_req["file_type"] = "application/pdf"
            dpr_req["updated_at"] = dpr.updated_at or dpr.created_at

        dpr_req["status"] = "Uploaded" if dpr.status == "generated" else "Needs Attention"
        dpr_req["verification_status"] = "VERIFIED" if dpr.status == "generated" else "PENDING"
        dpr_req["remarks"] = (
            "Generated via GramSaarthi DPR Studio. Bankable ReportLab PDF ready."
            if dpr.status == "generated"
            else "Financial figures updated. Open DPR Studio to re-sync report."
        )
        dpr_req["action_route"] = "/dpr"
    else:
        dpr_req["status"] = "Missing"
        dpr_req["verification_status"] = "PENDING"
        dpr_req["remarks"] = "Not generated yet. Complete financial plan and click 'Generate DPR' in DPR Studio."
        dpr_req["action_route"] = "/dpr"

    requirements.append(dpr_req)

    # ── 7. Reconcile with Uploaded Documents (documents table) ────────────────
    matched_doc_ids = set()

    # Pre-register DPR document ID to prevent DPR duplication in user uploads
    if dpr_doc:
        matched_doc_ids.add(dpr_doc.id)
    for doc in uploaded_docs:
        if doc.category == "DPR" or (doc.title and "detailed project report" in doc.title.lower()):
            matched_doc_ids.add(doc.id)

    for req in requirements:
        if req.get("is_dpr"):
            continue

        req_title_lower = req["title"].lower()

        # Gather all candidates matching this requirement
        candidate_docs: list[Document] = []
        for doc in uploaded_docs:
            if doc.id in matched_doc_ids:
                continue
            doc_title_lower = (doc.title or "").lower()
            doc_file_lower = (doc.file_name or "").lower()

            if (
                req_title_lower in doc_title_lower
                or doc_title_lower in req_title_lower
                or (doc_file_lower and req_title_lower in doc_file_lower)
            ):
                candidate_docs.append(doc)
                continue

            key_words = [
                w
                for w in req_title_lower.split()
                if len(w) > 3 and w not in ["card", "proof", "report", "deed", "form", "last", "months"]
            ]
            if any(kw in doc_title_lower for kw in key_words):
                candidate_docs.append(doc)

        # Prioritize candidates: Documents with actual files uploaded come first!
        candidate_docs.sort(
            key=lambda d: (
                1 if (d.status == "Uploaded" and d.storage_path) else 0,
                1 if d.storage_path else 0,
                d.id,
            ),
            reverse=True,
        )

        best_match = candidate_docs[0] if candidate_docs else None

        if best_match:
            matched_doc_ids.add(best_match.id)
            req["document_id"] = best_match.id
            req["status"] = best_match.status
            req["verification_status"] = best_match.verification_status or "PENDING"
            req["verified_at"] = best_match.verified_at
            req["verification_remark"] = best_match.verification_remark
            req["file_name"] = best_match.file_name
            req["file_size"] = best_match.file_size
            req["file_type"] = best_match.file_type
            req["updated_at"] = best_match.updated_at or best_match.created_at
            if best_match.remarks:
                req["remarks"] = best_match.remarks
        else:
            req["status"] = "Missing"
            req["verification_status"] = "PENDING"

    # Add remaining genuine user-uploaded custom documents
    # (Skip empty placeholders with status='Missing' and no file)
    for doc in uploaded_docs:
        if doc.id not in matched_doc_ids and doc.category != "DPR":
            if doc.status == "Missing" and not doc.storage_path:
                continue
            requirements.append({
                "id": f"user_doc_{doc.id}",
                "document_id": doc.id,
                "title": doc.title,
                "category": doc.category or "Other",
                "required_for": ["Supporting Entrepreneur Documentation"],
                "reason": doc.remarks or "Uploaded by user as additional supporting documentation.",
                "source": "user_upload",
                "status": doc.status,
                "verification_status": doc.verification_status or "PENDING",
                "verified_at": doc.verified_at,
                "verification_remark": doc.verification_remark,
                "file_name": doc.file_name,
                "file_size": doc.file_size,
                "file_type": doc.file_type,
                "updated_at": doc.updated_at or doc.created_at,
                "remarks": doc.remarks,
            })

    items = [SmartChecklistItem(**r) for r in requirements]
    total_req = len(items)
    uploaded_cnt = sum(1 for item in items if item.status == "Uploaded")
    missing_cnt = sum(1 for item in items if item.status == "Missing")
    verified_cnt = sum(1 for item in items if item.verification_status == "VERIFIED")
    pending_verif_cnt = sum(1 for item in items if item.verification_status == "PENDING" and item.status != "Missing")
    rejected_cnt = sum(1 for item in items if item.verification_status == "REJECTED")
    reupload_cnt = sum(1 for item in items if item.verification_status == "REUPLOAD_REQUIRED")
    completion_pct = round((uploaded_cnt / total_req) * 100, 1) if total_req > 0 else 0.0
    is_ready = bool(total_req > 0 and missing_cnt == 0 and rejected_cnt == 0 and reupload_cnt == 0 and uploaded_cnt >= total_req)

    return SmartChecklistResponse(
        items=items,
        total_required=total_req,
        uploaded_count=uploaded_cnt,
        missing_count=missing_cnt,
        completion_percentage=completion_pct,
        verified_count=verified_cnt,
        pending_verification_count=pending_verif_cnt,
        rejected_count=rejected_cnt,
        reupload_count=reupload_cnt,
        is_ready_for_application=is_ready,
        business_type=active_biz,
        matched_scheme_id=scheme_id,
        matched_scheme_name=scheme_name,
        available_schemes=available_schemes,
        has_loan_application=has_loan,
        loan_amount=int(loan_amount) if loan_amount else None,
        loan_eligibility_score=loan_elig_score,
        loan_eligibility_status=loan_elig_status,
    )


# ── Administrative Manual Verification Services ───────────────────────────────

def compute_system_validation_checks(doc: Document) -> dict:
    """
    Run fast automated validation/integrity checks on stored file and metadata.
    Provides verified telemetry for GRAMSAARTHI Administrator review screen.
    """
    upload_dir = get_upload_dir()
    checks = {
        "file_present": False,
        "format_signature": "Unknown",
        "magic_bytes_verified": False,
        "size_valid": True,
        "size_bytes": doc.file_size or 0,
        "size_display": f"{round((doc.file_size or 0) / 1024, 1)} KB" if doc.file_size else "0 KB",
        "mime_type": doc.file_type or "unknown",
        "safe_storage_verified": True,
        "within_limit": bool(doc.file_size and doc.file_size <= MAX_FILE_SIZE),
    }

    if not doc.storage_path:
        return checks

    file_path = (upload_dir / doc.storage_path).resolve()
    if not file_path.is_relative_to(upload_dir) or not file_path.is_file():
        checks["file_present"] = False
        checks["safe_storage_verified"] = False
        return checks

    checks["file_present"] = True
    clean_ext = (file_path.suffix or "").lower().lstrip(".")
    signatures = MAGIC_SIGNATURES.get(clean_ext, [])

    try:
        with open(file_path, "rb") as f:
            header = f.read(16)
        if any(header.startswith(sig) for sig in signatures):
            checks["magic_bytes_verified"] = True
            checks["format_signature"] = f"Genuine {clean_ext.upper()} document signature"
        else:
            checks["magic_bytes_verified"] = False
            checks["format_signature"] = f"Unverified {clean_ext.upper()} byte signature"
    except Exception:
        checks["magic_bytes_verified"] = False

    return checks


def admin_get_document_stats(db: Session) -> AdminVerificationStatsResponse:
    """Calculate verification statistics across all uploaded documents."""
    docs = db.query(Document).filter(Document.storage_path.isnot(None)).all()

    pending = sum(1 for d in docs if (d.verification_status or "PENDING") == "PENDING")
    verified = sum(1 for d in docs if d.verification_status == "VERIFIED")
    rejected = sum(1 for d in docs if d.verification_status == "REJECTED")
    reupload = sum(1 for d in docs if d.verification_status == "REUPLOAD_REQUIRED")

    return AdminVerificationStatsResponse(
        pending_count=pending,
        verified_count=verified,
        rejected_count=rejected,
        reupload_count=reupload,
        total_documents=len(docs),
    )


def admin_list_documents(
    db: Session,
    status_filter: str | None = None,
    category: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AdminDocumentItemResponse]:
    """
    List user documents for administrative manual review.
    Excludes empty placeholders (documents without uploaded files).
    """
    query = (
        db.query(Document, User)
        .join(User, Document.user_id == User.id)
        .filter(Document.storage_path.isnot(None))
    )

    if status_filter and status_filter.strip() and status_filter.upper() != "ALL":
        query = query.filter(Document.verification_status == status_filter.strip().upper())

    if category and category.strip() and category.lower() != "all":
        query = query.filter(Document.category.ilike(category.strip()))

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Document.title.ilike(term))
            | (Document.file_name.ilike(term))
            | (User.name.ilike(term))
            | (User.phone.ilike(term))
            | (User.district.ilike(term))
        )

    # Order pending items first, then by updated_at descending
    results = (
        query.order_by(
            (Document.verification_status == "PENDING").desc(),
            Document.updated_at.desc(),
        )
        .offset(offset)
        .limit(limit)
        .all()
    )

    items: list[AdminDocumentItemResponse] = []
    admin_names: dict[int, str] = {}

    for doc, user in results:
        verifier_name = None
        if doc.verified_by:
            if doc.verified_by not in admin_names:
                v_user = db.query(User).filter(User.id == doc.verified_by).first()
                admin_names[doc.verified_by] = v_user.name if v_user else "GRAMSAARTHI Admin"
            verifier_name = admin_names[doc.verified_by]

        checks = compute_system_validation_checks(doc)

        items.append(
            AdminDocumentItemResponse(
                id=doc.id,
                user_id=user.id,
                user=AdminDocumentOwnerInfo(
                    id=user.id,
                    name=user.name,
                    phone=user.phone,
                    district=user.district,
                    state=user.state,
                ),
                title=doc.title,
                category=doc.category,
                file_name=doc.file_name,
                file_type=doc.file_type,
                file_size=doc.file_size,
                status=doc.status,
                remarks=doc.remarks,
                verification_status=doc.verification_status or "PENDING",
                verified_by=doc.verified_by,
                verified_by_name=verifier_name,
                verified_at=doc.verified_at,
                verification_remark=doc.verification_remark,
                created_at=doc.created_at,
                updated_at=doc.updated_at,
                system_validation_checks=checks,
            )
        )

    return items


def admin_get_document_details(db: Session, doc_id: int) -> AdminDocumentItemResponse:
    """Retrieve full document details with owner info and system checks for admin."""
    res = (
        db.query(Document, User)
        .join(User, Document.user_id == User.id)
        .filter(Document.id == doc_id)
        .first()
    )

    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    doc, user = res
    verifier_name = None
    if doc.verified_by:
        v_user = db.query(User).filter(User.id == doc.verified_by).first()
        verifier_name = v_user.name if v_user else "GRAMSAARTHI Admin"

    checks = compute_system_validation_checks(doc)

    return AdminDocumentItemResponse(
        id=doc.id,
        user_id=user.id,
        user=AdminDocumentOwnerInfo(
            id=user.id,
            name=user.name,
            phone=user.phone,
            district=user.district,
            state=user.state,
        ),
        title=doc.title,
        category=doc.category,
        file_name=doc.file_name,
        file_type=doc.file_type,
        file_size=doc.file_size,
        status=doc.status,
        remarks=doc.remarks,
        verification_status=doc.verification_status or "PENDING",
        verified_by=doc.verified_by,
        verified_by_name=verifier_name,
        verified_at=doc.verified_at,
        verification_remark=doc.verification_remark,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        system_validation_checks=checks,
    )


def admin_verify_document(
    db: Session,
    doc_id: int,
    admin_user: User,
    decision: str,
    remark: str | None = None,
) -> Document:
    """
    Process manual verification decision by an authorized GRAMSAARTHI Administrator.
    - Updates document verification_status, verified_by, verified_at, verification_remark
    - Adjusts document.status ('Uploaded' for VERIFIED, 'Needs Attention' for REJECTED / REUPLOAD_REQUIRED)
    - Records immutable audit log in document_verification_logs
    - Appends user Activity entry
    """
    clean_decision = str(decision).strip().upper()
    if clean_decision not in ("VERIFIED", "REJECTED", "REUPLOAD_REQUIRED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision '{decision}'. Allowed decisions: VERIFIED, REJECTED, REUPLOAD_REQUIRED.",
        )

    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    clean_remark = remark.strip() if remark and remark.strip() else None

    # Update document record
    doc.verification_status = clean_decision
    doc.verified_by = admin_user.id
    doc.verified_at = datetime.utcnow()
    doc.verification_remark = clean_remark

    if clean_decision == "VERIFIED":
        doc.status = "Uploaded"
    elif clean_decision in ("REJECTED", "REUPLOAD_REQUIRED"):
        doc.status = "Needs Attention"

    # Add audit log
    audit_log = DocumentVerificationLog(
        document_id=doc.id,
        user_id=doc.user_id,
        admin_id=admin_user.id,
        decision=clean_decision,
        remark=clean_remark,
    )
    db.add(audit_log)

    # Add unified admin audit log
    admin_action_map = {
        "VERIFIED": "DOCUMENT_VERIFIED",
        "REJECTED": "DOCUMENT_REJECTED",
        "REUPLOAD_REQUIRED": "DOCUMENT_REUPLOAD_REQUESTED",
    }
    doc_owner = db.query(User).filter(User.id == doc.user_id).first()
    admin_audit = AdminAuditLog(
        admin_id=admin_user.id,
        admin_name=admin_user.name or "GRAMSAARTHI Administrator",
        action=admin_action_map.get(clean_decision, "DOCUMENT_VERIFIED"),
        target_user_id=doc.user_id,
        target_user_name=doc_owner.name if doc_owner else None,
        target_user_phone=doc_owner.phone if doc_owner else None,
        target_document_id=doc.id,
        target_document_title=doc.title,
        details=clean_remark or f"Verification decision: {clean_decision}",
    )
    db.add(admin_audit)

    # Add user activity notification
    decision_map = {
        "VERIFIED": ("Verified", "🟢"),
        "REJECTED": ("Rejected", "🔴"),
        "REUPLOAD_REQUIRED": ("Re-upload Requested", "🟠"),
    }
    label, icon = decision_map[clean_decision]
    activity = Activity(
        user_id=doc.user_id,
        activity_type="document_verification",
        title=f"Document '{doc.title}' {label} by GRAMSAARTHI Administrator",
        description=clean_remark or f"Document verification completed with status: {clean_decision}",
        icon=icon,
    )
    db.add(activity)

    # Add notification for the user
    user_notif = Notification(
        user_id=doc.user_id,
        title=f"Document '{doc.title}' {label}",
        message=clean_remark or f"Your document '{doc.title}' verification has been updated to {label} by the administrator.",
        type="document",
        link="/documents",
        is_read=False,
    )
    db.add(user_notif)

    db.commit()
    db.refresh(doc)
    logger.info(
        "[DOCUMENTS] Admin %s set verification_status=%s for doc %s (owner %s)",
        admin_user.id,
        clean_decision,
        doc.id,
        doc.user_id,
    )
    return doc


def admin_get_verification_history(
    db: Session,
    doc_id: int,
) -> list[AdminVerificationLogResponse]:
    """Retrieve audit history of verification actions for a document."""
    logs = (
        db.query(DocumentVerificationLog)
        .filter(DocumentVerificationLog.document_id == doc_id)
        .order_by(DocumentVerificationLog.created_at.desc(), DocumentVerificationLog.id.desc())
        .all()
    )

    admin_ids = {l.admin_id for l in logs if l.admin_id}
    admins: dict[int, str] = {}
    if admin_ids:
        for u in db.query(User).filter(User.id.in_(admin_ids)).all():
            admins[u.id] = u.name

    return [
        AdminVerificationLogResponse(
            id=l.id,
            document_id=l.document_id,
            user_id=l.user_id,
            admin_id=l.admin_id,
            admin_name=admins.get(l.admin_id, "GRAMSAARTHI Administrator") if l.admin_id else "System",
            decision=l.decision,
            remark=l.remark,
            created_at=l.created_at,
        )
        for l in logs
    ]


def admin_get_document_file_path(db: Session, doc_id: int) -> tuple[Path, str, str]:
    """
    Retrieve physical file path for admin preview/download without user ownership isolation restriction.
    Still validates storage path traversal safety.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    upload_dir = get_upload_dir()

    # Regenerate DPR PDF if DPR document and missing from disk
    if doc.category == "DPR" and (not doc.storage_path or not (upload_dir / doc.storage_path).is_file()):
        dpr = db.query(DPR).filter(DPR.user_id == doc.user_id).first()
        if dpr and dpr.report_data:
            sync_dpr_document(db, doc.user_id, dpr)
            doc = db.query(Document).filter(Document.id == doc_id).first()

    if not doc.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document has no uploaded file content.",
        )

    file_path = (upload_dir / doc.storage_path).resolve()
    if not file_path.is_relative_to(upload_dir) or not file_path.is_file():
        logger.error("[DOCUMENTS] Physical file missing for doc %s at %s", doc_id, file_path)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uploaded file is missing from storage.",
        )

    media_type = doc.file_type or "application/octet-stream"
    client_name = doc.file_name or f"{doc.title}.pdf"
    return file_path, media_type, client_name


