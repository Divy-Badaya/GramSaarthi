"""
GRAMSAARTHI — Dynamic Personalized Roadmap Service
Evaluates the authenticated entrepreneur's real-time progress across 10 progressive milestones.
Identifies missing requirements, dynamic status, routes, and contextual metadata.
Never uses a static checklist; strictly binds to the user's database state.
"""

import logging
from typing import Any
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.assessment import Assessment
from app.models.finance import Finance
from app.models.dpr import DPR
from app.models.document import Document
from app.schemas.journey import RoadmapStep, RoadmapResponse
from app.services import loan_eligibility_service, scheme_service
from app.services.dpr_service import compute_finance_snapshot_hash

logger = logging.getLogger(__name__)


def evaluate_user_roadmap(db: Session, current_user: User) -> RoadmapResponse:
    """
    Dynamically evaluate user progress across 10 structured steps:
    1. Complete Profile
    2. Business Assessment
    3. Select Business
    4. Evaluate Financing
    5. Check Loan Eligibility
    6. Check Government Schemes
    7. Generate DPR
    8. Prepare Documents
    9. Apply for Financing
    10. Start Business
    """
    user_id = current_user.id

    # 1. Fetch latest assessment
    latest_assessment = (
        db.query(Assessment)
        .filter(Assessment.user_id == user_id)
        .order_by(Assessment.id.desc())
        .first()
    )

    # 2. Fetch active finance plan
    finance_rec = (
        db.query(Finance)
        .filter(Finance.user_id == user_id)
        .first()
    )

    # 3. Fetch DPR record
    dpr_rec = (
        db.query(DPR)
        .filter(DPR.user_id == user_id)
        .first()
    )

    steps: list[RoadmapStep] = []

    # ──────────────────────────────────────────────────────────────────────────
    # Step 1: Complete Profile
    # ──────────────────────────────────────────────────────────────────────────
    missing_profile: list[str] = []
    if not current_user.name or not current_user.name.strip():
        missing_profile.append("Full Name")
    if not current_user.phone:
        missing_profile.append("Mobile Number")
    if not current_user.district:
        missing_profile.append("District")
    if not current_user.state:
        missing_profile.append("State")
    if not current_user.social_category:
        missing_profile.append("Social Category (General/OBC/SC/ST)")
    if not current_user.education:
        missing_profile.append("Educational Attainment")
    if not current_user.occupation:
        missing_profile.append("Primary Occupation")

    step1_completed = len(missing_profile) == 0
    step1_status = "completed" if step1_completed else "current"
    step1_metadata = {
        "name": current_user.name,
        "location": f"{current_user.village or ''}, {current_user.district or ''}, {current_user.state or ''}".strip(", "),
        "category": current_user.social_category,
        "education": current_user.education,
    }
    steps.append(RoadmapStep(
        id="profile",
        step_number=1,
        title="Complete Personal & Demographic Profile",
        short_title="Complete Profile",
        status=step1_status,
        route="/profile",
        action_label="Review Profile" if step1_completed else "Complete Profile",
        description="Verify personal identity, location, and social category used by banks for priority sector schemes.",
        missing_requirements=missing_profile,
        metadata=step1_metadata,
        is_locked=False,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Step 2: Business Assessment
    # ──────────────────────────────────────────────────────────────────────────
    missing_assessment: list[str] = []
    has_assessment = False
    step2_metadata = {}

    if not latest_assessment:
        missing_assessment.append("Complete 4-step Business Assessment questionnaire")
    else:
        has_assessment = True
        if not latest_assessment.capital and not current_user.capital:
            missing_assessment.append("Investment capital availability")
        if not latest_assessment.business_interest and not current_user.business_interest:
            missing_assessment.append("Business sector interest")

        step2_metadata = {
            "capital": latest_assessment.capital or current_user.capital,
            "business_interest": latest_assessment.business_interest or current_user.business_interest,
            "location": latest_assessment.location,
        }

    step2_completed = has_assessment and len(missing_assessment) == 0
    step2_status = "completed" if step2_completed else ("current" if step1_completed else "pending")
    steps.append(RoadmapStep(
        id="assessment",
        step_number=2,
        title="Comprehensive Business Assessment",
        short_title="Business Assessment",
        status=step2_status,
        route="/business/assessment",
        action_label="Review Assessment" if step2_completed else "Start Assessment",
        description="Answer key questions regarding your local experience, available resources, and investment capacity.",
        missing_requirements=missing_assessment,
        metadata=step2_metadata,
        is_locked=not step1_completed,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Step 3: Select Business
    # ──────────────────────────────────────────────────────────────────────────
    selected_biz = current_user.business_type or (latest_assessment.business_interest if latest_assessment else None)
    step3_completed = bool(selected_biz and selected_biz.strip())
    missing_biz: list[str] = []
    if not step3_completed:
        missing_biz.append("Select a primary business venture from ML recommendations or catalogue")

    step3_status = "completed" if step3_completed else ("current" if step2_completed else "pending")
    steps.append(RoadmapStep(
        id="select_business",
        step_number=3,
        title="Select Target Rural Enterprise",
        short_title="Select Business",
        status=step3_status,
        route="/business",
        action_label="Change Business" if step3_completed else "Select Business",
        description="Choose your high-potential enterprise (e.g. Dairy, Food Processing, Poultry) grounded in district demand.",
        missing_requirements=missing_biz,
        metadata={"selected_business": selected_biz},
        is_locked=not step2_completed,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Step 4: Evaluate Financing
    # ──────────────────────────────────────────────────────────────────────────
    has_finance = bool(finance_rec and finance_rec.project_cost and finance_rec.project_cost > 0)
    missing_finance: list[str] = []
    step4_metadata = {}

    if not has_finance:
        missing_finance.append("Generate and review customized financial plan")
    else:
        step4_metadata = {
            "project_cost": finance_rec.project_cost,
            "user_capital": finance_rec.user_capital,
            "loan_amount": finance_rec.loan_amount,
            "margin_pct": finance_rec.margin_pct,
            "emi": finance_rec.emi,
            "monthly_profit": finance_rec.monthly_profit,
            "dscr": finance_rec.dscr,
        }

    step4_completed = has_finance
    step4_status = "completed" if step4_completed else ("current" if step3_completed else "pending")
    steps.append(RoadmapStep(
        id="finance",
        step_number=4,
        title="Evaluate Financial Feasibility & Plan",
        short_title="Evaluate Financing",
        status=step4_status,
        route="/finance",
        action_label="View Financial Plan" if step4_completed else "Model Financials",
        description="Model total capital outlay, promoter margin contribution, bank loan requirement, and cash flow projections.",
        missing_requirements=missing_finance,
        metadata=step4_metadata,
        is_locked=not step3_completed,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Step 5: Check Loan Eligibility
    # ──────────────────────────────────────────────────────────────────────────
    loan_eval = {}
    if has_finance or latest_assessment:
        try:
            loan_eval = loan_eligibility_service.evaluate_user_loan_eligibility(db, current_user)
        except Exception:
            loan_eval = {}
    loan_status = loan_eval.get("status", "Pending")
    is_loan_evaluated = has_finance and loan_status in ("Eligible", "Potentially eligible", "Not eligible")

    missing_loan: list[str] = []
    if not is_loan_evaluated:
        missing_loan.append("Complete financial plan to evaluate debt service coverage and loan limits")
    elif loan_status == "Not eligible":
        missing_loan.append("Review debt capacity constraints or increase promoter margin")

    step5_completed = is_loan_evaluated and loan_status in ("Eligible", "Potentially eligible")
    step5_status = "completed" if step5_completed else ("current" if step4_completed else "pending")
    steps.append(RoadmapStep(
        id="loan_eligibility",
        step_number=5,
        title="Institutional Loan Eligibility Assessment",
        short_title="Check Loan Eligibility",
        status=step5_status,
        route="/finance/loan",
        action_label="Check Loan Status" if is_loan_evaluated else "Assess Loan Eligibility",
        description="Verify banking credit capacity against RBI priority lending guidelines and minimum DSCR thresholds.",
        missing_requirements=missing_loan,
        metadata={
            "loan_status": loan_status,
            "max_loan": loan_eval.get("maximum_eligible_loan"),
            "recommended_loan": loan_eval.get("recommended_loan"),
            "dscr": loan_eval.get("dscr"),
        },
        is_locked=not step4_completed,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Step 6: Check Government Schemes
    # ──────────────────────────────────────────────────────────────────────────
    matched_scheme = finance_rec.matched_scheme_name if finance_rec else None
    has_scheme = bool(matched_scheme or (finance_rec and finance_rec.subsidy_amount > 0))
    missing_schemes: list[str] = []
    if not has_scheme:
        missing_schemes.append("Explore matched central and state capital subsidy schemes")

    step6_completed = has_scheme and step4_completed
    step6_status = "completed" if step6_completed else ("current" if step4_completed else "pending")
    steps.append(RoadmapStep(
        id="schemes",
        step_number=6,
        title="Government Scheme & Subsidy Matching",
        short_title="Check Schemes",
        status=step6_status,
        route="/schemes",
        action_label="Explore Schemes",
        description="Identify applicable capital subsidies, margin money relief, and interest subvention schemes (PMEGP, Mudra, PMFME).",
        missing_requirements=missing_schemes,
        metadata={
            "matched_scheme": matched_scheme or "PMMY / PMEGP",
            "subsidy_amount": finance_rec.subsidy_amount if finance_rec else 0,
        },
        is_locked=not step4_completed,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Step 7: Generate DPR (Detailed Project Report)
    # ──────────────────────────────────────────────────────────────────────────
    has_dpr = bool(dpr_rec and (dpr_rec.status == "generated" or (dpr_rec.report_data and dpr_rec.report_data.get("sections"))))
    is_dpr_stale = False
    if has_dpr and finance_rec:
        current_hash = compute_finance_snapshot_hash(finance_rec)
        is_dpr_stale = (dpr_rec.status == "needs_update") or (bool(dpr_rec.finance_snapshot_hash) and dpr_rec.finance_snapshot_hash != current_hash)

    missing_dpr: list[str] = []
    if not has_dpr:
        missing_dpr.append("Generate official techno-economic project report")
    elif is_dpr_stale:
        missing_dpr.append("Financial parameters updated; click Regenerate DPR to sync")

    step7_status = "needs_update" if is_dpr_stale else ("completed" if has_dpr else ("current" if step5_completed and step6_completed else "pending"))
    steps.append(RoadmapStep(
        id="dpr",
        step_number=7,
        title="Generate Bank-Ready Detailed Project Report (DPR)",
        short_title="Generate DPR",
        status=step7_status,
        route="/dpr",
        action_label="Regenerate DPR" if is_dpr_stale else ("View / Download PDF" if has_dpr else "Generate DPR"),
        description="Produce comprehensive 17-section bank appraisal report and official downloadable ReportLab PDF.",
        missing_requirements=missing_dpr,
        metadata={
            "has_dpr": has_dpr,
            "is_stale": is_dpr_stale,
            "dpr_id": dpr_rec.id if dpr_rec else None,
        },
        is_locked=not (step4_completed and step5_completed),
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # ── Step 8: Prepare Documents ──────────────────────────────────────────
    has_land_or_space = bool(current_user.has_land or current_user.has_commercial_space)
    has_bank = bool(current_user.has_bank_account)
    user_docs = db.query(Document).filter(Document.user_id == user_id).all()
    uploaded_docs_count = sum(1 for d in user_docs if d.status == "Uploaded")
    has_uploaded_kyc = any("aadhaar" in (d.title or "").lower() and d.status == "Uploaded" for d in user_docs)

    # Verification status integration
    has_rejected_doc = any(getattr(d, "verification_status", "") == "REJECTED" for d in user_docs if d.storage_path)
    has_reupload_req = any(getattr(d, "verification_status", "") == "REUPLOAD_REQUIRED" for d in user_docs if d.storage_path)
    verified_docs_count = sum(1 for d in user_docs if getattr(d, "verification_status", "") == "VERIFIED")

    missing_docs: list[str] = []
    if not has_dpr:
        missing_docs.append("Bankable Detailed Project Report (DPR)")
    if not has_uploaded_kyc:
        missing_docs.append("Identity & Biometric KYC Proof (Aadhaar / PAN)")
    if not has_bank:
        missing_docs.append("Active Bank Passbook / 6-Month Account Statement")
    if not has_land_or_space:
        missing_docs.append("Premises Lease Agreement or Land Record")
    if has_rejected_doc:
        missing_docs.append("One or more documents rejected by administrator; please check remarks and replace")
    if has_reupload_req:
        missing_docs.append("Document re-upload requested by administrator; please re-upload clear copy")

    step8_completed = (
        (bool(has_dpr and uploaded_docs_count >= 2) or (has_dpr and has_bank and has_land_or_space and uploaded_docs_count >= 1))
        and not has_rejected_doc
        and not has_reupload_req
    )
    step8_status = "completed" if step8_completed else ("current" if has_dpr else "pending")
    steps.append(RoadmapStep(
        id="documents",
        step_number=8,
        title="Assemble Verification & KYC Documents",
        short_title="Prepare Documents",
        status=step8_status,
        route="/documents",
        action_label="Review Document Checklist",
        description="Organize identity proofs, bank records, premises documents, and vendor quotations for bank appraisal.",
        missing_requirements=missing_docs,
        metadata={
            "kyc_bank_ready": has_bank,
            "premises_ready": has_land_or_space,
            "uploaded_docs_count": uploaded_docs_count,
            "verified_docs_count": verified_docs_count,
            "has_rejected_doc": has_rejected_doc,
            "has_reupload_req": has_reupload_req,
        },
        is_locked=not has_dpr,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Step 9: Apply for Financing
    # ──────────────────────────────────────────────────────────────────────────
    step9_status = "current" if step8_completed else "pending"
    missing_app: list[str] = []
    if not step8_completed:
        missing_app.append("Complete DPR and assemble KYC documents before formal loan application")

    steps.append(RoadmapStep(
        id="application",
        step_number=9,
        title="Submit Institutional Bank / Scheme Application",
        short_title="Apply for Financing",
        status=step9_status,
        route="/applications/new",
        action_label="Start Loan Application",
        description="Apply online through JanSamarth / PMEGP portals or submit directly to your designated bank branch.",
        missing_requirements=missing_app,
        metadata={"target_scheme": matched_scheme or "PMMY"},
        is_locked=not step8_completed,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Step 10: Start Business
    # ──────────────────────────────────────────────────────────────────────────
    steps.append(RoadmapStep(
        id="start_business",
        step_number=10,
        title="Commissioning & Commercial Launch",
        short_title="Start Business",
        status="pending",
        route="/ai-advisor",
        action_label="Explore Launch Guidance",
        description="Follow 10-week execution timeline: site preparation, machinery installation, trial batches, and sales launch.",
        missing_requirements=["Loan sanction & disbursement from lending institution"],
        metadata={"horizon": "60–75 Days"},
        is_locked=True,
    ))

    # Calculate overall progress percentage
    completed_count = sum(1 for s in steps if s.status == "completed")
    overall_progress_pct = round((completed_count / len(steps)) * 100)

    # Determine current active step
    current_step = next((s for s in steps if s.status in ("current", "needs_update")), steps[0])

    # Dynamic summary message
    if overall_progress_pct >= 80:
        summary_msg = "Outstanding progress! Your DPR and financial structure are ready for bank submission."
    elif overall_progress_pct >= 50:
        summary_msg = "Great momentum! Complete your loan eligibility and scheme verification to generate your DPR."
    elif overall_progress_pct >= 20:
        summary_msg = "Good start! Select your target business and model your financial projections."
    else:
        summary_msg = "Welcome to GramSaarthi! Complete your profile and assessment to unlock personalized recommendations."

    return RoadmapResponse(
        overall_progress_pct=overall_progress_pct,
        completed_steps=completed_count,
        total_steps=len(steps),
        current_step_id=current_step.id,
        current_step_title=current_step.short_title,
        business_name=selected_biz,
        steps=steps,
        summary_message=summary_msg,
    )
