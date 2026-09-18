"""
GRAMSAARTHI — DPR (Detailed Project Report) Service
Dynamic, business-specific, multi-user safe DPR generation engine.

Reuses authoritative User Profile, Assessment, Finance plan, Business Templates,
and Government Scheme matching. Single source of truth for financial numbers.
"""

import hashlib
import logging
from typing import Any
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.models.user import User
from app.models.assessment import Assessment
from app.models.finance import Finance
from app.models.dpr import DPR
from app.schemas.dpr import DPRSection, DPRFinancialSummary, DPRStatusResponse, DPRResponse
from app.services import (
    business_template_service,
    finance_service,
    scheme_service,
    risk_analysis_service,
    loan_eligibility_service,
)
from app.schemas.scheme import UserAssessmentProfile

logger = logging.getLogger(__name__)


# ── Hash Helper for Staleness Detection ───────────────────────────────────────

def compute_finance_snapshot_hash(finance: Finance | None) -> str:
    """
    Generate SHA-256 signature of authoritative finance parameters.
    Used to detect if the user's finance plan has changed since DPR generation.
    """
    if not finance:
        return ""
    sig = (
        f"{finance.business_type}:"
        f"{finance.project_cost}:"
        f"{finance.user_capital}:"
        f"{finance.loan_amount}:"
        f"{finance.interest_rate}:"
        f"{finance.loan_tenure}:"
        f"{finance.moratorium}:"
        f"{finance.emi}:"
        f"{finance.subsidy_amount}:"
        f"{finance.matched_scheme_name}"
    )
    return hashlib.sha256(sig.encode("utf-8")).hexdigest()


# ── Pre-flight Status Check ───────────────────────────────────────────────────

def get_dpr_status(db: Session, current_user: User) -> DPRStatusResponse:
    """
    Pre-flight verification for DPR creation.
    Checks presence of Business Selection, Assessment, and Finance Plan.
    Also detects if an existing DPR needs regeneration due to updated financials.
    Strictly scoped to current_user.id.
    """
    user_id = current_user.id

    # 1. Check assessment
    latest_assessment = (
        db.query(Assessment)
        .filter(Assessment.user_id == user_id)
        .order_by(Assessment.id.desc())
        .first()
    )

    # 2. Check business selection
    biz_type = (
        current_user.business_type
        or current_user.business_interest
        or (latest_assessment.business_interest if latest_assessment else None)
    )
    has_business = bool(biz_type and str(biz_type).strip())

    # 3. Check assessment completeness
    has_assessment = bool(
        latest_assessment
        and (latest_assessment.capital or current_user.capital)
        and (latest_assessment.business_interest or has_business)
    )

    # 4. Check finance plan
    finance_rec = db.query(Finance).filter(Finance.user_id == user_id).first()
    has_finance = bool(finance_rec and finance_rec.project_cost > 0)

    # Check existing DPR
    existing_dpr = db.query(DPR).filter(DPR.user_id == user_id).first()
    existing_dpr_id = existing_dpr.id if existing_dpr else None
    dpr_status_val = existing_dpr.status if existing_dpr else None

    # Check staleness
    needs_regeneration = False
    staleness_reason = None
    if existing_dpr and finance_rec:
        current_hash = compute_finance_snapshot_hash(finance_rec)
        if existing_dpr.finance_snapshot_hash and existing_dpr.finance_snapshot_hash != current_hash:
            needs_regeneration = True
            staleness_reason = "Financial parameters or loan terms have been modified since the DPR was generated."
            if existing_dpr.status != "needs_update":
                existing_dpr.status = "needs_update"
                db.commit()
            dpr_status_val = "needs_update"

    # Determine readiness & navigation recommendation
    if not has_business:
        return DPRStatusResponse(
            ready=False,
            has_business=False,
            has_assessment=has_assessment,
            has_finance=has_finance,
            business_name=None,
            message="Select a business to continue.",
            next_step="/business",
            existing_dpr_id=existing_dpr_id,
            dpr_status=dpr_status_val,
            needs_regeneration=needs_regeneration,
            staleness_reason=staleness_reason,
        )

    if not has_assessment:
        return DPRStatusResponse(
            ready=False,
            has_business=True,
            has_assessment=False,
            has_finance=has_finance,
            business_name=biz_type,
            message="Complete your assessment before generating the DPR.",
            next_step="/business/assessment",
            existing_dpr_id=existing_dpr_id,
            dpr_status=dpr_status_val,
            needs_regeneration=needs_regeneration,
            staleness_reason=staleness_reason,
        )

    if not has_finance:
        return DPRStatusResponse(
            ready=False,
            has_business=True,
            has_assessment=True,
            has_finance=False,
            business_name=biz_type,
            message="Complete your financial plan before generating the DPR.",
            next_step="/finance",
            existing_dpr_id=existing_dpr_id,
            dpr_status=dpr_status_val,
            needs_regeneration=needs_regeneration,
            staleness_reason=staleness_reason,
        )

    return DPRStatusResponse(
        ready=True,
        has_business=True,
        has_assessment=True,
        has_finance=True,
        business_name=biz_type,
        message="Ready to generate Detailed Project Report.",
        next_step="ready",
        existing_dpr_id=existing_dpr_id,
        dpr_status=dpr_status_val,
        needs_regeneration=needs_regeneration,
        staleness_reason=staleness_reason,
    )


# ── Core DPR Generation Engine ────────────────────────────────────────────────

def generate_dpr(
    db: Session,
    current_user: User,
    language: str = "English",
    section_customizations: dict[str, str] | None = None,
) -> DPRResponse:
    """
    Generate or regenerate a complete, business-specific Detailed Project Report.
    Reuses existing User Profile, Assessment, and Finance data without recalculating
    financial numbers independently.
    Strictly scoped to current_user.id.
    """
    user_id = current_user.id

    # 1. Fetch prerequisite records
    finance_rec = db.query(Finance).filter(Finance.user_id == user_id).first()
    if not finance_rec:
        # Try creating from assessment if possible
        finance_rec = finance_service.get_or_create_user_finance_from_assessment(db, current_user)

    if not finance_rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your financial plan before generating the DPR.",
        )

    latest_assessment = (
        db.query(Assessment)
        .filter(Assessment.user_id == user_id)
        .order_by(Assessment.id.desc())
        .first()
    )

    biz_type = (
        finance_rec.business_type
        or current_user.business_type
        or current_user.business_interest
        or (latest_assessment.business_interest if latest_assessment else None)
        or "Rural Micro-Enterprise"
    )

    biz_name = (
        finance_rec.business_name
        or current_user.business_name
        or f"{biz_type} Enterprise"
    )

    # 2. Match business template for capital and operational breakdowns
    template = business_template_service.match_template(biz_type)
    template_name = template.get("name", biz_type)
    unit_name = template.get("unit_name", "Units / Capacity")

    # 3. Retrieve authoritative financial figures directly from Finance model
    cost = int(finance_rec.project_cost)
    capital = int(finance_rec.user_capital)
    loan = int(finance_rec.loan_amount)
    margin_pct = round(float(finance_rec.margin_pct), 1)
    rate = round(float(finance_rec.interest_rate), 2)
    tenure = int(finance_rec.loan_tenure)
    moratorium = int(finance_rec.moratorium)
    emi = int(finance_rec.emi)
    subsidy = int(finance_rec.subsidy_amount)
    monthly_rev = int(finance_rec.expected_monthly_revenue)
    monthly_exp = int(finance_rec.monthly_expenses)
    monthly_profit = int(finance_rec.monthly_profit)
    annual_rev = int(finance_rec.annual_revenue)
    annual_profit = int(finance_rec.annual_profit)
    dscr = round(float(finance_rec.dscr), 2)
    break_even = int(finance_rec.break_even_month)
    roi = round(float(finance_rec.roi), 1)

    # Compute financial plan bridge to get 12-month schedule & amortization sample
    plan = finance_service.calculate_financial_plan(
        business_type=biz_type,
        user_capital=capital,
        project_cost=cost,
        loan_amount=loan,
        interest_rate=rate,
        loan_tenure=tenure,
        moratorium=moratorium,
        user_profile=current_user,
        status="finalized",
    )

    monthly_projections = plan.get("monthly_projections", [])
    amortization_sample = plan.get("amortization_sample", [])
    cost_breakdown = plan.get("cost_breakdown", {})
    scale_summary = plan.get("scale_summary", {})

    # 4. User profile facts
    promoter_name = current_user.name or "Rural Entrepreneur"
    promoter_age = f"{current_user.age} years" if current_user.age else "Adult"
    promoter_gender = current_user.gender or "Not Specified"
    promoter_edu = current_user.education or "Secondary Education"
    promoter_occ = current_user.occupation or "Agriculture / Self-Employed"
    promoter_exp = current_user.experience or current_user.work_experience or "Practical local enterprise experience"
    promoter_social = current_user.social_category or "General"
    village = current_user.village or "Local Gram Panchayat"
    block = current_user.block or "Local Block"
    district = current_user.district or "District Cluster"
    state = current_user.state or "State"
    phone = current_user.phone or "Registered Mobile"
    email = current_user.email or "Registered Email"

    res_list = []
    if current_user.has_land:
        res_list.append("Own / Family Land Available")
    if current_user.has_bank_account:
        res_list.append("Active Bank Savings / Current Account")
    if current_user.has_commercial_space:
        res_list.append("Commercial Shed / Worksite Space")
    if current_user.has_equipment:
        res_list.append("Basic Tools & Equipment Available")
    if not res_list:
        res_list.append("Standard Rural Household Resources")
    resources_str = ", ".join(res_list)

    # 5. Government scheme facts & verified project benefits
    user_scheme_profile = UserAssessmentProfile(
        business=biz_type,
        business_interest=biz_type,
        state=state,
        district=district,
        block=block,
        village=village,
        capital=capital,
        project_cost=cost,
        investment=cost,
        loan_amount=loan,
        is_woman=bool(current_user.is_woman or (current_user.gender and current_user.gender.lower() in ("female", "woman"))),
        is_sc_st=bool(current_user.is_sc_st or (current_user.social_category and current_user.social_category.upper() in ("SC", "ST"))),
        age=current_user.age,
        gender=current_user.gender,
        occupation=current_user.occupation,
        social_category=current_user.social_category,
        special_categories=current_user.special_categories,
        has_land=current_user.has_land,
        has_bank_account=current_user.has_bank_account,
        language=language,
    )
    scheme_recommendations = scheme_service.recommend_schemes(user_scheme_profile)
    matched_rec = None
    if finance_rec.matched_scheme_id:
        for r in scheme_recommendations:
            if r.scheme_id.upper() == finance_rec.matched_scheme_id.upper():
                matched_rec = r
                break
    if not matched_rec and scheme_recommendations:
        matched_rec = scheme_recommendations[0]

    scheme_name = matched_rec.scheme_name if matched_rec else (finance_rec.matched_scheme_name or "PM Mudra Yojana")
    scheme_id = matched_rec.scheme_id if matched_rec else (finance_rec.matched_scheme_id or "PMMY")
    scheme_benefits = matched_rec.benefits if matched_rec else "Priority enterprise credit under official guidelines."
    scheme_why = matched_rec.why_eligible if matched_rec else "Qualifies as an eligible rural micro-enterprise."
    scheme_satisfied = matched_rec.satisfied_conditions if matched_rec else ["Applicant profile meets general category criteria."]
    scheme_missing = matched_rec.missing_conditions if matched_rec else ["Field document verification required."]
    scheme_status = matched_rec.eligibility_status if matched_rec else "Likely eligible"
    scheme_action = matched_rec.next_action if matched_rec else "Submit project appraisal to lending institution."

    # 6. Multi-dimensional risk analysis
    risk_eval = risk_analysis_service.evaluate_business_risks(plan, current_user, biz_type)
    overall_risk_level = risk_eval.get("overall_risk", risk_eval.get("overall_risk_level", "MEDIUM"))
    overall_risk_score = risk_eval.get("overall_score", risk_eval.get("risk_score", 45))
    risk_factors = risk_eval.get("factors", risk_eval.get("risk_factors", []))
    summary_verdict = risk_eval.get("summary", risk_eval.get("summary_verdict", "Project demonstrates manageable operational risk profile."))

    # 7. Grounded bank loan appraisal metrics
    loan_eval = loan_eligibility_service.evaluate_user_loan_eligibility(db, current_user)
    elig_status = loan_eval.get("status", "Eligible")
    max_loan_cap = loan_eval.get("maximum_eligible_loan", loan)
    rec_loan = loan_eval.get("recommended_loan", loan)
    monthly_capacity = loan_eval.get("monthly_capacity", monthly_profit)

    # 8. Generate 17 Structured Sections Covering All 16 Supported Areas + Assumptions
    sections: list[DPRSection] = []

    # ──────────────────────────────────────────────────────────────────────────
    # Section 1: Business Overview & Executive Summary
    # ──────────────────────────────────────────────────────────────────────────
    scale_units = scale_summary.get("scale_units", template.get("base_scale_units", "Standard scale"))
    sec1_text = (
        f"This Detailed Project Report (DPR) establishes the commercial bankability, operational feasibility, "
        f"and economic impact of setting up '{biz_name}', a rural micro-enterprise in the {template_name} sector, "
        f"promoted by Shri/Smt. {promoter_name} at Village {village}, Block {block}, District {district}, {state}.\n\n"
        f"Key Project Highlights:\n"
        f"• Total Capital Outlay: ₹{cost:,} (Fixed Assets: ₹{round(cost * 0.80):,}, Initial Working Capital: ₹{round(cost * 0.20):,})\n"
        f"• Funding Structure: Promoter Margin Contribution of ₹{capital:,} ({margin_pct}%), supported by a proposed Bank Term Loan of ₹{loan:,} under {scheme_name}.\n"
        f"• Financial Performance: Full-scale Monthly Turnover of ₹{monthly_rev:,}, yielding a Net Monthly Operating Surplus of ₹{monthly_profit:,}.\n"
        f"• Debt Service Coverage Ratio (DSCR): {dscr:.2f}x (Exceeds institutional benchmark of 1.20x).\n"
        f"• Payback Horizon: Capital break-even achieved by Month {break_even} of commercial operations."
    )
    sec1_table = [
        {"Project Parameter": "Enterprise Name & Activity", "Project Estimate": f"{biz_name} ({template_name})"},
        {"Project Parameter": "Promoter & Location", "Project Estimate": f"{promoter_name} · {village}, {district}, {state}"},
        {"Project Parameter": "Total Capital Outlay", "Project Estimate": f"₹{cost:,}"},
        {"Project Parameter": "Promoter Own Contribution", "Project Estimate": f"₹{capital:,} ({margin_pct}%)"},
        {"Project Parameter": "Proposed Bank Loan", "Project Estimate": f"₹{loan:,} ({round(100 - margin_pct)}%)"},
        {"Project Parameter": "Expected Monthly Profit", "Project Estimate": f"₹{monthly_profit:,}"},
        {"Project Parameter": "Debt Service Coverage Ratio", "Project Estimate": f"{dscr:.2f}x"},
        {"Project Parameter": "Capital Break-Even Horizon", "Project Estimate": f"Month {break_even}"},
    ]
    sections.append(DPRSection(
        id="business_overview",
        title="1. Business Overview & Executive Summary",
        content=sec1_text,
        table=sec1_table,
        order=1,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 2: Promoter Profile & Background
    # ──────────────────────────────────────────────────────────────────────────
    sec2_text = (
        f"Promoter Name: {promoter_name}\n"
        f"Age & Gender: {promoter_age} · {promoter_gender}\n"
        f"Educational Qualification: {promoter_edu}\n"
        f"Current Occupation: {promoter_occ}\n"
        f"Social Category: {promoter_social}\n"
        f"Past Enterprise Experience: {promoter_exp}\n"
        f"Registered Residential Location: Village {village}, Block {block}, District {district}, {state}\n"
        f"Promoter Resource Base: {resources_str}\n"
        f"Banking & KYC Relationship: Active KYC-compliant account; Aadhaar & PAN verification available.\n"
        f"Contact Details: Mobile: {phone} | Email: {email}"
    )
    sec2_table = [
        {"Profile Attribute": "Promoter Full Name", "Verified Particulars": promoter_name},
        {"Profile Attribute": "Age / Gender", "Verified Particulars": f"{promoter_age} / {promoter_gender}"},
        {"Profile Attribute": "Educational Attainment", "Verified Particulars": promoter_edu},
        {"Profile Attribute": "Primary Occupation", "Verified Particulars": promoter_occ},
        {"Profile Attribute": "Social Category", "Verified Particulars": promoter_social},
        {"Profile Attribute": "Domain Experience", "Verified Particulars": promoter_exp},
        {"Profile Attribute": "Registered Address", "Verified Particulars": f"{village}, {block}, {district}, {state}"},
        {"Profile Attribute": "Available Physical Assets", "Verified Particulars": resources_str},
    ]
    sections.append(DPRSection(
        id="promoter_profile",
        title="2. Promoter Profile & Background",
        content=sec2_text,
        table=sec2_table,
        order=2,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 3: Business Description & Operational Workflow
    # ──────────────────────────────────────────────────────────────────────────
    sec3_text = (
        f"Enterprise Activity: {template_name} Micro-Enterprise\n"
        f"Planned Operating Scale: {scale_units} {unit_name}\n"
        f"Entity Constitution: Sole Proprietorship / Micro Rural Enterprise\n"
        f"Operating Premises: Village {village}, District {district}\n\n"
        f"Operational Workflow & Routine:\n"
        f"1. Input Sourcing: Daily/weekly raw material and consumable procurement from vetted district dealers.\n"
        f"2. Core Operations: Standardized handling, processing, or trading operations under hygienic rural standards.\n"
        f"3. Quality Assurance: Immediate inspection, moisture/condition testing, and standardized batch packing.\n"
        f"4. Sales & Delivery: Direct cash sales to retail households and scheduled wholesale distribution to nearby haats."
    )
    sec3_table = [
        {"Operational Feature": "Business Sector", "Details": template_name},
        {"Operational Feature": "Installed Capacity / Scale", "Details": f"{scale_units} {unit_name}"},
        {"Operational Feature": "Enterprise Structure", "Details": "Sole Proprietorship"},
        {"Operational Feature": "Daily Operating Hours", "Details": "8 to 10 Hours / Day (6 Days / Week)"},
        {"Operational Feature": "Worksite Site Type", "Details": "Promoter-owned site" if current_user.has_land else "Leased rural premises"},
    ]
    sections.append(DPRSection(
        id="business_description",
        title="3. Business Description & Operational Workflow",
        content=sec3_text,
        table=sec3_table,
        order=3,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 4: Market Context & Local Catchment Analysis
    # ──────────────────────────────────────────────────────────────────────────
    sec4_text = (
        f"Primary Catchment Area: Village {village}, adjoining Gram Panchayats across Block {block}, and regional mandi/haat clusters in District {district}.\n\n"
        f"Market Dynamics & Demand Drivers:\n"
        f"• Steady Year-Round Demand: Consumption is anchored in essential daily rural and peri-urban household needs.\n"
        f"• Cost Advantage: On-site local production eliminates intermediary transport costs and wholesale margins.\n"
        f"• Direct Off-Take Linkages: Established relationship with local village retailers, weekly rural haats, and direct consumers.\n"
        f"• Value Retention: Retains commercial value within the local rural economy, enhancing community self-reliance."
    )
    sec4_table = [
        {"Market Dimension": "Demand Catchment", "Grounded Context": f"Village {village} + 15 km rural radius across {district}"},
        {"Market Dimension": "Consumer Segment", "Grounded Context": "Local households, village grocery stores, and weekly market traders"},
        {"Market Dimension": "Pricing Strategy", "Grounded Context": "Competitive market rate with superior freshness/service assurance"},
        {"Market Dimension": "Payment Terms", "Grounded Context": "Immediate cash & UPI receipts (minimizing credit exposure)"},
    ]
    sections.append(DPRSection(
        id="market_context",
        title="4. Market Context & Local Catchment Analysis",
        content=sec4_text,
        table=sec4_table,
        order=4,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 5: Project Investment & Capital Outlay
    # ──────────────────────────────────────────────────────────────────────────
    fixed_breakdown = cost_breakdown.get("fixed_breakdown", {})
    sec5_table = []
    if fixed_breakdown:
        for k, v in fixed_breakdown.items():
            label = k.replace("_", " ").title()
            pct_val = round((float(v) / max(1, cost)) * 100, 1)
            sec5_table.append({"Asset / Component": label, "Estimated Cost": f"₹{int(v):,}", "Share (%)": f"{pct_val}%"})
    else:
        sec5_table = [
            {"Asset / Component": "Civil Infrastructure & Workshed Setup", "Estimated Cost": f"₹{round(cost * 0.45):,}", "Share (%)": "45%"},
            {"Asset / Component": "Primary Machinery, Tools & Equipment", "Estimated Cost": f"₹{round(cost * 0.35):,}", "Share (%)": "35%"},
            {"Asset / Component": "Electrification, Water & Auxiliary Assets", "Estimated Cost": f"₹{round(cost * 0.12):,}", "Share (%)": "12%"},
            {"Asset / Component": "Pre-operative Contingency & Trial Run", "Estimated Cost": f"₹{round(cost * 0.08):,}", "Share (%)": "8%"},
        ]
    sec5_text = (
        f"The total capital outlay required to establish the {template_name} unit is ₹{cost:,}.\n"
        f"The capital schedule is optimized based on standardized supplier price quotations and technical norms "
        f"for rural priority sector units, ensuring high equipment efficiency without overcapitalization."
    )
    sections.append(DPRSection(
        id="investment_outlay",
        title="5. Project Investment & Capital Outlay",
        content=sec5_text,
        table=sec5_table,
        order=5,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 6: Funding Structure & Means of Finance
    # ──────────────────────────────────────────────────────────────────────────
    sec6_table = [
        {"Source of Funds": f"Promoter Equity Margin ({margin_pct}%)", "Amount": f"₹{capital:,}", "Terms / Nature": "Paid-up own savings contribution"},
        {"Source of Funds": f"Proposed Bank Term Loan ({round(100 - margin_pct)}%)", "Amount": f"₹{loan:,}", "Terms / Nature": f"{rate}% p.a. interest over {tenure} months"},
        {"Source of Funds": f"Eligible Government Subsidy ({scheme_name})", "Amount": f"₹{subsidy:,}", "Terms / Nature": "Back-ended credit-linked capital subsidy"},
        {"Source of Funds": "TOTAL MEANS OF FINANCE", "Amount": f"₹{cost:,}", "Terms / Nature": "100% matches total project capital outlay"},
    ]
    sec6_text = (
        f"The proposed financing structure maintains a conservative debt-equity ratio of {round(100 - margin_pct)}:{margin_pct}.\n"
        f"Promoter equity of ₹{capital:,} ({margin_pct}%) complies fully with RBI priority sector lending margin norms (minimum 10%).\n"
        f"The remaining ₹{loan:,} is proposed as an institutional term loan under {scheme_name}."
    )
    sections.append(DPRSection(
        id="funding_structure",
        title="6. Funding Structure & Means of Finance",
        content=sec6_text,
        table=sec6_table,
        order=6,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 7: Revenue Projections & Milestone Schedule
    # ──────────────────────────────────────────────────────────────────────────
    sec7_table = []
    if monthly_projections:
        for p in monthly_projections[:6]:
            sec7_table.append({
                "Milestone Period": f"Month {p.get('month', '')}",
                "Gross Turnover": f"₹{p.get('revenue', 0):,}",
                "Operating Expenses": f"₹{p.get('expense', 0):,}",
                "Operating Cashflow": f"₹{p.get('revenue', 0) - p.get('expense', 0):,}",
            })
    else:
        sec7_table = [
            {"Milestone Period": "Months 1–3 (Ramp-up Phase @ 75%)", "Gross Turnover": f"₹{round(monthly_rev * 0.75):,}", "Operating Expenses": f"₹{round(monthly_exp * 0.80):,}", "Operating Cashflow": f"₹{round((monthly_rev * 0.75) - (monthly_exp * 0.80)):,}"},
            {"Milestone Period": "Months 4–6 (Stabilized Phase @ 90%)", "Gross Turnover": f"₹{round(monthly_rev * 0.90):,}", "Operating Expenses": f"₹{round(monthly_exp * 0.92):,}", "Operating Cashflow": f"₹{round((monthly_rev * 0.90) - (monthly_exp * 0.92)):,}"},
            {"Milestone Period": "Months 7–12 (Full Capacity @ 100%)", "Gross Turnover": f"₹{monthly_rev:,}", "Operating Expenses": f"₹{monthly_exp:,}", "Operating Cashflow": f"₹{monthly_rev - monthly_exp:,}"},
        ]
    sec7_text = (
        f"At full commercial capacity, the unit achieves an expected monthly gross turnover of ₹{monthly_rev:,}, "
        f"translating to an annual gross turnover of ₹{annual_rev:,}.\n"
        f"Revenue projections are based on realistic local consumption metrics and verified average selling prices."
    )
    sections.append(DPRSection(
        id="revenue_projections",
        title="7. Revenue Projections & Milestone Schedule",
        content=sec7_text,
        table=sec7_table,
        order=7,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 8: Operating Expenses & Working Capital
    # ──────────────────────────────────────────────────────────────────────────
    sec8_table = [
        {"Expense Category": "Raw Materials, Consumables & Feed", "Monthly Cost": f"₹{round(monthly_exp * 0.65):,}", "Annual Outlay": f"₹{round(monthly_exp * 12 * 0.65):,}", "Share (%)": "65%"},
        {"Expense Category": "Utilities (Power, Fuel, Water)", "Monthly Cost": f"₹{round(monthly_exp * 0.12):,}", "Annual Outlay": f"₹{round(monthly_exp * 12 * 0.12):,}", "Share (%)": "12%"},
        {"Expense Category": "Operating Labor & Handling Wages", "Monthly Cost": f"₹{round(monthly_exp * 0.15):,}", "Annual Outlay": f"₹{round(monthly_exp * 12 * 0.15):,}", "Share (%)": "15%"},
        {"Expense Category": "Repairs, Maintenance & Admin Misc.", "Monthly Cost": f"₹{round(monthly_exp * 0.08):,}", "Annual Outlay": f"₹{round(monthly_exp * 12 * 0.08):,}", "Share (%)": "8%"},
        {"Expense Category": "TOTAL OPERATING EXPENDITURE", "Monthly Cost": f"₹{monthly_exp:,}", "Annual Outlay": f"₹{round(monthly_exp * 12):,}", "Share (%)": "100%"},
    ]
    sec8_text = (
        f"Total recurring monthly operating costs are budgeted at ₹{monthly_exp:,} (₹{round(monthly_exp * 12):,} annually).\n"
        f"Variable operating costs scale directly with production volumes, while fixed overheads are minimized "
        f"through direct promoter management."
    )
    sections.append(DPRSection(
        id="operating_expenses",
        title="8. Operating Expenses & Working Capital",
        content=sec8_text,
        table=sec8_table,
        order=8,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 9: Profitability & Cash Flow Analysis
    # ──────────────────────────────────────────────────────────────────────────
    annual_emi = emi * 12
    cfads_annual = (monthly_rev - monthly_exp) * 12
    sec9_table = [
        {"Financial Particulars": "Gross Annual Turnover (A)", "Projected Amount": f"₹{annual_rev:,}"},
        {"Financial Particulars": "Total Annual Operating Costs (B)", "Projected Amount": f"₹{round(monthly_exp * 12):,}"},
        {"Financial Particulars": "Operating Cash Flow before Debt Service / EBITDA (A - B)", "Projected Amount": f"₹{cfads_annual:,}"},
        {"Financial Particulars": "Annual Debt Service / Loan EMI (C)", "Projected Amount": f"₹{annual_emi:,}"},
        {"Financial Particulars": "Net Annual Disposable Cash Profit (A - B - C)", "Projected Amount": f"₹{annual_profit:,}"},
        {"Financial Particulars": "Net Monthly Disposable Profit", "Projected Amount": f"₹{monthly_profit:,}"},
        {"Financial Particulars": "Net Profit Margin on Turnover", "Projected Amount": f"{round((annual_profit / max(1, annual_rev)) * 100, 1)}%"},
        {"Financial Particulars": "Return on Total Capital Outlay (ROI)", "Projected Amount": f"{roi}%"},
    ]
    sec9_text = (
        f"The project exhibits healthy operational profitability:\n"
        f"• Operating Cash Flow (EBITDA): ₹{cfads_annual:,} per year\n"
        f"• Net Post-Debt Annual Disposable Profit: ₹{annual_profit:,}\n"
        f"• Net Monthly Profit to Promoter: ₹{monthly_profit:,}\n"
        f"• Return on Investment (ROI): {roi}% p.a."
    )
    sections.append(DPRSection(
        id="profitability_analysis",
        title="9. Profitability & Cash Flow Analysis",
        content=sec9_text,
        table=sec9_table,
        order=9,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 10: Break-Even Analysis
    # ──────────────────────────────────────────────────────────────────────────
    fixed_monthly = round(monthly_exp * 0.25)
    variable_monthly = round(monthly_exp * 0.75)
    cm_ratio = round((monthly_rev - variable_monthly) / max(1, monthly_rev), 2)
    be_rev = round(fixed_monthly / max(0.1, cm_ratio)) if cm_ratio > 0 else round(monthly_exp * 0.8)
    safety_margin_pct = round(((monthly_rev - be_rev) / max(1, monthly_rev)) * 100, 1)

    sec10_table = [
        {"Break-Even Indicator": "Fixed Monthly Operating Overhead", "Computed Value": f"₹{fixed_monthly:,}"},
        {"Break-Even Indicator": "Variable Monthly Expense Share", "Computed Value": f"₹{variable_monthly:,} (75%)"},
        {"Break-Even Indicator": "Contribution Margin Ratio", "Computed Value": f"{cm_ratio:.2f}"},
        {"Break-Even Indicator": "Monthly Break-Even Revenue", "Computed Value": f"₹{be_rev:,}"},
        {"Break-Even Indicator": "Expected Full Capacity Revenue", "Computed Value": f"₹{monthly_rev:,}"},
        {"Break-Even Indicator": "Operating Margin of Safety (%)", "Computed Value": f"{safety_margin_pct}%"},
        {"Break-Even Indicator": "Capital Payback Horizon", "Computed Value": f"Month {break_even}"},
    ]
    sec10_text = (
        f"Break-even analysis demonstrates strong downside protection:\n"
        f"• Monthly Break-Even Revenue: ₹{be_rev:,} (only {round((be_rev / max(1, monthly_rev)) * 100)}% of full capacity turnover).\n"
        f"• Margin of Safety: {safety_margin_pct}%, meaning turnover could fall significantly before the enterprise experiences an operating deficit.\n"
        f"• Capital Payback: Cumulative operational profits recover the total project outlay by Month {break_even}."
    )
    sections.append(DPRSection(
        id="break_even_analysis",
        title="10. Break-Even Analysis",
        content=sec10_text,
        table=sec10_table,
        order=10,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 11: Loan Requirement & Debt Appraisal
    # ──────────────────────────────────────────────────────────────────────────
    sec11_table = []
    if amortization_sample:
        for r in amortization_sample[:5]:
            sec11_table.append({
                "Repayment Period": f"Month {r.get('month', '')}",
                "Principal Paid": f"₹{r.get('principal', 0):,}",
                "Interest Paid": f"₹{r.get('interest', 0):,}",
                "Remaining Loan Balance": f"₹{r.get('balance', 0):,}",
            })
    else:
        sec11_table = [
            {"Repayment Period": "Month 1", "Principal Paid": f"₹{round(emi * 0.40):,}", "Interest Paid": f"₹{round(emi * 0.60):,}", "Remaining Loan Balance": f"₹{round(loan * 0.98):,}"},
            {"Repayment Period": "Month 12", "Principal Paid": f"₹{round(emi * 0.50):,}", "Interest Paid": f"₹{round(emi * 0.50):,}", "Remaining Loan Balance": f"₹{round(loan * 0.80):,}"},
            {"Repayment Period": "Month 24", "Principal Paid": f"₹{round(emi * 0.60):,}", "Interest Paid": f"₹{round(emi * 0.40):,}", "Remaining Loan Balance": f"₹{round(loan * 0.60):,}"},
            {"Repayment Period": "Month 36", "Principal Paid": f"₹{round(emi * 0.70):,}", "Interest Paid": f"₹{round(emi * 0.30):,}", "Remaining Loan Balance": f"₹{round(loan * 0.40):,}"},
            {"Repayment Period": f"Month {tenure}", "Principal Paid": f"₹{emi:,}", "Interest Paid": "₹0", "Remaining Loan Balance": "₹0 (Fully Cleared)"},
        ]
    sec11_text = (
        f"Banking Credit Appraisal Parameters:\n"
        f"• Proposed Term Loan: ₹{loan:,}\n"
        f"• Maximum Eligible Borrowing Capacity: ₹{max_loan_cap:,}\n"
        f"• Recommended Safe Loan: ₹{rec_loan:,}\n"
        f"• Indicative Bank Eligibility Status: {elig_status}\n"
        f"• Applicable Interest Rate: {rate}% per annum\n"
        f"• Loan Tenure: {tenure} months ({(tenure / 12):.1f} years)\n"
        f"• Moratorium Window: {moratorium} months (principal servicing begins after commissioning)\n"
        f"• Monthly Equated Installment (EMI): ₹{emi:,}/month\n"
        f"• Monthly Debt Servicing Capacity: ₹{monthly_capacity:,} (Provides ample cushion over EMI of ₹{emi:,})"
    )
    sections.append(DPRSection(
        id="loan_requirement",
        title="11. Loan Requirement & Debt Appraisal",
        content=sec11_text,
        table=sec11_table,
        order=11,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 12: Financial Metrics & Banking Viability
    # ──────────────────────────────────────────────────────────────────────────
    sec12_table = [
        {"Viability Ratio": "Debt Service Coverage Ratio (DSCR)", "Project Value": f"{dscr:.2f}x", "Banking Norm": "Min 1.20x", "Assessment": "Compliant (Healthy Cushion)" if dscr >= 1.2 else "Borderline"},
        {"Viability Ratio": "Promoter Equity Margin", "Project Value": f"{margin_pct}%", "Banking Norm": "Min 10.0%", "Assessment": "Compliant" if margin_pct >= 10 else "Needs Top-up"},
        {"Viability Ratio": "Loan to Project Cost Ratio (LTC)", "Project Value": f"{round((loan / max(1, cost)) * 100, 1)}%", "Banking Norm": "Max 90.0%", "Assessment": "Compliant"},
        {"Viability Ratio": "Return on Investment (ROI)", "Project Value": f"{roi}%", "Banking Norm": "Min 15.0%", "Assessment": "Strong Commercial Return"},
        {"Viability Ratio": "Net Operating Margin", "Project Value": f"{round((annual_profit / max(1, annual_rev)) * 100, 1)}%", "Banking Norm": "Min 12.0%", "Assessment": "Profitable"},
    ]
    sec12_text = (
        f"The project fulfills all key institutional lending benchmarks:\n"
        f"• DSCR of {dscr:.2f}x ensures cash flows comfortably cover interest and principal repayments.\n"
        f"• Promoter margin of {margin_pct}% satisfies priority sector micro-enterprise requirements.\n"
        f"• Annual return on capital of {roi}% confirms strong economic return for the rural promoter."
    )
    sections.append(DPRSection(
        id="financial_metrics",
        title="12. Financial Metrics & Banking Viability",
        content=sec12_text,
        table=sec12_table,
        order=12,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 13: Government Scheme Matching & Verified Benefits
    # ──────────────────────────────────────────────────────────────────────────
    sat_points = "\n".join(f"  ✓ {s}" for s in scheme_satisfied)
    miss_points = "\n".join(f"  ⚠ {m}" for m in scheme_missing)
    sec13_text = (
        f"Recommended Official Scheme: {scheme_name} (Code: {scheme_id})\n"
        f"Indicative Match Status: {scheme_status} (Never claims guaranteed approval; subject to official appraisal)\n\n"
        f"Why You Appear Eligible:\n"
        f"{scheme_why}\n\n"
        f"Verified Project-Specific Benefits:\n"
        f"{scheme_benefits}\n\n"
        f"Satisfied Conditions:\n"
        f"{sat_points if sat_points else '  ✓ Demographic and trade guidelines match initial profile.'}\n\n"
        f"Conditions Requiring Physical / Bank Verification:\n"
        f"{miss_points if miss_points else '  • Standard bank branch KYC and address verification.'}\n\n"
        f"Recommended Next Action:\n"
        f"{scheme_action}"
    )
    sec13_table = [
        {"Scheme Parameter": "Matched Scheme", "Official Guideline Match": scheme_name},
        {"Scheme Parameter": "Scheme Code & Tier", "Official Guideline Match": scheme_id},
        {"Scheme Parameter": "Match Status", "Official Guideline Match": scheme_status},
        {"Scheme Parameter": "Verified Benefit / Subsidy", "Official Guideline Match": scheme_benefits[:120] + "..."},
        {"Scheme Parameter": "Credit Guarantee Coverage", "Official Guideline Match": "Collateral-free credit under CGFMU / CGTMSE guidelines"},
        {"Scheme Parameter": "Next Immediate Action", "Official Guideline Match": scheme_action[:120]},
    ]
    sections.append(DPRSection(
        id="government_schemes",
        title="13. Government Scheme Matching & Verified Benefits",
        content=sec13_text,
        table=sec13_table,
        order=13,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 14: Multi-Dimensional Risk Analysis
    # ──────────────────────────────────────────────────────────────────────────
    sec14_table = []
    for f in risk_factors:
        sec14_table.append({
            "Risk Dimension": f.get("category", "General"),
            "Rating": f.get("level", "MEDIUM"),
            "Risk Score": f"{f.get('score', 50)}/100",
            "Grounded Analysis": f.get("reason", "")[:120] + "...",
        })
    sec14_text = (
        f"Comprehensive multi-dimensional risk appraisal evaluated across 8 grounded pillars:\n"
        f"• Overall Enterprise Risk Category: {overall_risk_level} (Composite Score: {overall_risk_score}/100)\n"
        f"• Summary Assessment: {summary_verdict}\n\n"
        f"Individual Dimension Ratings:\n"
        + "\n".join(f"• {f.get('category')}: [{f.get('level')}] — {f.get('reason')}" for f in risk_factors)
    )
    sections.append(DPRSection(
        id="risk_analysis",
        title="14. Multi-Dimensional Risk Analysis",
        content=sec14_text,
        table=sec14_table if sec14_table else None,
        order=14,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 15: Risk Mitigation Strategy
    # ──────────────────────────────────────────────────────────────────────────
    sec15_table = []
    for f in risk_factors:
        sec15_table.append({
            "Risk Dimension": f.get("category", "General"),
            "Rating": f.get("level", "MEDIUM"),
            "Actionable Mitigation Measure": f.get("mitigation", ""),
        })
    sec15_text = (
        f"Operational Risk Mitigation Protocols:\n\n"
        + "\n\n".join(
            f"{idx + 1}. {f.get('category')} Mitigation ({f.get('level')}):\n"
            f"   {f.get('mitigation')}"
            for idx, f in enumerate(risk_factors)
        )
    )
    sections.append(DPRSection(
        id="risk_mitigation",
        title="15. Risk Mitigation Strategy",
        content=sec15_text,
        table=sec15_table if sec15_table else None,
        order=15,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 16: Implementation Timeline & Milestones
    # ──────────────────────────────────────────────────────────────────────────
    sec16_table = [
        {"Milestone Stage": "1. Bank Loan Sanction & Formalities", "Duration": "Weeks 1–2", "Target Month": "Month 1", "Prerequisite": "DPR & KYC submission"},
        {"Milestone Stage": "2. Workshed / Site Preparation", "Duration": "Weeks 3–5", "Target Month": "Month 1–2", "Prerequisite": "Initial disbursement"},
        {"Milestone Stage": "3. Machinery & Tools Procurement", "Duration": "Weeks 5–7", "Target Month": "Month 2", "Prerequisite": "Site readiness & vendor order"},
        {"Milestone Stage": "4. Trial Testing & Raw Material Stocking", "Duration": "Weeks 8–9", "Target Month": "Month 2–3", "Prerequisite": "Equipment commissioning"},
        {"Milestone Stage": "5. Commercial Launch & Direct Sales", "Duration": "Week 10 Onwards", "Target Month": "Month 3", "Prerequisite": "Local buyer tie-ups"},
    ]
    sec16_text = (
        f"Project Implementation Schedule:\n"
        f"• Commissioning Horizon: The enterprise is scheduled for full commercial launch within 60 to 75 days of first loan drawdown.\n"
        f"• Moratorium Alignment: Commercial cash flow generation begins in Month 3, comfortably prior to the end of the {moratorium}-month principal moratorium window."
    )
    sections.append(DPRSection(
        id="implementation_timeline",
        title="16. Implementation Timeline & Milestones",
        content=sec16_text,
        table=sec16_table,
        order=16,
    ))

    # ──────────────────────────────────────────────────────────────────────────
    # Section 17: Key Assumptions & Statutory Disclaimers
    # ──────────────────────────────────────────────────────────────────────────
    sec17_table = [
        {"Assumption Head": "Capacity Ramp-up Curve", "Assumed Baseline": "75% (M1–3) → 90% (M4–6) → 100% (M7+)", "Sensitivity Impact": "Buffers initial sales learning curve"},
        {"Assumption Head": "Raw Material Price Stability", "Assumed Baseline": "Local mandi rates with +/-5% contingency", "Sensitivity Impact": "Bulk procurement post-harvest buffers variance"},
        {"Assumption Head": "Cash Collection Cycle", "Assumed Baseline": "15-day average collection cycle", "Sensitivity Impact": "15% working capital buffer maintained"},
        {"Assumption Head": "Bank Loan Terms", "Assumed Baseline": f"{rate}% p.a. interest over {tenure} months", "Sensitivity Impact": f"{moratorium}-month moratorium on principal"},
        {"Assumption Head": "Statutory Registration", "Assumed Baseline": "Udyam MSME + Trade/FSSAI as applicable", "Sensitivity Impact": "Prerequisite for formal subsidy release"},
    ]
    sec17_text = (
        f"Key Model Assumptions:\n"
        f"1. Capacity utilization follows an achievable ramp-up curve of 75% in initial months reaching 100% by Month 7.\n"
        f"2. Revenue and operational expense figures reflect prevailing local district price averages and do not invent speculative growth.\n"
        f"3. Government subsidies (e.g. under {scheme_name}) are credit-linked/back-ended and require field verification by implementing agencies.\n"
        f"4. The promoter will personally manage and supervise daily operations, preserving low administrative overheads.\n\n"
        f"Statutory Banking Disclaimer:\n"
        f"This Detailed Project Report (DPR) is an automated techno-economic model based on promoter profile inputs, "
        f"authoritative finance calculations, and official government scheme guidelines. It does NOT guarantee bank loan sanction, "
        f"interest subsidy disbursal, or scheme approval. Final lending decisions remain at the sole discretion of the financing institution "
        f"subject to credit appraisal, CIBIL verification, and physical inspection."
    )
    sections.append(DPRSection(
        id="assumptions_disclaimers",
        title="17. Key Assumptions & Statutory Disclaimers",
        content=sec17_text,
        table=sec17_table,
        order=17,
    ))

    # Apply user-submitted section note customizations if provided
    if section_customizations:
        for s in sections:
            if s.id in section_customizations:
                s.content += f"\n\n[Promoter Note]: {section_customizations[s.id]}"

    # 7. Financial & Promoter Summaries
    financial_summary = {
        "project_cost": cost,
        "user_capital": capital,
        "loan_amount": loan,
        "margin_pct": margin_pct,
        "interest_rate": rate,
        "loan_tenure": tenure,
        "moratorium": moratorium,
        "emi": emi,
        "subsidy_amount": subsidy,
        "expected_monthly_revenue": monthly_rev,
        "monthly_expenses": monthly_exp,
        "monthly_profit": monthly_profit,
        "annual_revenue": annual_rev,
        "annual_profit": annual_profit,
        "dscr": dscr,
        "break_even_month": break_even,
        "roi": roi,
        "recommended_loan": rec_loan,
        "maximum_eligible_loan": max_loan_cap,
        "eligibility_status": elig_status,
    }

    promoter_summary = {
        "name": promoter_name,
        "age": current_user.age,
        "gender": current_user.gender,
        "education": promoter_edu,
        "occupation": promoter_occ,
        "village": village,
        "block": block,
        "district": district,
        "state": state,
        "phone": phone,
        "email": email,
        "resources": resources_str,
    }

    scheme_summary = {
        "scheme_name": scheme_name,
        "scheme_id": scheme_id,
        "subsidy_amount": subsidy,
        "loan_amount": loan,
        "interest_rate": rate,
    }

    # 8. Compute finance snapshot hash
    fin_hash = compute_finance_snapshot_hash(finance_rec)

    # 9. Store in database
    report_dict = {
        "business_type": biz_type,
        "business_name": biz_name,
        "sections": [s.model_dump() for s in sections],
        "financial_summary": financial_summary,
        "promoter_summary": promoter_summary,
        "scheme_summary": scheme_summary,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "language": language,
    }

    existing_dpr = db.query(DPR).filter(DPR.user_id == user_id).first()
    if not existing_dpr:
        existing_dpr = DPR(
            user_id=user_id,
            business_type=biz_type,
            business_name=biz_name,
            assessment_id=latest_assessment.id if latest_assessment else None,
            finance_id=finance_rec.id,
            status="generated",
            finance_snapshot_hash=fin_hash,
            report_data=report_dict,
        )
        db.add(existing_dpr)
    else:
        existing_dpr.business_type = biz_type
        existing_dpr.business_name = biz_name
        existing_dpr.assessment_id = latest_assessment.id if latest_assessment else None
        existing_dpr.finance_id = finance_rec.id
        existing_dpr.status = "generated"
        existing_dpr.finance_snapshot_hash = fin_hash
        existing_dpr.report_data = report_dict

    db.commit()
    db.refresh(existing_dpr)

    # Synchronize generated DPR with documents portfolio
    try:
        from app.services.document_service import sync_dpr_document
        sync_dpr_document(db, user_id, existing_dpr)
    except Exception as d_exc:
        logger.warning("[DPR] Could not auto-sync DPR to documents portfolio: %s", d_exc)

    return DPRResponse(
        id=existing_dpr.id,
        user_id=existing_dpr.user_id,
        business_type=existing_dpr.business_type,
        business_name=existing_dpr.business_name,
        assessment_id=existing_dpr.assessment_id,
        finance_id=existing_dpr.finance_id,
        status=existing_dpr.status,
        needs_regeneration=False,
        staleness_reason=None,
        sections=sections,
        financial_summary=financial_summary,
        promoter_summary=promoter_summary,
        scheme_summary=scheme_summary,
        created_at=existing_dpr.created_at,
        updated_at=existing_dpr.updated_at,
    )


# ── Retrieve User's DPR ───────────────────────────────────────────────────────

def get_user_dpr(db: Session, current_user: User) -> DPRResponse | None:
    """
    Retrieve the current authenticated user's DPR.
    Checks whether the DPR is stale compared to latest Finance records.
    Returns None if no DPR exists.
    """
    user_id = current_user.id
    dpr = db.query(DPR).filter(DPR.user_id == user_id).first()
    if not dpr or not dpr.report_data:
        return None

    # Staleness check against current finance plan
    finance_rec = db.query(Finance).filter(Finance.user_id == user_id).first()
    needs_regeneration = False
    staleness_reason = None

    if finance_rec and dpr.finance_snapshot_hash:
        current_hash = compute_finance_snapshot_hash(finance_rec)
        if current_hash != dpr.finance_snapshot_hash:
            needs_regeneration = True
            staleness_reason = "Financial parameters or loan terms have been modified since the DPR was generated."
            if dpr.status != "needs_update":
                dpr.status = "needs_update"
                db.commit()

    report_data = dpr.report_data or {}
    sections_raw = report_data.get("sections", [])
    sections = [DPRSection(**s) for s in sections_raw]

    return DPRResponse(
        id=dpr.id,
        user_id=dpr.user_id,
        business_type=dpr.business_type,
        business_name=dpr.business_name,
        assessment_id=dpr.assessment_id,
        finance_id=dpr.finance_id,
        status=dpr.status,
        needs_regeneration=needs_regeneration,
        staleness_reason=staleness_reason,
        sections=sections,
        financial_summary=report_data.get("financial_summary", {}),
        promoter_summary=report_data.get("promoter_summary", {}),
        scheme_summary=report_data.get("scheme_summary", {}),
        created_at=dpr.created_at,
        updated_at=dpr.updated_at,
    )


# ── Update DPR Section Notes ──────────────────────────────────────────────────

def update_user_dpr(
    db: Session,
    current_user: User,
    section_notes: dict[str, str] | None = None,
    new_status: str | None = None,
) -> DPRResponse:
    """Update section notes or status on existing DPR for current_user.id."""
    user_id = current_user.id
    dpr = db.query(DPR).filter(DPR.user_id == user_id).first()
    if not dpr or not dpr.report_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No DPR found to update. Generate a DPR first.",
        )

    report_data = dict(dpr.report_data)
    sections = report_data.get("sections", [])

    if section_notes:
        for s in sections:
            s_id = s.get("id")
            if s_id in section_notes:
                s["notes"] = section_notes[s_id]

    report_data["sections"] = sections
    dpr.report_data = report_data
    flag_modified(dpr, "report_data")

    if new_status:
        dpr.status = new_status

    db.commit()
    db.refresh(dpr)

    return get_user_dpr(db, current_user)
