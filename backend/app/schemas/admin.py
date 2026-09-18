"""
GRAMSAARTHI — Admin Pydantic Schemas
Defines request/response shapes for Admin Dashboard, Users Management, and Audit Logs.
"""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict


class AdminAuditLogItemResponse(BaseModel):
    id: int
    admin_id: int | None = None
    admin_name: str
    action: str
    target_user_id: int | None = None
    target_user_name: str | None = None
    target_user_phone: str | None = None
    target_document_id: int | None = None
    target_document_title: str | None = None
    details: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminDashboardStatsResponse(BaseModel):
    total_users: int
    active_users: int
    suspended_users: int
    blacklisted_users: int
    pending_documents: int
    verified_documents: int
    rejected_documents: int
    reupload_documents: int
    recent_activity: list[AdminAuditLogItemResponse]


class AdminUserListItemResponse(BaseModel):
    id: int
    name: str
    phone: str | None = None
    email: str | None = None
    village: str | None = None
    block: str | None = None
    district: str | None = None
    state: str | None = None
    status: str = "ACTIVE"
    is_active: bool = True
    role: str = "user"
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserListResponse(BaseModel):
    items: list[AdminUserListItemResponse]
    total: int
    limit: int
    offset: int


class DocumentSummaryItem(BaseModel):
    id: int
    title: str
    category: str
    file_name: str | None = None
    file_type: str | None = None
    file_size: int | None = None
    status: str
    verification_status: str
    verified_by: int | None = None
    verified_at: datetime | None = None
    verification_remark: str | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class AdminUserDetailsResponse(BaseModel):
    id: int
    name: str
    phone: str | None = None
    email: str | None = None
    language: str = "Hindi"

    # Location
    village: str | None = None
    block: str | None = None
    district: str | None = None
    state: str | None = None
    rural_or_urban: str | None = None

    # Personal
    age: int | None = None
    gender: str | None = None
    education: str | None = None
    occupation: str | None = None

    # Eligibility
    social_category: str | None = None
    annual_family_income: int | None = None
    annual_income_range: str | None = None
    special_categories: str | None = None

    # Business
    business_status: str | None = None
    business_type: str | None = None
    business_name: str | None = None
    years_in_business: int | None = None
    monthly_revenue: int | None = None
    number_of_employees: int | None = None
    business_investment: int | None = None
    capital: int | None = None
    business_interest: str | None = None
    experience: str | None = None

    # Resources
    has_bank_account: bool | None = None
    has_land: bool | None = None
    has_commercial_space: bool | None = None
    has_equipment: bool | None = None

    # Account Status & Security
    status: str = "ACTIVE"
    status_reason: str | None = None
    blacklist_reason: str | None = None
    status_updated_at: datetime | None = None
    status_updated_by: int | None = None
    is_active: bool = True
    role: str = "user"
    is_admin: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

    # Administrative Summaries
    total_documents: int = 0
    pending_documents: int = 0
    verified_documents: int = 0
    rejected_documents: int = 0
    reupload_documents: int = 0
    documents: list[DocumentSummaryItem] = []

    # Application & Readiness Summaries
    dpr_count: int = 0
    dprs: list[dict[str, Any]] = []
    finance_count: int = 0
    application_readiness: str = "Incomplete"
    readiness_percentage: int = 0

    # User Audit Trail
    audit_trail: list[AdminAuditLogItemResponse] = []

    model_config = ConfigDict(from_attributes=True)


class AdminUserStatusActionRequest(BaseModel):
    reason: str | None = None
    confirm_phone: str | None = None
