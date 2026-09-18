"""
GRAMSAARTHI — Admin Control Panel Routes
Restricted strictly to authorized GRAMSAARTHI Owner / Administrator accounts.
Enforces role check via get_current_admin_user dependency on every endpoint.
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.schemas.admin import (
    AdminDashboardStatsResponse,
    AdminUserListResponse,
    AdminUserDetailsResponse,
    AdminUserStatusActionRequest,
    AdminUserListItemResponse,
    AdminAuditLogItemResponse,
)
from app.services.auth_service import get_current_admin_user
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["Admin Control Panel"])


@router.get(
    "/dashboard/stats",
    response_model=AdminDashboardStatsResponse,
    summary="Get admin dashboard overview statistics and recent activity",
)
def get_dashboard_stats(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Returns live user counts, pending/verified/rejected document counts, and recent admin logs."""
    return admin_service.get_admin_dashboard_stats(db=db)


@router.get(
    "/users",
    response_model=AdminUserListResponse,
    summary="List entrepreneur users with search and status filtering",
)
def list_users(
    search: str | None = Query(None, description="Search by name, phone, email, village, block, district, state"),
    status: str | None = Query(None, description="Filter by status: ALL, ACTIVE, SUSPENDED, BLACKLISTED"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Search and filter entrepreneurs across registration data and account status."""
    return admin_service.list_admin_users(
        db=db,
        search=search,
        status_filter=status,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailsResponse,
    summary="Get full administrative details, document breakdown, and audit trail for a user",
)
def get_user_details(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Retrieve comprehensive profile, document verification statuses, application readiness, and audit logs."""
    return admin_service.get_admin_user_details(db=db, user_id=user_id)


@router.post(
    "/users/{user_id}/suspend",
    response_model=AdminUserListItemResponse,
    summary="Suspend an entrepreneur account",
)
def suspend_user(
    user_id: int,
    req: AdminUserStatusActionRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Suspends account:
    - Sets status to SUSPENDED, is_active to False
    - Blocks subsequent login and authenticated user requests
    - Records admin identity, timestamp, and suspension reason
    """
    updated_user = admin_service.suspend_user(
        db=db,
        user_id=user_id,
        admin_user=current_admin,
        reason=req.reason or "",
    )
    return AdminUserListItemResponse.model_validate(updated_user)


@router.post(
    "/users/{user_id}/blacklist",
    response_model=AdminUserListItemResponse,
    summary="Blacklist an entrepreneur account with phone confirmation",
)
def blacklist_user(
    user_id: int,
    req: AdminUserStatusActionRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Blacklists account:
    - Confirms exact account via mobile number
    - Sets status to BLACKLISTED, is_active to False
    - Strictly blocks subsequent login attempts
    - Preserves documents and application records
    - Records immutable admin audit entry
    """
    updated_user = admin_service.blacklist_user(
        db=db,
        user_id=user_id,
        admin_user=current_admin,
        reason=req.reason or "",
        confirm_phone=req.confirm_phone or "",
    )
    return AdminUserListItemResponse.model_validate(updated_user)


@router.post(
    "/users/{user_id}/restore",
    response_model=AdminUserListItemResponse,
    summary="Restore a suspended or blacklisted entrepreneur account",
)
def restore_user(
    user_id: int,
    req: AdminUserStatusActionRequest,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """
    Restores account:
    - Sets status to ACTIVE, is_active to True
    - Re-enables standard authentication access
    - Preserves all historical records
    - Records administrative action
    """
    updated_user = admin_service.restore_user(
        db=db,
        user_id=user_id,
        admin_user=current_admin,
        reason=req.reason,
    )
    return AdminUserListItemResponse.model_validate(updated_user)


@router.get(
    "/activity",
    response_model=list[AdminAuditLogItemResponse],
    summary="List chronological admin activity and audit history",
)
def list_activity(
    action: str | None = Query(None, description="Filter by action: USER_SUSPENDED, USER_BLACKLISTED, USER_RESTORED, DOCUMENT_VERIFIED, etc."),
    search: str | None = Query(None, description="Search by admin name, target user phone/name, document title, or details"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Returns chronological audit logs of all administrative actions."""
    return admin_service.list_admin_audit_logs(
        db=db,
        action_filter=action,
        search=search,
        limit=limit,
        offset=offset,
    )
