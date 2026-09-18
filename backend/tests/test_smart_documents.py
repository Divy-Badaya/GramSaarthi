"""
GRAMSAARTHI — Smart Document Checklist & Multi-Stage Integration Test Suite (Phase D2)

Exhaustive verification of all 10+ required integration scenarios:
- Scenario 1: User with no uploaded documents (0% completion, all missing).
- Scenario 2: User with uploaded documents (metadata attached, status flips to Uploaded).
- Scenario 3: User with missing required documents (missing items breakdown).
- Scenario 4: User with selected business (Dairy, Poultry, Food Processing, Agriculture).
- Scenario 5: User with loan information (Under 20L vs High loan > 20L requiring collateral).
- Scenario 6: User with matched schemes (PMEGP, PMMY, KCC, Stand-Up India).
- Scenario 7: User with generated DPR (ReportLab PDF synced, status='Uploaded', needs attention handling).
- Scenario 8: Multiple users with different profiles (Strict multi-user isolation).
- Scenario 9: Changing business / scheme dynamically (via query param and profile updates).
- Scenario 10: DPR generation creates Document record and syncs into portfolio and checklist.
- Scenario 11: Reconciliation with initialized checklist (in-place placeholder update without duplicates).
"""

import sys
import os
import io
import unittest
from starlette.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.assessment import Assessment
from app.models.finance import Finance
from app.models.dpr import DPR
from app.models.document import Document
from app.database.init_db import create_tables
from app.services.auth_service import hash_password, create_access_token
from app.services.scheme_service import SCHEME_METADATA
from app.services import document_service


class SmartDocumentsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        create_tables()

    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()
        self._cleanup()

        # User 1: Dairy Farming
        self.user_dairy = User(
            id=99801,
            name="Dairy Farmer Ramesh",
            phone="9980100000",
            language="English",
            hashed_password=hash_password("pass123"),
            business_type="Dairy Farming",
            rural_or_urban="Rural",
            social_category="General",
            is_active=True,
        )
        # User 2: Poultry Broiler Farming
        self.user_poultry = User(
            id=99802,
            name="Poultry Entrepreneur Suresh",
            phone="9980200000",
            language="English",
            hashed_password=hash_password("pass123"),
            business_type="Poultry Broiler Farming",
            rural_or_urban="Rural",
            social_category="OBC",
            is_active=True,
        )
        # User 3: Food Processing
        self.user_food = User(
            id=99803,
            name="Food Processor Anita",
            phone="9980300000",
            language="English",
            hashed_password=hash_password("pass123"),
            business_type="Spices & Flour Processing",
            rural_or_urban="Urban",
            social_category="General",
            is_active=True,
        )
        # User 4: Agriculture / Horticulture
        self.user_agri = User(
            id=99804,
            name="Farmer Rajesh",
            phone="9980400000",
            language="English",
            hashed_password=hash_password("pass123"),
            business_type="Horticulture & Greenhouse Farming",
            rural_or_urban="Rural",
            social_category="SC",
            is_active=True,
        )
        # User 5: High Loan Entrepreneur
        self.user_high_loan = User(
            id=99805,
            name="Industrialist Vikram",
            phone="9980500000",
            language="English",
            hashed_password=hash_password("pass123"),
            business_type="Agro Machinery Fabrication",
            rural_or_urban="Rural",
            social_category="General",
            is_active=True,
        )

        self.db.add_all([
            self.user_dairy,
            self.user_poultry,
            self.user_food,
            self.user_agri,
            self.user_high_loan,
        ])
        self.db.commit()

        # Access tokens
        self.token_dairy = create_access_token(self.user_dairy.id)
        self.token_poultry = create_access_token(self.user_poultry.id)
        self.token_food = create_access_token(self.user_food.id)
        self.token_agri = create_access_token(self.user_agri.id)
        self.token_high_loan = create_access_token(self.user_high_loan.id)

    def tearDown(self):
        try:
            self.db.rollback()
            self._cleanup()
        finally:
            self.db.close()

    def _cleanup(self):
        test_ids = [99801, 99802, 99803, 99804, 99805]
        # Clean physical test files from disk
        docs = self.db.query(Document).filter(Document.user_id.in_(test_ids)).all()
        for d in docs:
            document_service.delete_physical_file(d.storage_path)

        self.db.query(Document).filter(Document.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(DPR).filter(DPR.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(Finance).filter(Finance.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(Assessment).filter(Assessment.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_(test_ids)).delete(synchronize_session=False)
        self.db.commit()

    def _make_dummy_pdf(self) -> bytes:
        return b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"

    def _make_finance(
        self,
        user_id: int,
        business_type: str = "Dairy Farming",
        loan_amount: int = 800000,
        matched_scheme_id: str = "PMEGP",
        matched_scheme_name: str = "Prime Minister Employment Generation Programme",
    ) -> Finance:
        project_cost = int(loan_amount / 0.8)
        user_capital = project_cost - loan_amount
        return Finance(
            user_id=user_id,
            business_type=business_type,
            business_name=f"{business_type} Unit",
            project_cost=project_cost,
            user_capital=user_capital,
            loan_amount=loan_amount,
            margin_pct=20.0,
            interest_rate=8.5,
            loan_tenure=60,
            moratorium=6,
            emi=16500,
            subsidy_amount=150000,
            subsidy_percentage=25.0,
            matched_scheme_id=matched_scheme_id,
            matched_scheme_name=matched_scheme_name,
            expected_monthly_revenue=120000,
            monthly_expenses=75000,
            monthly_profit=45000,
            annual_revenue=1440000,
            annual_profit=540000,
            annual_debt_obligation=198000,
            annual_cfads=540000,
            dscr=2.72,
            break_even_month=8,
            roi=35.5,
            status="finalized",
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Unauthenticated Protection
    # ──────────────────────────────────────────────────────────────────────────

    def test_unauthenticated_checklist_returns_401(self):
        """GET /api/documents/checklist without Bearer token must return HTTP 401."""
        resp = self.client.get("/api/documents/checklist")
        self.assertEqual(resp.status_code, 401)

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 1: User with No Uploaded Documents
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_1_no_uploaded_documents(self):
        """User with no uploaded documents has completion_percentage=0, uploaded_count=0, and all items Missing."""
        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["completion_percentage"], 0)
        self.assertEqual(data["uploaded_count"], 0)
        self.assertGreater(data["total_required"], 0)
        self.assertEqual(data["missing_count"], data["total_required"])
        self.assertEqual(len(data["items"]), len(data["items"]))

        # Every item must have status "Missing"
        for item in data["items"]:
            self.assertEqual(item["status"], "Missing", f"Item '{item['title']}' should be Missing")
            self.assertIsNone(item["document_id"])
            self.assertIsNone(item["file_name"])

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 2: User with Uploaded Documents
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_2_user_with_uploaded_documents(self):
        """When user uploads files, status flips to Uploaded and document metadata is attached."""
        # User uploads Aadhaar and PAN
        doc_aadhaar = Document(
            user_id=self.user_dairy.id,
            title="Aadhaar Card",
            category="Identity",
            file_name="aadhaar_ramesh.pdf",
            storage_path="uploads/dummy_aadhaar.pdf",
            file_size=245000,
            file_type="application/pdf",
            status="Uploaded",
            remarks="UIDAI verified copy",
        )
        doc_pan = Document(
            user_id=self.user_dairy.id,
            title="PAN Card",
            category="Identity",
            file_name="pan_ramesh.pdf",
            storage_path="uploads/dummy_pan.pdf",
            file_size=190000,
            file_type="application/pdf",
            status="Uploaded",
            remarks="Income Tax Department e-PAN",
        )
        self.db.add_all([doc_aadhaar, doc_pan])
        self.db.commit()

        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertGreater(data["uploaded_count"], 0)
        self.assertGreater(data["completion_percentage"], 0)

        # Check Aadhaar item metadata
        aadhaar_item = next(i for i in data["items"] if i["id"] == "req_aadhaar")
        self.assertEqual(aadhaar_item["status"], "Uploaded")
        self.assertEqual(aadhaar_item["file_name"], "aadhaar_ramesh.pdf")
        self.assertEqual(aadhaar_item["file_size"], 245000)
        self.assertEqual(aadhaar_item["document_id"], doc_aadhaar.id)
        self.assertIsNotNone(aadhaar_item["updated_at"])

        # Check PAN item metadata
        pan_item = next(i for i in data["items"] if i["id"] == "req_pan")
        self.assertEqual(pan_item["status"], "Uploaded")
        self.assertEqual(pan_item["file_name"], "pan_ramesh.pdf")
        self.assertEqual(pan_item["file_size"], 190000)
        self.assertEqual(pan_item["document_id"], doc_pan.id)

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 3: User with Missing Required Documents
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_3_user_with_missing_required_documents(self):
        """Checklist accurately reports missing document count and lists missing mandatory items."""
        # User only uploaded Aadhaar, missing PAN, DPR, and business documents
        doc = Document(
            user_id=self.user_dairy.id,
            title="Aadhaar Card",
            category="Identity",
            file_name="aadhaar_ramesh.pdf",
            storage_path="uploads/dummy_aadhaar.pdf",
            file_size=200000,
            file_type="application/pdf",
            status="Uploaded",
        )
        self.db.add(doc)
        self.db.commit()

        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["uploaded_count"], 1)
        self.assertEqual(data["missing_count"], data["total_required"] - 1)
        self.assertTrue(0 < data["completion_percentage"] < 100)

        missing_items = [i for i in data["items"] if i["status"] == "Missing"]
        missing_titles = [i["title"] for i in missing_items]

        self.assertIn("PAN Card", missing_titles)
        self.assertTrue(any("DPR" in t or "Project Report" in t for t in missing_titles))

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 4: User with Selected Business Types
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_4_selected_business_dairy(self):
        """Dairy enterprise requires Livestock & Shed Space Declaration and Premises Lease."""
        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["business_type"], "Dairy Farming")
        titles = [i["title"] for i in data["items"]]
        self.assertTrue(any("Livestock & Shed" in t for t in titles))
        self.assertTrue(any("Premises Lease Deed / Land Record" in t for t in titles))

    def test_scenario_4_selected_business_poultry(self):
        """Poultry broiler enterprise requires biosecurity land lease and KVK training cert."""
        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_poultry}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["business_type"], "Poultry Broiler Farming")
        titles = [i["title"] for i in data["items"]]
        self.assertTrue(any("Poultry Farm Land Lease" in t for t in titles))
        self.assertTrue(any("Training / Experience Certificate in Poultry" in t for t in titles))

    def test_scenario_4_selected_business_food_processing(self):
        """Food processing enterprise requires FSSAI registration intent and commercial premises proof."""
        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_food}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["business_type"], "Spices & Flour Processing")
        titles = [i["title"] for i in data["items"]]
        self.assertTrue(any("FSSAI" in t for t in titles))
        self.assertTrue(any("Commercial Premises" in t for t in titles))

    def test_scenario_4_selected_business_agriculture(self):
        """Agriculture/greenhouse farming requires Khasra / Khatauni / Patta land revenue record."""
        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_agri}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        titles = [i["title"] for i in data["items"]]
        self.assertTrue(any("Khasra / Khatauni / Patta" in t or "Farmer Land Record" in t for t in titles))

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 5: User with Loan Information & Collateral Threshold
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_5_loan_information_standard_under_20l(self):
        """Loans <= 20L require Bank Statement and Machinery Quotation, but NOT Collateral Deed."""
        fin = self._make_finance(
            user_id=self.user_dairy.id,
            business_type="Dairy Farming",
            loan_amount=800000,  # 8 Lakhs (under 20L priority sector limit)
        )
        self.db.add(fin)
        self.db.commit()

        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertTrue(data["has_loan_application"])
        self.assertEqual(data["loan_amount"], 800000)

        titles = [i["title"] for i in data["items"]]
        self.assertTrue(any("Bank Statement" in t for t in titles))
        self.assertTrue(any("Machinery / Equipment Quotation" in t for t in titles))
        # Collateral title deed must NOT be required for loans <= 20 Lakhs
        self.assertFalse(any("Collateral Property" in t for t in titles))

    def test_scenario_5_loan_information_high_loan_requires_collateral(self):
        """Loans > 20L require Collateral Property Title Deed / Valuation Certificate."""
        fin = self._make_finance(
            user_id=self.user_high_loan.id,
            business_type="Agro Machinery Fabrication",
            loan_amount=3500000,  # 35 Lakhs (> 20L threshold)
        )
        self.db.add(fin)
        self.db.commit()

        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_high_loan}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertTrue(data["has_loan_application"])
        self.assertEqual(data["loan_amount"], 3500000)

        titles = [i["title"] for i in data["items"]]
        self.assertTrue(any("Collateral Property Title Deed" in t for t in titles))
        collateral_item = next(i for i in data["items"] if "Collateral Property" in i["title"])
        self.assertEqual(collateral_item["status"], "Missing")
        self.assertEqual(collateral_item["source"], "loan")

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 6: User with Matched Schemes
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_6_matched_schemes_pmegp(self):
        """PMEGP matched user receives official PMEGP scheme docs and rural subsidy certificate."""
        fin = self._make_finance(
            user_id=self.user_dairy.id,
            matched_scheme_id="PMEGP",
            matched_scheme_name="Prime Minister Employment Generation Programme",
        )
        self.db.add(fin)
        self.db.commit()

        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["matched_scheme_id"], "PMEGP")
        titles = [i["title"] for i in data["items"]]

        # Official docs from SCHEME_METADATA["PMEGP"]["docs"]
        for doc_name in SCHEME_METADATA["PMEGP"]["docs"]:
            doc_lower = doc_name.lower()
            if "aadhaar" in doc_lower:
                self.assertTrue(any("PMEGP" in rf for rf in next(i for i in data["items"] if i["id"] == "req_aadhaar")["required_for"]))
            elif "pan" in doc_lower:
                self.assertTrue(any("PMEGP" in rf for rf in next(i for i in data["items"] if i["id"] == "req_pan")["required_for"]))
            elif "project report" in doc_lower or "dpr" in doc_lower:
                pass
            else:
                self.assertIn(doc_name, titles)

        # Rural user on PMEGP receives Rural Area Certificate requirement
        self.assertTrue(any("Rural Area Certificate" in t for t in titles))

    def test_scenario_6_matched_schemes_standup_india(self):
        """Stand-Up India matched SC/ST/Woman user receives Caste/Category Certificate and official docs."""
        fin = self._make_finance(
            user_id=self.user_agri.id,  # SC category
            matched_scheme_id="STANDUP_INDIA",
            matched_scheme_name="Stand-Up India Scheme",
        )
        self.db.add(fin)
        self.db.commit()

        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_agri}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["matched_scheme_id"], "STANDUP_INDIA")
        titles = [i["title"] for i in data["items"]]

        # Caste certificate is required for affirmative Stand-Up India scheme
        self.assertTrue(any("Caste / Category Certificate" in t for t in titles))

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 7: User with Generated DPR
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_7_user_with_generated_dpr(self):
        """When DPR is generated, checklist DPR item shows status='Uploaded' with PDF filename and is_dpr=True."""
        dpr_rec = DPR(
            user_id=self.user_dairy.id,
            business_name="Green Pastures Dairy",
            business_type="Dairy Farming",
            status="generated",
        )
        self.db.add(dpr_rec)
        self.db.commit()

        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        dpr_item = next((i for i in data["items"] if i["is_dpr"]), None)
        self.assertIsNotNone(dpr_item)
        self.assertEqual(dpr_item["status"], "Uploaded")
        self.assertTrue(dpr_item["file_name"].endswith(".pdf"))
        self.assertEqual(dpr_item["file_type"], "application/pdf")
        self.assertEqual(dpr_item["action_route"], "/dpr")
        self.assertIn("ReportLab PDF ready", dpr_item["remarks"])

    def test_scenario_7_dpr_needs_attention_status(self):
        """When DPR status is 'needs_update', checklist item displays 'Needs Attention'."""
        dpr_rec = DPR(
            user_id=self.user_dairy.id,
            business_name="Green Pastures Dairy",
            business_type="Dairy Farming",
            status="needs_update",
        )
        self.db.add(dpr_rec)
        self.db.commit()

        resp = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        dpr_item = next((i for i in data["items"] if i["is_dpr"]), None)
        self.assertIsNotNone(dpr_item)
        self.assertEqual(dpr_item["status"], "Needs Attention")
        self.assertIn("re-sync", dpr_item["remarks"].lower())

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 8: Multiple Users with Different Profiles (Strict Isolation)
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_8_multiple_users_isolation(self):
        """Strict user isolation: User B never sees User A's uploaded documents or specific requirements."""
        # User A (Dairy) uploads land document
        doc_a = Document(
            user_id=self.user_dairy.id,
            title="Ramesh Dairy Land Patta",
            category="Business",
            file_name="ramesh_dairy_land.pdf",
            storage_path="uploads/dummy_ramesh_dairy_land.pdf",
            file_size=102400,
            file_type="application/pdf",
            status="Uploaded",
        )
        self.db.add(doc_a)
        self.db.commit()

        # User B (Poultry) requests checklist
        resp_b = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_poultry}"},
        )
        self.assertEqual(resp_b.status_code, 200)
        data_b = resp_b.json()

        self.assertEqual(data_b["business_type"], "Poultry Broiler Farming")

        # Verify User A's custom uploaded doc is absent from User B's checklist
        for item in data_b["items"]:
            self.assertNotEqual(item.get("document_id"), doc_a.id)
            self.assertNotEqual(item.get("file_name"), "ramesh_dairy_land.pdf")

        # Verify User B does not see Dairy-specific items
        titles_b = [i["title"] for i in data_b["items"]]
        self.assertNotIn("Livestock & Shed Space Declaration", titles_b)
        self.assertTrue(any("Poultry" in t for t in titles_b))

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 9: Changing Business / Scheme Dynamically Changes Checklist
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_9_changing_scheme_query_param_dynamically(self):
        """Query parameter ?scheme_id=KCC dynamically tailors checklist requirements."""
        resp_kcc = self.client.get(
            "/api/documents/checklist?scheme_id=KCC",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp_kcc.status_code, 200)
        data_kcc = resp_kcc.json()

        self.assertEqual(data_kcc["matched_scheme_id"], "KCC")
        titles_kcc = [i["title"] for i in data_kcc["items"]]

        # KCC official docs from SCHEME_METADATA["KCC"]["docs"]
        for doc in SCHEME_METADATA["KCC"]["docs"]:
            doc_lower = doc.lower()
            if "aadhaar" not in doc_lower and "pan" not in doc_lower and "dpr" not in doc_lower:
                self.assertIn(doc, titles_kcc)

        # Now query with PMEGP
        resp_pmegp = self.client.get(
            "/api/documents/checklist?scheme_id=PMEGP",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp_pmegp.status_code, 200)
        data_pmegp = resp_pmegp.json()
        self.assertEqual(data_pmegp["matched_scheme_id"], "PMEGP")

    def test_scenario_9_changing_business_type_dynamically(self):
        """Changing user business type alters required business documents dynamically."""
        # User starts as Spices & Flour Processing
        resp1 = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_food}"},
        )
        self.assertTrue(any("FSSAI" in i["title"] for i in resp1.json()["items"]))

        # User switches business to Poultry
        self.user_food.business_type = "Poultry Broiler Farming"
        self.db.commit()

        resp2 = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_food}"},
        )
        titles2 = [i["title"] for i in resp2.json()["items"]]
        self.assertFalse(any("FSSAI" in t for t in titles2))
        self.assertTrue(any("Poultry Farm Land Lease" in t for t in titles2))

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 10: DPR Generation Syncs into Documents Portfolio
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_10_dpr_generation_syncs_document(self):
        """Calling sync_dpr_document creates a Document record with category='DPR' and syncs to /api/documents."""
        dpr_rec = DPR(
            user_id=self.user_dairy.id,
            business_name="Green Pastures Dairy",
            business_type="Dairy Farming",
            status="generated",
        )
        self.db.add(dpr_rec)
        self.db.commit()

        # Call service sync
        dpr_doc = document_service.sync_dpr_document(self.db, self.user_dairy.id, dpr_rec)
        self.assertIsNotNone(dpr_doc)
        self.assertEqual(dpr_doc.category, "DPR")
        self.assertEqual(dpr_doc.status, "Uploaded")
        self.assertTrue(dpr_doc.file_name.endswith(".pdf"))

        # Verify it appears in /api/documents
        resp_list = self.client.get(
            "/api/documents",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(resp_list.status_code, 200)
        docs_list = resp_list.json()
        self.assertTrue(any(d["id"] == dpr_doc.id and d["category"] == "DPR" for d in docs_list))

        # Verify checklist recognizes it
        resp_chk = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        chk_item = next(i for i in resp_chk.json()["items"] if i["is_dpr"])
        self.assertEqual(chk_item["status"], "Uploaded")
        self.assertEqual(chk_item["document_id"], dpr_doc.id)

    # ──────────────────────────────────────────────────────────────────────────
    # Scenario 11: Reconciliation with Initialized Checklist (No Duplicates)
    # ──────────────────────────────────────────────────────────────────────────

    def test_scenario_11_reconciliation_with_initialized_checklist(self):
        """Uploading to an initialized empty checklist updates the placeholder in-place without duplicate rows."""
        # 1. User initializes standard checklist (creates empty placeholders)
        init_resp = self.client.post(
            "/api/documents/initialize-checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        self.assertEqual(init_resp.status_code, 200)
        placeholders = init_resp.json()
        aadhaar_placeholder = next(p for p in placeholders if "Aadhaar" in p["title"])
        placeholder_id = aadhaar_placeholder["id"]

        # Initial checklist shows Missing
        chk1 = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        aadhaar_item1 = next(i for i in chk1.json()["items"] if i["id"] == "req_aadhaar")
        self.assertEqual(aadhaar_item1["status"], "Missing")

        # 2. User uploads Aadhaar file via /api/documents/upload
        file_bytes = self._make_dummy_pdf()
        upload_resp = self.client.post(
            "/api/documents/upload",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
            files={"file": ("my_aadhaar.pdf", io.BytesIO(file_bytes), "application/pdf")},
            data={"title": "Aadhaar Card", "category": "Identity", "remarks": "Scanned copy"},
        )
        self.assertEqual(upload_resp.status_code, 201)
        uploaded_doc = upload_resp.json()["document"]

        # Crucial check: The uploaded doc ID must match the placeholder ID (updated in-place)
        self.assertEqual(uploaded_doc["id"], placeholder_id)
        self.assertEqual(uploaded_doc["status"], "Uploaded")
        self.assertEqual(uploaded_doc["file_name"], "my_aadhaar.pdf")

        # Verify no duplicate Aadhaar records exist in /api/documents
        list_resp = self.client.get(
            "/api/documents",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        all_docs = list_resp.json()
        aadhaar_docs = [d for d in all_docs if "Aadhaar" in d["title"]]
        self.assertEqual(len(aadhaar_docs), 1, "There should be exactly 1 Aadhaar document, not duplicates")

        # Verify checklist now reports Uploaded
        chk2 = self.client.get(
            "/api/documents/checklist",
            headers={"Authorization": f"Bearer {self.token_dairy}"},
        )
        aadhaar_item2 = next(i for i in chk2.json()["items"] if i["id"] == "req_aadhaar")
        self.assertEqual(aadhaar_item2["status"], "Uploaded")
        self.assertEqual(aadhaar_item2["document_id"], placeholder_id)


if __name__ == "__main__":
    unittest.main()
