"""
GRAMSAARTHI — Admin Service
Business logic for Admin Dashboard stats, Users management, Account lifecycle
(Suspend, Blacklist with phone verification, Restore), and unified Audit logging.
"""

from datetime import datetime, timezone
import logging
from sqlalchemy import func, or_, desc
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.document import Document
from app.models.dpr import DPR
from app.models.finance import Finance
from app.models.admin_audit import AdminAuditLog
from app.schemas.admin import (
    AdminDashboardStatsResponse,
    AdminUserListItemResponse,
    AdminUserListResponse,
    AdminUserDetailsResponse,
    DocumentSummaryItem,
    AdminAuditLogItemResponse,
)
from app.services.auth_service import clean_mobile_number

logger = logging.getLogger(__name__)


def record_admin_audit(
    db: Session,
    admin_user: User,
    action: str,
    target_user: User | None = None,
    target_user_id: int | None = None,
    target_document: Document | None = None,
    target_document_id: int | None = None,
    details: str | None = None,
) -> AdminAuditLog:
    """Record an immutable admin audit log entry."""
    uid = target_user.id if target_user else target_user_id
    uname = target_user.name if target_user else None
    uphone = target_user.phone if target_user else None

    if not uname and uid:
        u = db.query(User).filter(User.id == uid).first()
        if u:
            uname = u.name
            uphone = u.phone

    did = target_document.id if target_document else target_document_id
    dtitle = target_document.title if target_document else None
    if not dtitle and did:
        d = db.query(Document).filter(Document.id == did).first()
        if d:
            dtitle = d.title

    log = AdminAuditLog(
        admin_id=admin_user.id if admin_user else None,
        admin_name=admin_user.name if admin_user else "GRAMSAARTHI Administrator",
        action=action,
        target_user_id=uid,
        target_user_name=uname,
        target_user_phone=uphone,
        target_document_id=did,
        target_document_title=dtitle,
        details=details,
        created_at=datetime.now(timezone.utc),
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_admin_dashboard_stats(db: Session) -> AdminDashboardStatsResponse:
    """Aggregate live counts across users, document verification queues, and recent admin logs."""
    total_users = db.query(func.count(User.id)).filter(User.role != "admin").scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.status == "ACTIVE", User.role != "admin").scalar() or 0
    suspended_users = db.query(func.count(User.id)).filter(User.status == "SUSPENDED", User.role != "admin").scalar() or 0
    blacklisted_users = db.query(func.count(User.id)).filter(User.status == "BLACKLISTED", User.role != "admin").scalar() or 0

    pending_docs = db.query(func.count(Document.id)).filter(
        Document.verification_status == "PENDING",
        Document.status != "Missing"
    ).scalar() or 0

    verified_docs = db.query(func.count(Document.id)).filter(
        Document.verification_status == "VERIFIED"
    ).scalar() or 0

    rejected_docs = db.query(func.count(Document.id)).filter(
        Document.verification_status == "REJECTED"
    ).scalar() or 0

    reupload_docs = db.query(func.count(Document.id)).filter(
        Document.verification_status == "REUPLOAD_REQUIRED"
    ).scalar() or 0

    recent_logs = (
        db.query(AdminAuditLog)
        .order_by(desc(AdminAuditLog.created_at))
        .limit(10)
        .all()
    )

    return AdminDashboardStatsResponse(
        total_users=total_users,
        active_users=active_users,
        suspended_users=suspended_users,
        blacklisted_users=blacklisted_users,
        pending_documents=pending_docs,
        verified_documents=verified_docs,
        rejected_documents=rejected_docs,
        reupload_documents=reupload_docs,
        recent_activity=[AdminAuditLogItemResponse.model_validate(l) for l in recent_logs],
    )


def list_admin_users(
    db: Session,
    search: str | None = None,
    status_filter: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> AdminUserListResponse:
    """Query and filter non-admin entrepreneur users with search across name, phone, email, and location."""
    query = db.query(User).filter(User.role != "admin")

    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(User.status == status_filter.upper())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.name.ilike(term),
                User.phone.ilike(term),
                User.email.ilike(term),
                User.village.ilike(term),
                User.block.ilike(term),
                User.district.ilike(term),
                User.state.ilike(term),
            )
        )

    total = query.count()
    users = (
        query.order_by(desc(User.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    items = [AdminUserListItemResponse.model_validate(u) for u in users]
    return AdminUserListResponse(items=items, total=total, limit=limit, offset=offset)


def get_admin_user_details(db: Session, user_id: int) -> AdminUserDetailsResponse:
    """Retrieve full profile, document verification summary, DPR/readiness data, and audit trail for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    # Documents & breakdown
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    total_docs = len(docs)
    pending_docs = sum(1 for d in docs if d.verification_status == "PENDING" and d.status != "Missing")
    verified_docs = sum(1 for d in docs if d.verification_status == "VERIFIED")
    rejected_docs = sum(1 for d in docs if d.verification_status == "REJECTED")
    reupload_docs = sum(1 for d in docs if d.verification_status == "REUPLOAD_REQUIRED")

    # DPRs & finances
    dprs = db.query(DPR).filter(DPR.user_id == user_id).all()
    finances = db.query(Finance).filter(Finance.user_id == user_id).all()

    # Application readiness calculation
    # Ready if at least 2 key identity/business docs verified, and no rejected or re-upload required docs
    readiness_percentage = 0
    readiness_status = "Incomplete"
    if total_docs > 0:
        if rejected_docs > 0 or reupload_docs > 0:
            readiness_percentage = max(10, int((verified_docs / total_docs) * 100))
            readiness_status = "Action Required (Rejected/Re-upload)"
        elif verified_docs == total_docs and total_docs >= 3:
            readiness_percentage = 100
            readiness_status = "Fully Ready"
        elif verified_docs > 0:
            readiness_percentage = int((verified_docs / total_docs) * 100)
            readiness_status = "Partially Ready (Pending Review)"
        else:
            readiness_percentage = 20
            readiness_status = "Pending Review"
    else:
        readiness_status = "No Documents Submitted"

    # Audit trail for this user
    logs = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_user_id == user_id)
        .order_by(desc(AdminAuditLog.created_at))
        .all()
    )

    doc_items = [DocumentSummaryItem.model_validate(d) for d in docs]
    dpr_items = [{"id": d.id, "business_name": d.business_name, "status": d.status, "created_at": d.created_at.isoformat() if d.created_at else None} for d in dprs]

    res = AdminUserDetailsResponse(
        id=user.id,
        name=user.name,
        phone=user.phone,
        email=user.email,
        language=user.language,
        village=user.village,
        block=user.block,
        district=user.district,
        state=user.state,
        rural_or_urban=user.rural_or_urban,
        age=user.age,
        gender=user.gender,
        education=user.education,
        occupation=user.occupation,
        social_category=user.social_category,
        annual_family_income=user.annual_family_income,
        annual_income_range=user.annual_income_range,
        special_categories=user.special_categories,
        business_status=user.business_status,
        business_type=user.business_type,
        business_name=user.business_name,
        years_in_business=user.years_in_business,
        monthly_revenue=user.monthly_revenue,
        number_of_employees=user.number_of_employees,
        business_investment=user.business_investment,
        capital=user.capital,
        business_interest=user.business_interest,
        experience=user.experience,
        has_bank_account=user.has_bank_account,
        has_land=user.has_land,
        has_commercial_space=user.has_commercial_space,
        has_equipment=user.has_equipment,
        status=user.status or "ACTIVE",
        status_reason=user.status_reason,
        blacklist_reason=user.blacklist_reason,
        status_updated_at=user.status_updated_at,
        status_updated_by=user.status_updated_by,
        is_active=user.is_active,
        role=user.role,
        is_admin=user.is_admin,
        created_at=user.created_at,
        updated_at=user.updated_at,
        total_documents=total_docs,
        pending_documents=pending_docs,
        verified_documents=verified_docs,
        rejected_documents=rejected_docs,
        reupload_documents=reupload_docs,
        documents=doc_items,
        dpr_count=len(dprs),
        dprs=dpr_items,
        finance_count=len(finances),
        application_readiness=readiness_status,
        readiness_percentage=readiness_percentage,
        audit_trail=[AdminAuditLogItemResponse.model_validate(l) for l in logs],
    )
    return res


def suspend_user(
    db: Session,
    user_id: int,
    admin_user: User,
    reason: str,
) -> User:
    """Suspend an entrepreneur account. Prevents login and authenticated requests."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    if user.is_admin or user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend an administrator account.",
        )

    if not reason or not reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A reason is required to suspend an account.",
        )

    user.status = "SUSPENDED"
    user.is_active = False
    user.status_reason = reason.strip()
    user.status_updated_at = datetime.now(timezone.utc)
    user.status_updated_by = admin_user.id

    record_admin_audit(
        db=db,
        admin_user=admin_user,
        action="USER_SUSPENDED",
        target_user=user,
        details=f"Suspension reason: {reason.strip()}",
    )

    db.commit()
    db.refresh(user)
    return user


def blacklist_user(
    db: Session,
    user_id: int,
    admin_user: User,
    reason: str,
    confirm_phone: str,
) -> User:
    """
    Blacklist an entrepreneur account with explicit mobile number confirmation.
    Stores reason, admin identity, timestamp, and blocks all future logins.
    Preserves all documents and application history.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    if user.is_admin or user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot blacklist an administrator account.",
        )

    # Phone confirmation check to eliminate same-name ambiguity
    cleaned_confirm = clean_mobile_number(confirm_phone or "")
    cleaned_user_phone = clean_mobile_number(user.phone or "")
    if not cleaned_confirm or cleaned_confirm != cleaned_user_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number confirmation failed. Please enter the exact mobile number for this user.",
        )

    if not reason or not reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A reason is required to blacklist an account.",
        )

    user.status = "BLACKLISTED"
    user.is_active = False
    user.blacklist_reason = reason.strip()
    user.status_reason = reason.strip()
    user.status_updated_at = datetime.now(timezone.utc)
    user.status_updated_by = admin_user.id

    record_admin_audit(
        db=db,
        admin_user=admin_user,
        action="USER_BLACKLISTED",
        target_user=user,
        details=f"Blacklist reason: {reason.strip()}",
    )

    db.commit()
    db.refresh(user)
    return user


def restore_user(
    db: Session,
    user_id: int,
    admin_user: User,
    reason: str | None = None,
) -> User:
    """Restore a suspended or blacklisted user account to ACTIVE status."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found.",
        )

    user.status = "ACTIVE"
    user.is_active = True
    user.blacklist_reason = None
    user.status_reason = f"Restored: {reason.strip()}" if reason and reason.strip() else "Account restored by Administrator"
    user.status_updated_at = datetime.now(timezone.utc)
    user.status_updated_by = admin_user.id

    record_admin_audit(
        db=db,
        admin_user=admin_user,
        action="USER_RESTORED",
        target_user=user,
        details=user.status_reason,
    )

    db.commit()
    db.refresh(user)
    return user


def list_admin_audit_logs(
    db: Session,
    action_filter: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AdminAuditLogItemResponse]:
    """Return chronological audit logs of all administrative actions."""
    query = db.query(AdminAuditLog)

    if action_filter and action_filter.upper() != "ALL":
        query = query.filter(AdminAuditLog.action == action_filter.upper())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AdminAuditLog.admin_name.ilike(term),
                AdminAuditLog.target_user_name.ilike(term),
                AdminAuditLog.target_user_phone.ilike(term),
                AdminAuditLog.target_document_title.ilike(term),
                AdminAuditLog.details.ilike(term),
            )
        )

    logs = (
        query.order_by(desc(AdminAuditLog.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [AdminAuditLogItemResponse.model_validate(l) for l in logs]
