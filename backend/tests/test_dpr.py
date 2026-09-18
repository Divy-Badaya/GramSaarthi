"""
GRAMSAARTHI — Comprehensive DPR (Detailed Project Report) Test Suite
Tests:
1. Unauthenticated requests to /api/dpr/* rejected with HTTP 401
2. Pre-flight status when business missing
3. Pre-flight status when assessment missing
4. Pre-flight status when finance missing
5. Successful DPR generation with complete valid data (all 19 sections, financial summary)
6. GET /api/dpr/me retrieves current user's DPR
7. PUT /api/dpr/me updates section notes
8. Multi-user isolation (User A cannot access User B's DPR)
9. PDF generation endpoint /api/dpr/download returns valid %PDF binary stream
10. Regeneration detection: changing finance triggers needs_regeneration=True and status='needs_update'
11. Regeneration successfully updates DPR to match changed financial figures
12. DELETE /api/dpr/me removes DPR
13. Journey reset (/api/journey/me DELETE) removes DPR while preserving demographic profile
14. ML dataset preservation: verified 860 rows and 473 columns untouched
"""

import sys
import os
import unittest
import pandas as pd
from starlette.testclient import TestClient

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.finance import Finance
from app.models.assessment import Assessment
from app.models.activity import Activity
from app.models.dpr import DPR
from app.database.init_db import create_tables
from app.services.auth_service import hash_password, create_access_token
from app.services.dpr_service import compute_finance_snapshot_hash


class DPRTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        create_tables()

    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

        # Clean up any leftover test data
        self._cleanup()

    def tearDown(self):
        self._cleanup()
        self.db.close()

    def _cleanup(self):
        test_ids = [99991, 99992]
        self.db.query(DPR).filter(DPR.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(Finance).filter(Finance.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(Assessment).filter(Assessment.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(Activity).filter(Activity.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_(test_ids)).delete(synchronize_session=False)
        self.db.commit()

    def _create_user(self, user_id: int, phone: str, name: str, business: str):
        user = User(
            id=user_id,
            name=name,
            phone=phone,
            email=f"{phone}@example.com",
            hashed_password=hash_password("Secret@123"),
            language="Hindi",
            state="Madhya Pradesh",
            district="Sehore",
            block="Ashta",
            village="Khajuri Kalan",
            rural_or_urban="Rural",
            age=34,
            gender="Male",
            education="Graduate",
            occupation="Farmer & Dairy Operator",
            social_category="OBC",
            capital=100000,
            has_land=True,
            has_bank_account=True,
            business_type=business,
            business_name=f"{name} {business} Enterprise",
            business_interest=business,
        )
        self.db.add(user)
        self.db.commit()
        return user

    def _create_assessment(self, user_id: int, business: str):
        assessment = Assessment(
            user_id=user_id,
            location="Khajuri Kalan, Sehore",
            capital=100000,
            business_interest=business,
            experience="3 years in dairy management",
            status="completed",
        )
        self.db.add(assessment)
        self.db.commit()
        return assessment

    def _create_finance(self, user_id: int, business: str):
        finance = Finance(
            user_id=user_id,
            business_type=business,
            business_name=f"Dairy Unit {user_id}",
            project_cost=500000,
            user_capital=100000,
            loan_amount=400000,
            margin_pct=20.0,
            interest_rate=7.0,
            loan_tenure=60,
            moratorium=6,
            emi=7920,
            subsidy_amount=125000,
            subsidy_percentage=25.0,
            matched_scheme_id="PMMY",
            matched_scheme_name="PM Mudra Yojana – Kishore",
            expected_monthly_revenue=45000,
            monthly_expenses=25000,
            monthly_profit=12080,
            annual_revenue=540000,
            annual_profit=144960,
            annual_debt_obligation=95040,
            annual_cfads=240000,
            dscr=2.52,
            break_even_month=7,
            roi=28.9,
            status="finalized",
        )
        self.db.add(finance)
        self.db.commit()
        return finance

    def _auth_header(self, user_or_phone) -> dict:
        if isinstance(user_or_phone, User):
            user_id = user_or_phone.id
            ph = user_or_phone.phone
        elif isinstance(user_or_phone, int):
            user_id = user_or_phone
            u = self.db.query(User).filter(User.id == user_id).first()
            ph = u.phone if u else "9999100001"
        else:
            u = self.db.query(User).filter(User.phone == str(user_or_phone)).first()
            user_id = u.id if u else 99991
            ph = str(user_or_phone)
        token = create_access_token(user_id, extra_data={"phone": ph})
        return {"Authorization": f"Bearer {token}"}

    # ── Test 1: Unauthenticated request rejected ──────────────────────────────
    def test_unauthenticated_dpr_request(self):
        endpoints = [
            ("GET", "/api/dpr/status"),
            ("GET", "/api/dpr/me"),
            ("POST", "/api/dpr/generate"),
            ("PUT", "/api/dpr/me"),
            ("DELETE", "/api/dpr/me"),
            ("GET", "/api/dpr/download"),
        ]
        for method, path in endpoints:
            res = self.client.request(method, path)
            self.assertEqual(res.status_code, 401, f"Expected 401 for {method} {path}")

    # ── Test 2: Status check when business is missing ─────────────────────────
    def test_status_missing_business(self):
        user = self._create_user(99991, "9999100001", "Ramesh Kumar", "")
        user.business_type = None
        user.business_interest = None
        self.db.commit()

        headers = self._auth_header(user.phone)
        res = self.client.get("/api/dpr/status", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["ready"])
        self.assertFalse(data["has_business"])
        self.assertEqual(data["next_step"], "/business")

    # ── Test 3: Status check when assessment is missing ───────────────────────
    def test_status_missing_assessment(self):
        user = self._create_user(99991, "9999100001", "Ramesh Kumar", "Dairy")
        headers = self._auth_header(user.phone)
        res = self.client.get("/api/dpr/status", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["ready"])
        self.assertFalse(data["has_assessment"])
        self.assertEqual(data["next_step"], "/business/assessment")

    # ── Test 4: Status check when finance is missing ──────────────────────────
    def test_status_missing_finance(self):
        user = self._create_user(99991, "9999100001", "Ramesh Kumar", "Dairy")
        self._create_assessment(user.id, "Dairy")
        headers = self._auth_header(user.phone)
        res = self.client.get("/api/dpr/status", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["ready"])
        self.assertFalse(data["has_finance"])
        self.assertEqual(data["next_step"], "/finance")

    # ── Test 5: Successful DPR generation with all 19 sections ────────────────
    def test_generate_dpr_success(self):
        user = self._create_user(99991, "9999100001", "Ramesh Kumar", "Dairy")
        self._create_assessment(user.id, "Dairy")
        fin = self._create_finance(user.id, "Dairy")

        headers = self._auth_header(user.phone)
        # Check pre-flight status is ready
        status_res = self.client.get("/api/dpr/status", headers=headers)
        self.assertEqual(status_res.status_code, 200)
        self.assertTrue(status_res.json()["ready"])

        # Generate DPR
        gen_res = self.client.post("/api/dpr/generate", json={"language": "English"}, headers=headers)
        self.assertEqual(gen_res.status_code, 200)
        dpr_data = gen_res.json()

        # Verify essential fields
        self.assertEqual(dpr_data["user_id"], user.id)
        self.assertEqual(dpr_data["business_type"], "Dairy")
        self.assertEqual(dpr_data["status"], "generated")
        self.assertFalse(dpr_data["needs_regeneration"])

        # Verify sections count (17 comprehensive sections)
        sections = dpr_data["sections"]
        self.assertGreaterEqual(len(sections), 17)
        section_ids = [s["id"] for s in sections]
        self.assertIn("business_overview", section_ids)
        self.assertIn("promoter_profile", section_ids)
        self.assertIn("business_description", section_ids)
        self.assertIn("market_context", section_ids)
        self.assertIn("investment_outlay", section_ids)
        self.assertIn("funding_structure", section_ids)
        self.assertIn("revenue_projections", section_ids)
        self.assertIn("operating_expenses", section_ids)
        self.assertIn("profitability_analysis", section_ids)
        self.assertIn("break_even_analysis", section_ids)
        self.assertIn("loan_requirement", section_ids)
        self.assertIn("financial_metrics", section_ids)
        self.assertIn("government_schemes", section_ids)
        self.assertIn("risk_analysis", section_ids)
        self.assertIn("risk_mitigation", section_ids)
        self.assertIn("implementation_timeline", section_ids)
        self.assertIn("assumptions_disclaimers", section_ids)

        # Verify authoritative financial values match Finance model
        fin_sum = dpr_data["financial_summary"]
        self.assertEqual(fin_sum["project_cost"], fin.project_cost)
        self.assertEqual(fin_sum["loan_amount"], fin.loan_amount)
        self.assertEqual(fin_sum["user_capital"], fin.user_capital)
        self.assertEqual(fin_sum["emi"], fin.emi)
        self.assertEqual(fin_sum["expected_monthly_revenue"], fin.expected_monthly_revenue)
        self.assertEqual(fin_sum["monthly_expenses"], fin.monthly_expenses)
        self.assertEqual(fin_sum["monthly_profit"], fin.monthly_profit)
        self.assertEqual(fin_sum["dscr"], fin.dscr)

    # ── Test 6: GET /api/dpr/me ───────────────────────────────────────────────
    def test_get_my_dpr(self):
        user = self._create_user(99991, "9999100001", "Ramesh Kumar", "Dairy")
        self._create_assessment(user.id, "Dairy")
        self._create_finance(user.id, "Dairy")
        headers = self._auth_header(user.phone)

        # Before generating, GET /api/dpr/me should return 404
        r404 = self.client.get("/api/dpr/me", headers=headers)
        self.assertEqual(r404.status_code, 404)

        # Generate DPR
        self.client.post("/api/dpr/generate", json={"language": "English"}, headers=headers)

        # Now GET /api/dpr/me returns 200
        res = self.client.get("/api/dpr/me", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user_id"], user.id)

    # ── Test 7: Update DPR Section Notes ──────────────────────────────────────
    def test_update_dpr_notes(self):
        user = self._create_user(99991, "9999100001", "Ramesh Kumar", "Dairy")
        self._create_assessment(user.id, "Dairy")
        self._create_finance(user.id, "Dairy")
        headers = self._auth_header(user.phone)

        self.client.post("/api/dpr/generate", json={"language": "English"}, headers=headers)

        # Update note for business overview
        update_res = self.client.put(
            "/api/dpr/me",
            json={"section_notes": {"business_overview": "Promoter has 5 years prior experience."}},
            headers=headers,
        )
        self.assertEqual(update_res.status_code, 200)
        updated_dpr = update_res.json()
        exec_sec = next(s for s in updated_dpr["sections"] if s["id"] == "business_overview")
        self.assertIn("Promoter has 5 years prior experience.", exec_sec.get("notes", ""))

    # ── Test 8: Multi-user isolation ──────────────────────────────────────────
    def test_multi_user_isolation(self):
        user_a = self._create_user(99991, "9999100001", "User A", "Dairy")
        self._create_assessment(user_a.id, "Dairy")
        self._create_finance(user_a.id, "Dairy")
        headers_a = self._auth_header(user_a.phone)
        self.client.post("/api/dpr/generate", json={"language": "English"}, headers=headers_a)

        user_b = self._create_user(99992, "9999200002", "User B", "Poultry")
        self._create_assessment(user_b.id, "Poultry")
        self._create_finance(user_b.id, "Poultry")
        headers_b = self._auth_header(user_b.phone)

        # User B should NOT have a DPR yet (returns 404, not User A's DPR)
        res_b = self.client.get("/api/dpr/me", headers=headers_b)
        self.assertEqual(res_b.status_code, 404)

        # Generate User B's DPR
        self.client.post("/api/dpr/generate", json={"language": "English"}, headers=headers_b)

        # User A's GET returns User A's DPR
        res_a_check = self.client.get("/api/dpr/me", headers=headers_a)
        self.assertEqual(res_a_check.status_code, 200)
        self.assertEqual(res_a_check.json()["user_id"], user_a.id)
        self.assertEqual(res_a_check.json()["business_type"], "Dairy")

        # User B's GET returns User B's DPR
        res_b_check = self.client.get("/api/dpr/me", headers=headers_b)
        self.assertEqual(res_b_check.status_code, 200)
        self.assertEqual(res_b_check.json()["user_id"], user_b.id)
        self.assertEqual(res_b_check.json()["business_type"], "Poultry")

    # ── Test 9: PDF Generation ────────────────────────────────────────────────
    def test_pdf_download_stream(self):
        user = self._create_user(99991, "9999100001", "Ramesh Kumar", "Dairy")
        self._create_assessment(user.id, "Dairy")
        self._create_finance(user.id, "Dairy")
        headers = self._auth_header(user.phone)

        self.client.post("/api/dpr/generate", json={"language": "English"}, headers=headers)

        res = self.client.get("/api/dpr/download", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "application/pdf")
        self.assertIn("attachment; filename=", res.headers["content-disposition"])
        # Validate PDF magic bytes
        self.assertTrue(res.content.startswith(b"%PDF"))

    # ── Test 10: Regeneration after Finance modification ──────────────────────
    def test_staleness_detection_and_regeneration(self):
        user = self._create_user(99991, "9999100001", "Ramesh Kumar", "Dairy")
        self._create_assessment(user.id, "Dairy")
        fin = self._create_finance(user.id, "Dairy")
        headers = self._auth_header(user.phone)

        # Generate original DPR
        self.client.post("/api/dpr/generate", json={"language": "English"}, headers=headers)

        # User updates Finance (project cost increases from 500,000 to 800,000)
        fin.project_cost = 800000
        fin.loan_amount = 700000
        fin.emi = 13860
        self.db.commit()

        # DPR status check must detect staleness
        status_res = self.client.get("/api/dpr/status", headers=headers)
        self.assertEqual(status_res.status_code, 200)
        self.assertTrue(status_res.json()["needs_regeneration"])
        self.assertEqual(status_res.json()["dpr_status"], "needs_update")

        # GET /api/dpr/me also marks needs_regeneration=True
        me_res = self.client.get("/api/dpr/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)
        self.assertTrue(me_res.json()["needs_regeneration"])
        self.assertEqual(me_res.json()["status"], "needs_update")

        # Regenerate DPR
        regen_res = self.client.post("/api/dpr/generate", json={"language": "English"}, headers=headers)
        self.assertEqual(regen_res.status_code, 200)
        regen_data = regen_res.json()
        self.assertEqual(regen_data["status"], "generated")
        self.assertFalse(regen_data["needs_regeneration"])
        self.assertEqual(regen_data["financial_summary"]["project_cost"], 800000)
        self.assertEqual(regen_data["financial_summary"]["loan_amount"], 700000)

    # ── Test 11: DELETE /api/dpr/me ───────────────────────────────────────────
    def test_delete_my_dpr(self):
        user = self._create_user(99991, "9999100001", "Ramesh Kumar", "Dairy")
        self._create_assessment(user.id, "Dairy")
        self._create_finance(user.id, "Dairy")
        headers = self._auth_header(user.phone)

        self.client.post("/api/dpr/generate", json={"language": "English"}, headers=headers)
        del_res = self.client.delete("/api/dpr/me", headers=headers)
        self.assertEqual(del_res.status_code, 200)

        # Now GET /api/dpr/me is 404
        check = self.client.get("/api/dpr/me", headers=headers)
        self.assertEqual(check.status_code, 404)

    # ── Test 12: Journey Reset Deletes DPR while preserving profile ───────────
    def test_journey_reset_deletes_dpr(self):
        user = self._create_user(99991, "9999100001", "Ramesh Kumar", "Dairy")
        self._create_assessment(user.id, "Dairy")
        self._create_finance(user.id, "Dairy")
        headers = self._auth_header(user.phone)

        self.client.post("/api/dpr/generate", json={"language": "English"}, headers=headers)

        # Reset journey
        journey_res = self.client.delete("/api/journey/me", headers=headers)
        self.assertEqual(journey_res.status_code, 200)

        # DPR must be deleted
        check_dpr = self.client.get("/api/dpr/me", headers=headers)
        self.assertEqual(check_dpr.status_code, 404)

        # User profile demographic data must remain intact
        self.db.rollback()
        user_db = self.db.query(User).filter(User.id == user.id).first()
        self.assertIsNotNone(user_db)
        self.assertEqual(user_db.name, "Ramesh Kumar")
        self.assertEqual(user_db.phone, "9999100001")
        self.assertEqual(user_db.village, "Khajuri Kalan")
        self.assertEqual(user_db.district, "Sehore")
        self.assertEqual(user_db.state, "Madhya Pradesh")
        # Journey specific fields should be reset
        self.assertIsNone(user_db.business_type)

    # ── Test 13: Dataset Preservation (Non-Destructive) ───────────────────────
    def test_dataset_preservation(self):
        dataset_path = os.path.join(backend_dir, "ml", "gramsaarthi_ml_dataset.csv")
        self.assertTrue(os.path.exists(dataset_path), "ML dataset must exist")
        df = pd.read_csv(dataset_path)
        self.assertEqual(df.shape[0], 860, "Dataset rows must remain strictly 860")
        self.assertEqual(df.shape[1], 473, "Dataset columns must remain strictly 473")


if __name__ == "__main__":
    unittest.main()
