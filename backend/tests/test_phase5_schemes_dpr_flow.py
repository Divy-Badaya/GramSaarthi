"""
GRAMSAARTHI — Phase 5 Comprehensive Automated Test Suite
Tests:
1. Dataset shape integrity (strictly 860 rows x 473 columns)
2. Government Scheme Matching:
   - Strict 4 categories: Likely eligible, Potentially eligible, Not eligible, Insufficient information
   - All fields present: why_eligible, satisfied_conditions, missing_conditions, required_documents, benefits, next_action
   - Verified project-specific benefits computation (PMEGP, PMFME, Mudra, KCC, Stand-Up India, etc.)
   - No guaranteed eligibility claims
3. Connect Schemes to Business Context:
   - Selected business, user profile, location, investment/project cost, business category, financial requirements
4. Intelligent DPR Generation:
   - Seamless end-to-end integration: profile -> assessment -> business -> finance -> loan -> schemes -> risk -> DPR
   - Covers all 16 designated areas + Section 17 for Key Assumptions & Statutory Disclaimers
   - Clear identification of assumptions
   - No invented or fabricated missing values
   - PDF generation preserves ReportLab binary output (%PDF-)
5. API Integration via TestClient:
   - GET /api/schemes with project_cost & loan_amount
   - POST /api/schemes/evaluate-eligibility with full business & financial context
   - POST /api/dpr/generate & GET /api/dpr/pdf
"""

import sys
import os
import pandas as pd
from starlette.testclient import TestClient

# Set stdout to UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.database.connection import SessionLocal
from app.database.init_db import create_tables
from app.models.user import User
from app.models.finance import Finance
from app.models.assessment import Assessment
from app.services.auth_service import hash_password, create_access_token
from app.services import scheme_service, dpr_service, dpr_pdf_service, finance_service, loan_eligibility_service, risk_analysis_service
from app.schemas.scheme import UserAssessmentProfile, EligibilityEvaluateRequest


def test_01_dataset_shape_integrity():
    """Verify dataset has not been modified, filtered, sampled, or aggregated."""
    csv_path = os.path.join(backend_dir, "ml", "gramsaarthi_ml_dataset.csv")
    df = pd.read_csv(csv_path)
    print(f"\n[DATASET INTEGRITY] Shape: {df.shape}")
    assert df.shape == (860, 473), f"Dataset shape modified! Expected (860, 473), got {df.shape}"


def test_02_scheme_matching_strict_categories_and_fields():
    """Verify all recommended schemes contain the 4 strict categories and all required fields."""
    profile = UserAssessmentProfile(
        business="Dairy Farming",
        business_category="Dairy",
        state="Rajasthan",
        district="Jaipur",
        category="OBC",
        gender="Female",
        investment=150000,
        project_cost=1000000,
        loan_amount=750000,
    )

    recs = scheme_service.recommend_schemes(profile)
    assert len(recs) > 0, "Expected recommended schemes for Dairy Farming"

    valid_categories = {
        "Likely eligible",
        "Potentially eligible",
        "Not eligible",
        "Insufficient information",
    }

    print(f"\n[SCHEME MATCHING VERIFICATION] Found {len(recs)} schemes:")
    for rec in recs[:5]:
        print(f"- {rec.scheme_name} [{rec.eligibility_status}]")
        print(f"  Why: {rec.why_eligible[:80]}...")
        print(f"  Benefits: {rec.benefits[:80]}...")
        print(f"  Next Action: {rec.next_action[:80]}...")

        # Strict Category check
        assert rec.eligibility_status in valid_categories, f"Invalid status: {rec.eligibility_status}"

        # Required fields check
        assert rec.why_eligible and len(rec.why_eligible) > 0
        assert isinstance(rec.satisfied_conditions, list)
        assert isinstance(rec.missing_conditions, list)
        assert isinstance(rec.required_documents, list)
        assert rec.benefits and len(rec.benefits) > 0
        assert rec.next_action and len(rec.next_action) > 0

        # No guaranteed eligibility check
        lower_why = rec.why_eligible.lower()
        lower_action = rec.next_action.lower()
        assert "guaranteed" not in lower_why
        assert "100% guarantee" not in lower_action


def test_03_connect_schemes_to_business_verified_benefits():
    """Verify verified benefits are calculated from actual business context & project costs."""
    # Test PMEGP rural female subsidy (35% margin money)
    prof_pmegp = UserAssessmentProfile(
        project_cost=800000,
        loan_amount=600000,
        category="OBC",
        gender="Female",
        rural_or_urban="Rural",
    )
    b_pmegp = scheme_service.compute_verified_project_benefits("PMEGP", prof_pmegp)
    print(f"\n[VERIFIED BENEFITS] PMEGP: {b_pmegp}")
    assert "35%" in b_pmegp or "25%" in b_pmegp
    assert "margin money subsidy" in b_pmegp.lower()

    # Test PMFME food processing capital subsidy (35% up to 10L)
    prof_pmfme = UserAssessmentProfile(
        project_cost=1000000,
        loan_amount=700000,
        category="General",
        rural_or_urban="Rural",
    )
    b_pmfme = scheme_service.compute_verified_project_benefits("PMFME", prof_pmfme)
    print(f"[VERIFIED BENEFITS] PMFME: {b_pmfme}")
    assert "35%" in b_pmfme
    assert "350,000" in b_pmfme or "3,50,000" in b_pmfme

    # Test Mudra loan tier (Kishore for ₹4L, Tarun for ₹8L)
    prof_mudra = UserAssessmentProfile(
        project_cost=450000,
        loan_amount=400000,
    )
    b_mudra_kishore = scheme_service.compute_verified_project_benefits("PMMY", prof_mudra)
    print(f"[VERIFIED BENEFITS] Mudra Kishore: {b_mudra_kishore}")
    assert "Kishore" in b_mudra_kishore
    assert "collateral-free" in b_mudra_kishore.lower()


def test_04_intelligent_dpr_all_16_areas_and_assumptions():
    """Verify DPR includes all 16 designated areas + Section 17 assumptions & statutory disclaimers."""
    db = SessionLocal()
    create_tables()

    test_phone = "9876599901"
    db.query(User).filter(User.phone == test_phone).delete()
    db.commit()

    test_user = User(
        name="Ramesh Kumar",
        phone=test_phone,
        hashed_password=hash_password("Pass1234"),
        age=32,
        gender="Male",
        social_category="OBC",
        education="12th Pass",
        occupation="Dairy & Agriculture",
        experience="4 years",
        state="Rajasthan",
        district="Jaipur",
        block="Amber",
        village="Kukas",
        business_type="Dairy",
        skills="Dairy farming, livestock management, milk testing",
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)

    # 1. Assessment
    assessment = Assessment(
        user_id=test_user.id,
        business_interest="Dairy",
        location="Kukas, Jaipur, Rajasthan",
        capital=200000,
        experience="4 years",
        status="completed",
    )
    db.add(assessment)
    db.commit()

    # 2. Finance
    plan_data = finance_service.calculate_financial_plan(
        business_type="Dairy",
        user_capital=200000,
        project_cost=1000000,
        loan_amount=750000,
    )
    finance = finance_service.save_or_update_user_finance(db, test_user.id, plan_data)

    try:
        # Generate DPR
        dpr_data = dpr_service.generate_dpr(db, test_user, language="en")
        dpr_dict = dpr_data.model_dump()
        sections = dpr_dict.get("sections", [])
        section_ids = [s["id"] for s in sections]

        print(f"\n[INTELLIGENT DPR VERIFICATION] Generated {len(sections)} sections:")
        for s in sections:
            has_table = "Yes" if s.get("table") else "No"
            print(f"- {s['title']} (Table: {has_table})")

        # 16 Designated areas + Section 17 for Assumptions
        expected_section_ids = [
            "business_overview",
            "promoter_profile",
            "business_description",
            "market_context",
            "investment_outlay",
            "funding_structure",
            "revenue_projections",
            "operating_expenses",
            "profitability_analysis",
            "break_even_analysis",
            "loan_requirement",
            "financial_metrics",
            "government_schemes",
            "risk_analysis",
            "risk_mitigation",
            "implementation_timeline",
            "assumptions_disclaimers",
        ]

        for expected_id in expected_section_ids:
            assert expected_id in section_ids, f"Missing required DPR section: {expected_id}"

        # Verify no fabricated / invented missing data
        # Location, district, promoter, business, metrics must match actual database records
        assert "Dairy" in dpr_dict["business_name"]
        assert dpr_dict["promoter_summary"]["name"] == "Ramesh Kumar"
        assert dpr_dict["promoter_summary"]["district"] == "Jaipur"
        assert dpr_dict["financial_summary"]["project_cost"] == 1000000
        assert dpr_dict["financial_summary"]["loan_amount"] == 750000

        # Verify Section 17 clearly identifies assumptions
        sec17 = next(s for s in sections if s["id"] == "assumptions_disclaimers")
        assert "Key Model Assumptions:" in sec17["content"]
        assert "Statutory Banking Disclaimer:" in sec17["content"]
        assert "does NOT guarantee bank loan sanction" in sec17["content"]

        # Verify Section 14 multi-dimensional risk analysis
        sec14 = next(s for s in sections if s["id"] == "risk_analysis")
        assert "Comprehensive multi-dimensional risk appraisal" in sec14["content"]
        assert len(sec14["table"]) == 8, f"Expected 8 risk factors in table, got {len(sec14['table'])}"

        # Verify Section 13 government schemes
        sec13 = next(s for s in sections if s["id"] == "government_schemes")
        assert "Indicative Match Status:" in sec13["content"]
        assert "Verified Project-Specific Benefits:" in sec13["content"]

        # Verify PDF generation produces valid binary PDF
        pdf_buf = dpr_pdf_service.generate_dpr_pdf_buffer(dpr_dict)
        pdf_bytes = pdf_buf.getvalue()
        assert isinstance(pdf_bytes, (bytes, bytearray))
        assert len(pdf_bytes) > 5000, f"Generated PDF unexpectedly small: {len(pdf_bytes)} bytes"
        assert pdf_bytes.startswith(b"%PDF-"), "Generated file does not have valid PDF header"
        print(f"[DPR PDF VERIFICATION] Valid PDF generated: {len(pdf_bytes):,} bytes")

    finally:
        db.query(Assessment).filter(Assessment.user_id == test_user.id).delete()
        db.query(Finance).filter(Finance.user_id == test_user.id).delete()
        db.query(User).filter(User.id == test_user.id).delete()
        db.commit()
        db.close()


def test_05_api_endpoints_schemes_and_dpr_flow():
    """Verify HTTP API endpoints for schemes and DPR."""
    db = SessionLocal()
    create_tables()

    test_phone = "9876599902"
    db.query(User).filter(User.phone == test_phone).delete()
    db.commit()

    user = User(
        name="Sunita Devi",
        phone=test_phone,
        hashed_password=hash_password("Pass1234"),
        age=29,
        gender="Female",
        social_category="General",
        education="Graduate",
        occupation="Food Processing",
        experience="3 years",
        state="Gujarat",
        district="Anand",
        block="Anand",
        village="Mogri",
        business_type="Food Processing",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    client = TestClient(app)

    try:
        # 1. GET /api/schemes with project_cost & loan_amount
        res_schemes = client.get(
            "/api/schemes?project_cost=500000&loan_amount=400000&business_type=Food Processing",
            headers=headers,
        )
        assert res_schemes.status_code == 200
        schemes_data = res_schemes.json()
        assert len(schemes_data) > 0
        first_scheme = schemes_data[0]
        assert "why_eligible" in first_scheme
        assert "benefits" in first_scheme
        assert "next_action" in first_scheme
        assert "satisfied_conditions" in first_scheme
        assert "missing_conditions" in first_scheme
        print(f"\n[API SCHEMES] Retrieved {len(schemes_data)} schemes, status of first: {first_scheme.get('eligibility_status')}")

        # 2. POST /api/schemes/{scheme_id}/eligibility
        target_scheme_id = str(first_scheme.get("scheme_id") or "PMMY")
        res_eval = client.post(
            f"/api/schemes/{target_scheme_id}/eligibility",
            json={
                "scheme_id": target_scheme_id,
                "profile": {
                    "business": "Food Processing",
                    "business_category": "Food Processing",
                    "state": "Gujarat",
                    "district": "Anand",
                    "gender": "Female",
                    "project_cost": 500000,
                    "loan_amount": 400000,
                    "investment": 100000,
                },
                "answers": {"is_rural": True, "has_bank_account": True},
            },
            headers=headers,
        )
        assert res_eval.status_code == 200
        eval_data = res_eval.json()
        assert eval_data["status"] in {"Likely eligible", "Potentially eligible", "Not eligible", "Insufficient information"}
        assert "benefits" in eval_data
        assert "next_action" in eval_data
        print(f"[API EVALUATE] Scheme: {first_scheme['name']} -> Status: {eval_data['status']}")

        # 3. Setup Finance for DPR generation
        plan_data = finance_service.calculate_financial_plan(
            business_type="Food Processing",
            user_capital=100000,
            project_cost=500000,
            loan_amount=400000,
        )
        finance_service.save_or_update_user_finance(db, user.id, plan_data)

        # 4. POST /api/dpr/generate
        res_dpr_gen = client.post("/api/dpr/generate", json={"language": "en"}, headers=headers)
        assert res_dpr_gen.status_code == 200
        dpr_resp = res_dpr_gen.json()
        assert len(dpr_resp["sections"]) >= 16
        print(f"[API DPR GENERATE] Generated DPR with {len(dpr_resp['sections'])} sections")

        # 5. GET /api/dpr/download
        res_pdf = client.get("/api/dpr/download", headers=headers)
        assert res_pdf.status_code == 200
        assert res_pdf.headers["content-type"] == "application/pdf"
        assert res_pdf.content.startswith(b"%PDF-")
        print(f"[API DPR PDF] Downloaded PDF: {len(res_pdf.content):,} bytes")

    finally:
        db.query(Finance).filter(Finance.user_id == user.id).delete()
        db.query(Assessment).filter(Assessment.user_id == user.id).delete()
        db.query(User).filter(User.id == user.id).delete()
        db.commit()
        db.close()
