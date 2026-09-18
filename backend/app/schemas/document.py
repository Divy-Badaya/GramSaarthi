"""
GRAMSAARTHI — Document Pydantic Schemas
Defines request and response schemas for user document management.
"""

from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field


class DocumentCategory(str, Enum):
    IDENTITY = "Identity"
    BUSINESS = "Business"
    FINANCIAL = "Financial"
    LOAN = "Loan"
    GOVERNMENT_SCHEME = "Government Scheme"
    DPR = "DPR"
    OTHER = "Other"


class DocumentStatus(str, Enum):
    MISSING = "Missing"
    UPLOADED = "Uploaded"
    PENDING_REVIEW = "Pending Review"
    NEEDS_ATTENTION = "Needs Attention"


class DocumentVerificationStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    REUPLOAD_REQUIRED = "REUPLOAD_REQUIRED"


class DocumentResponse(BaseModel):
    """Full metadata for a document."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    category: str
    file_name: str | None = None
    file_type: str | None = None
    file_size: int | None = None
    status: str
    remarks: str | None = None

    # Manual verification fields (GRAMSAARTHI Admin)
    verification_status: str = "PENDING"
    verified_by: int | None = None
    verified_at: datetime | None = None
    verification_remark: str | None = None

    created_at: datetime
    updated_at: datetime


class DocumentSummaryResponse(BaseModel):
    """Aggregate statistics for user's documents."""
    total: int = 0
    uploaded: int = 0
    pending_review: int = 0
    needs_attention: int = 0
    missing: int = 0
    # Verification statistics
    pending_verification: int = 0
    verified: int = 0
    rejected: int = 0
    reupload_required: int = 0
    categories_count: dict[str, int] = Field(default_factory=dict)


class DocumentCreateRequest(BaseModel):
    """Request schema for creating a checklist or custom document placeholder."""
    title: str = Field(..., min_length=2, max_length=150, description="Display title for document")
    category: str = Field(default="Other", description="Document category")
    remarks: str | None = Field(default=None, max_length=255)


class DocumentUpdateRequest(BaseModel):
    """Request schema for updating document metadata."""
    title: str | None = Field(default=None, min_length=2, max_length=150)
    category: str | None = Field(default=None)
    status: str | None = Field(default=None)
    remarks: str | None = Field(default=None, max_length=255)


class DocumentUploadResponse(BaseModel):
    """Response returned upon file upload or replace."""
    status: str = "success"
    message: str
    document: DocumentResponse


class SmartChecklistItem(BaseModel):
    """Represents a requirement in the dynamic smart checklist."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: int | None = None
    title: str
    category: str
    required_for: list[str] = Field(default_factory=list)
    reason: str
    source: str = "project"  # kyc, business, loan, scheme, dpr, user_upload
    scheme_id: str | None = None
    status: str = "Missing"  # Missing, Uploaded, Pending Review, Needs Attention
    verification_status: str = "PENDING"  # PENDING, VERIFIED, REJECTED, REUPLOAD_REQUIRED
    verified_at: datetime | None = None
    verification_remark: str | None = None
    is_dpr: bool = False
    dpr_id: int | None = None
    file_name: str | None = None
    file_type: str | None = None
    file_size: int | None = None
    updated_at: datetime | None = None
    remarks: str | None = None
    action_route: str | None = None


class SmartChecklistResponse(BaseModel):
    """Dynamic checklist tailored to user's active business, schemes, and loan status."""
    items: list[SmartChecklistItem] = Field(default_factory=list)
    total_required: int = 0
    uploaded_count: int = 0
    missing_count: int = 0
    completion_percentage: float = 0.0

    # Verification counts & application readiness
    verified_count: int = 0
    pending_verification_count: int = 0
    rejected_count: int = 0
    reupload_count: int = 0
    is_ready_for_application: bool = False

    business_type: str | None = None
    matched_scheme_id: str | None = None
    matched_scheme_name: str | None = None
    available_schemes: list[dict] = Field(default_factory=list)
    has_loan_application: bool = False
    loan_amount: int | None = None
    loan_eligibility_score: int | None = None
    loan_eligibility_status: str | None = None
    banking_disclaimer: str = (
        "Note: Uploading documents facilitates bank KYC verification and techno-economic appraisal. "
        "Final loan sanction, interest subvention, and credit approval remain at the sole discretion "
        "of the lending institution under RBI guidelines."
    )


# ── Admin Verification Schemas ────────────────────────────────────────────────

class AdminDocumentOwnerInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str | None = None
    district: str | None = None
    state: str | None = None


class AdminDocumentItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user: AdminDocumentOwnerInfo
    title: str
    category: str
    file_name: str | None = None
    file_type: str | None = None
    file_size: int | None = None
    status: str
    remarks: str | None = None
    verification_status: str = "PENDING"
    verified_by: int | None = None
    verified_by_name: str | None = None
    verified_at: datetime | None = None
    verification_remark: str | None = None
    created_at: datetime
    updated_at: datetime
    system_validation_checks: dict = Field(default_factory=dict)


class AdminDocumentVerificationRequest(BaseModel):
    decision: str = Field(..., description="Decision must be VERIFIED, REJECTED, or REUPLOAD_REQUIRED")
    remark: str | None = Field(default=None, max_length=500, description="Administrator feedback or instructions")


class AdminVerificationStatsResponse(BaseModel):
    pending_count: int = 0
    verified_count: int = 0
    rejected_count: int = 0
    reupload_count: int = 0
    total_documents: int = 0


class AdminVerificationLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    document_id: int
    user_id: int
    admin_id: int | None = None
    admin_name: str | None = None
    decision: str
    remark: str | None = None
    created_at: datetime


