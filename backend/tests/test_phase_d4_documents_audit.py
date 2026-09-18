"""
GRAMSAARTHI — Phase D4 Final Documents Security, Integration & Production Audit Test Suite

Tests:
1. Full End-to-End Flow:
   Login -> Profile -> Business Assessment -> ML Rec -> Finance -> Loan Eligibility
   -> Schemes -> DPR Studio Generation -> Documents Hub -> Upload Required Documents
   -> View/Download -> Bankable Dossier Completion (100%).
2. Multi-Tenant User Data Isolation (Anti-IDOR):
   User A vs User B strict isolation across all CRUD, download, and preview endpoints.
   Manipulating IDs returns 404 Not Found; unauthenticated requests return 401 Unauthorized.
3. File Security & Path Traversal:
   Strict extension, MIME, magic bytes, 10MB streaming size enforcement, filename sanitization,
   path traversal blocking, and zero public static exposure.
4. DPR / Scheme / Loan Integration:
   Automatic DPR document sync, staleness detection ("Needs Attention"), and real grounded requirements.
5. Multilingual Parity:
   Key count and zero-missing parity across EN, HI, and GU, including authentic scripts.
"""

import os
import sys
import io
import re
import json
import uuid
import unittest
from starlette.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.database.connection import SessionLocal
from app.database.init_db import create_tables
from app.models.user import User
from app.models.document import Document
from app.models.assessment import Assessment
from app.models.finance import Finance
from app.models.dpr import DPR
from app.services.auth_service import hash_password, create_access_token
from app.services import document_service


class PhaseD4DocumentsAuditTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        create_tables()

    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()
        self._cleanup()

        # Create two isolated test users
        self.user_a = User(
            id=99991,
            name="Audit User A",
            phone="9999100000",
            language="Hindi",
            hashed_password=hash_password("auditpass123"),
            state="Rajasthan",
            district="Jaipur",
            social_category="OBC",
            has_land=True,
            is_active=True,
        )
        self.user_b = User(
            id=99992,
            name="Audit User B",
            phone="9999200000",
            language="English",
            hashed_password=hash_password("auditpass123"),
            state="Rajasthan",
            district="Udaipur",
            social_category="General",
            has_land=False,
            is_active=True,
        )
        self.db.add(self.user_a)
        self.db.add(self.user_b)
        self.db.commit()

        self.token_a = create_access_token(self.user_a.id, extra_data={"phone": self.user_a.phone})
        self.token_b = create_access_token(self.user_b.id, extra_data={"phone": self.user_b.phone})
        self.headers_a = {"Authorization": f"Bearer {self.token_a}"}
        self.headers_b = {"Authorization": f"Bearer {self.token_b}"}

    def tearDown(self):
        self._cleanup()
        self.db.close()

    def _cleanup(self):
        # Remove documents from disk and DB
        docs = self.db.query(Document).filter(Document.user_id.in_([99991, 99992])).all()
        for d in docs:
            document_service.delete_physical_file(d.storage_path)
        self.db.query(Document).filter(Document.user_id.in_([99991, 99992])).delete()
        self.db.query(DPR).filter(DPR.user_id.in_([99991, 99992])).delete()
        self.db.query(Finance).filter(Finance.user_id.in_([99991, 99992])).delete()
        self.db.query(Assessment).filter(Assessment.user_id.in_([99991, 99992])).delete()
        self.db.query(User).filter(User.id.in_([99991, 99992])).delete()
        self.db.commit()

    def _refresh_db(self):
        self.db.close()
        self.db = SessionLocal()

    # =========================================================================
    # 1. COMPLETE END-TO-END FLOW AUDIT
    # =========================================================================
    def test_e2e_connected_entrepreneur_journey_to_bankable_dossier(self):
        """
        Validates complete flow:
        Login -> Assessment -> Finance -> Loan Eligibility -> Schemes -> DPR -> Documents -> Readiness
        """
        # 1. Login verification
        res_me = self.client.get("/api/auth/me", headers=self.headers_a)
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.json()["phone"], "9999100000")

        # 2. Business Assessment
        assess_payload = {
            "state": "Rajasthan",
            "district": "Jaipur",
            "capital": 150000,
            "business_interest": "Dairy Farming",
            "experience": "Beginner",
        }
        res_assess = self.client.post("/api/assessments", json=assess_payload, headers=self.headers_a)
        self.assertIn(res_assess.status_code, (200, 201))

        # 3. Finance Feasibility Plan
        fin_payload = {
            "business_type": "Dairy Farming",
            "user_capital": 150000,
            "project_cost": 600000,
            "loan_amount": 450000,
            "loan_tenure_years": 5,
            "interest_rate": 8.5,
        }
        res_fin = self.client.put("/api/finance/me", json=fin_payload, headers=self.headers_a)
        self.assertEqual(res_fin.status_code, 200)

        # 4. Loan Eligibility check
        res_elig = self.client.get("/api/finance/eligibility", headers=self.headers_a)
        self.assertEqual(res_elig.status_code, 200)
        elig_data = res_elig.json()
        self.assertTrue(elig_data.get("eligible") or elig_data.get("status") in ("Eligible", "Partially Eligible"))

        # 5. Government Scheme check
        res_schemes = self.client.get("/api/finance/schemes", headers=self.headers_a)
        self.assertEqual(res_schemes.status_code, 200)
        schemes = res_schemes.json()
        self.assertTrue(len(schemes) > 0)

        # 6. DPR Generation & Synchronization
        dpr_payload = {
            "business_type": "Dairy Farming",
            "user_capital": 150000,
            "project_cost": 600000,
            "loan_amount": 450000,
            "loan_tenure_years": 5,
            "interest_rate": 8.5,
        }
        res_dpr = self.client.post("/api/dpr/generate", json=dpr_payload, headers=self.headers_a)
        self.assertEqual(res_dpr.status_code, 200)
        dpr_data = res_dpr.json()
        self.assertEqual(dpr_data.get("status"), "generated")

        # 7. Document Center Hub Inspection: DPR auto-synced as Uploaded
        res_check = self.client.get("/api/documents/checklist", headers=self.headers_a)
        self.assertEqual(res_check.status_code, 200)
        check_data = res_check.json()
        self.assertEqual(check_data["business_type"], "Dairy Farming")

        # Locate DPR in items
        dpr_item = next((item for item in check_data["items"] if item["is_dpr"] or item["category"] == "DPR"), None)
        self.assertIsNotNone(dpr_item)
        self.assertEqual(dpr_item["status"], "Uploaded")
        self.assertIsNotNone(dpr_item.get("document_id"))

        # 8. Upload regular required document (e.g. Aadhaar Card)
        pdf_bytes = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\nxref\n0 2\ntrailer<</Root 1 0 R>>\nstartxref\n50\n%%EOF"
        files = {"file": ("aadhaar_proof.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        data = {"title": "Aadhaar Card", "category": "Identity", "remarks": "Attested copy"}
        res_upload = self.client.post("/api/documents/upload", files=files, data=data, headers=self.headers_a)
        self.assertEqual(res_upload.status_code, 201)

        # 9. Verify Download & Preview of uploaded doc
        doc_id = res_upload.json()["document"]["id"]
        res_dl = self.client.get(f"/api/documents/{doc_id}/download", headers=self.headers_a)
        self.assertEqual(res_dl.status_code, 200)
        self.assertIn("attachment", res_dl.headers.get("content-disposition", "").lower())

        res_prev = self.client.get(f"/api/documents/{doc_id}/preview", headers=self.headers_a)
        self.assertEqual(res_prev.status_code, 200)
        self.assertIn("inline", res_prev.headers.get("content-disposition", "").lower())

        # 10. Verify summary stats
        res_sum = self.client.get("/api/documents/summary", headers=self.headers_a)
        self.assertEqual(res_sum.status_code, 200)
        sum_data = res_sum.json()
        self.assertGreaterEqual(sum_data["uploaded"], 2)  # DPR + Aadhaar

    # =========================================================================
    # 2. MULTI-TENANT USER DATA ISOLATION (ANTI-IDOR)
    # =========================================================================
    def test_multi_tenant_isolation_anti_idor(self):
        """
        User B cannot query, view, download, preview, update, replace, or delete User A's documents.
        """
        # User A uploads a private document
        pdf_bytes = b"%PDF-1.4\nprivate file for user A\n%%EOF"
        files = {"file": ("user_a_tax.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        data = {"title": "User A Private Tax Return", "category": "Financial"}
        res_upload_a = self.client.post("/api/documents/upload", files=files, data=data, headers=self.headers_a)
        self.assertEqual(res_upload_a.status_code, 201)
        doc_a_id = res_upload_a.json()["document"]["id"]

        # 1. User B lists documents -> Must NOT contain doc_a
        res_list_b = self.client.get("/api/documents", headers=self.headers_b)
        self.assertEqual(res_list_b.status_code, 200)
        b_ids = [d["id"] for d in res_list_b.json()]
        self.assertNotIn(doc_a_id, b_ids)

        # 2. User B calls GET /api/documents/{doc_a_id} -> Must return 404
        res_get_b = self.client.get(f"/api/documents/{doc_a_id}", headers=self.headers_b)
        self.assertEqual(res_get_b.status_code, 404)

        # 3. User B calls download -> Must return 404
        res_dl_b = self.client.get(f"/api/documents/{doc_a_id}/download", headers=self.headers_b)
        self.assertEqual(res_dl_b.status_code, 404)

        # 4. User B calls preview -> Must return 404
        res_prev_b = self.client.get(f"/api/documents/{doc_a_id}/preview", headers=self.headers_b)
        self.assertEqual(res_prev_b.status_code, 404)

        # 5. User B calls replace -> Must return 404
        rep_files = {"file": ("hacked.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        res_rep_b = self.client.put(f"/api/documents/{doc_a_id}/upload", files=rep_files, headers=self.headers_b)
        self.assertEqual(res_rep_b.status_code, 404)

        # 6. User B calls update metadata -> Must return 404
        upd_data = {"title": "Hacked Title"}
        res_upd_b = self.client.put(f"/api/documents/{doc_a_id}", json=upd_data, headers=self.headers_b)
        self.assertEqual(res_upd_b.status_code, 404)

        # 7. User B calls delete -> Must return 404
        res_del_b = self.client.delete(f"/api/documents/{doc_a_id}", headers=self.headers_b)
        self.assertEqual(res_del_b.status_code, 404)

        # Verify User A's document is completely untouched
        res_verify_a = self.client.get(f"/api/documents/{doc_a_id}", headers=self.headers_a)
        self.assertEqual(res_verify_a.status_code, 200)
        self.assertEqual(res_verify_a.json()["title"], "User A Private Tax Return")

    def test_unauthenticated_requests_rejected(self):
        """All document endpoints reject unauthenticated access with 401."""
        endpoints = [
            ("GET", "/api/documents"),
            ("GET", "/api/documents/checklist"),
            ("GET", "/api/documents/summary"),
            ("POST", "/api/documents/initialize-checklist"),
            ("GET", "/api/documents/99999"),
            ("GET", "/api/documents/99999/download"),
            ("GET", "/api/documents/99999/preview"),
            ("DELETE", "/api/documents/99999"),
        ]
        for method, ep in endpoints:
            res = self.client.request(method, ep)
            self.assertEqual(res.status_code, 401, f"Failed for {method} {ep}")

    # =========================================================================
    # 3. FILE SECURITY & PATH TRAVERSAL PROTECTION
    # =========================================================================
    def test_file_type_and_extension_validation(self):
        """Rejects executable extensions and scripts (.exe, .py, .sh, double ext .pdf.exe)."""
        disallowed = ["malware.exe", "script.py", "exploit.sh", "page.php", "invoice.pdf.exe"]
        for bad_filename in disallowed:
            files = {"file": (bad_filename, io.BytesIO(b"binary content"), "application/octet-stream")}
            data = {"title": "Suspicious File", "category": "Other"}
            res = self.client.post("/api/documents/upload", files=files, data=data, headers=self.headers_a)
            self.assertEqual(res.status_code, 400, f"Allowed illegal file: {bad_filename}")

    def test_magic_byte_spoofing_detection(self):
        """Rejects spoofed files where extension claims to be .pdf or .png but content is plain text or wrong format."""
        # Plain text disguised as PDF
        fake_pdf = {"file": ("statement.pdf", io.BytesIO(b"Hello world, I am just plain text!"), "application/pdf")}
        data = {"title": "Fake PDF", "category": "Financial"}
        res_fake_pdf = self.client.post("/api/documents/upload", files=fake_pdf, data=data, headers=self.headers_a)
        self.assertEqual(res_fake_pdf.status_code, 400)
        self.assertIn("magic byte", res_fake_pdf.json()["detail"].lower())

        # Plain text disguised as PNG
        fake_png = {"file": ("image.png", io.BytesIO(b"NOT A PNG IMAGE DATA"), "image/png")}
        res_fake_png = self.client.post("/api/documents/upload", files=fake_png, data=data, headers=self.headers_a)
        self.assertEqual(res_fake_png.status_code, 400)
        self.assertIn("magic byte", res_fake_png.json()["detail"].lower())

    def test_file_size_limit_and_empty_file_handling(self):
        """Rejects empty (0 bytes) and oversized (>10MB) files."""
        # Empty file
        empty_pdf = {"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")}
        data = {"title": "Empty File", "category": "Other"}
        res_empty = self.client.post("/api/documents/upload", files=empty_pdf, data=data, headers=self.headers_a)
        self.assertEqual(res_empty.status_code, 400)

        # Oversized file (>10MB)
        large_chunk = b"%PDF-1.4\n" + (b"A" * (10 * 1024 * 1024 + 1024))
        large_pdf = {"file": ("oversized.pdf", io.BytesIO(large_chunk), "application/pdf")}
        res_large = self.client.post("/api/documents/upload", files=large_pdf, data=data, headers=self.headers_a)
        self.assertEqual(res_large.status_code, 413)

    def test_path_traversal_sanitization(self):
        """Filenames with directory traversal attempts are sanitized safely."""
        pdf_bytes = b"%PDF-1.4\nvalid content\n%%EOF"
        files = {"file": ("../../../../etc/passwd.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        data = {"title": "Traversal Test", "category": "Identity"}
        res = self.client.post("/api/documents/upload", files=files, data=data, headers=self.headers_a)
        self.assertEqual(res.status_code, 201)

        uploaded_doc = res.json()["document"]
        # Must not contain directory separators
        self.assertNotIn("/", uploaded_doc["file_name"])
        self.assertNotIn("\\", uploaded_doc["file_name"])
        self.assertNotIn("..", uploaded_doc["file_name"])

        # Stored file on disk must be inside upload_dir
        upload_dir = document_service.get_upload_dir()
        self._refresh_db()
        db_doc = self.db.query(Document).filter(Document.id == uploaded_doc["id"]).first()
        self.assertIsNotNone(db_doc)
        storage_path = (upload_dir / db_doc.storage_path).resolve()
        self.assertTrue(storage_path.is_relative_to(upload_dir))
        self.assertTrue(storage_path.is_file())

    def test_zero_public_file_exposure(self):
        """Direct static file access without authenticated API endpoint is refused."""
        res = self.client.get("/uploads/test.pdf")
        self.assertEqual(res.status_code, 404)
        res_api = self.client.get("/api/uploads/test.pdf")
        self.assertEqual(res_api.status_code, 404)

    # =========================================================================
    # 4. DPR / SCHEME / LOAN INTEGRATION & STALENESS HANDLING
    # =========================================================================
    def test_dpr_staleness_and_resync_cycle(self):
        """
        When financial figures are modified, DPR status shifts to 'needs_update'
        and document status shifts to 'Needs Attention'. Re-generating returns it to 'Uploaded'.
        """
        # Create finance & initial DPR
        fin_payload = {
            "business_type": "Poultry Farming",
            "user_capital": 200000,
            "project_cost": 800000,
            "loan_amount": 600000,
            "loan_tenure_years": 5,
            "interest_rate": 9.0,
        }
        self.client.put("/api/finance/me", json=fin_payload, headers=self.headers_a)
        self.client.post("/api/dpr/generate", json=fin_payload, headers=self.headers_a)

        # Check document is Uploaded
        res_chk_1 = self.client.get("/api/documents/checklist", headers=self.headers_a)
        self.assertEqual(res_chk_1.status_code, 200)
        dpr_item_1 = next(i for i in res_chk_1.json()["items"] if i["category"] == "DPR")
        self.assertEqual(dpr_item_1["status"], "Uploaded")

        # Now update project cost in Finance (modifying financial inputs)
        fin_payload["project_cost"] = 900000
        self.client.put("/api/finance/me", json=fin_payload, headers=self.headers_a)

        # Status should shift to Needs Attention
        res_chk_2 = self.client.get("/api/documents/checklist", headers=self.headers_a)
        dpr_item_2 = next(i for i in res_chk_2.json()["items"] if i["category"] == "DPR")
        self.assertEqual(dpr_item_2["status"], "Needs Attention")

        # Regenerate DPR
        self.client.post("/api/dpr/generate", json=fin_payload, headers=self.headers_a)
        res_chk_3 = self.client.get("/api/documents/checklist", headers=self.headers_a)
        dpr_item_3 = next(i for i in res_chk_3.json()["items"] if i["category"] == "DPR")
        self.assertEqual(dpr_item_3["status"], "Uploaded")

    # =========================================================================
    # 5. MULTILINGUAL FINAL LOCALIZATION AUDIT
    # =========================================================================
    def test_multilingual_parity_en_hi_gu(self):
        """Verifies 100% key parity between en.json, hi.json, and gu.json."""
        locales_dir = os.path.join(root_dir, "src", "locales")
        with open(os.path.join(locales_dir, "en.json"), "r", encoding="utf-8") as f:
            en = json.load(f)
        with open(os.path.join(locales_dir, "hi.json"), "r", encoding="utf-8") as f:
            hi = json.load(f)
        with open(os.path.join(locales_dir, "gu.json"), "r", encoding="utf-8") as f:
            gu = json.load(f)

        # Check total key count equality
        self.assertEqual(len(en), len(hi), f"EN has {len(en)} keys while HI has {len(hi)} keys")
        self.assertEqual(len(en), len(gu), f"EN has {len(en)} keys while GU has {len(gu)} keys")

        # Check zero missing keys
        diff_hi = set(en.keys()) ^ set(hi.keys())
        diff_gu = set(en.keys()) ^ set(gu.keys())
        self.assertEqual(len(diff_hi), 0, f"Key mismatch EN vs HI: {diff_hi}")
        self.assertEqual(len(diff_gu), 0, f"Key mismatch EN vs GU: {diff_gu}")

        # Check critical Phase D3/D4 document keys
        d3_doc_keys = [
            "doc.bankable_ready",
            "doc.action_items_required",
            "doc.personalized_subtitle",
            "doc.regulatory_notice_title",
            "doc.no_checklist_items",
            "doc.refresh_checklist",
            "doc.reset",
            "doc.replace_file_hint",
            "doc.click_replace_file",
            "doc.delete_confirm_text",
            "doc.filter_all_items",
            "doc.filter_missing_only",
            "doc.filter_uploaded_only",
            "doc.score_label",
            "doc.verified_label",
            "doc.target_label",
            "doc.filter_all",
            "doc.close_modal",
            "doc.success_uploaded",
            "doc.success_replaced",
            "doc.success_deleted",
            "doc.err_select_file",
            "doc.err_download_fail",
        ]
        for k in d3_doc_keys:
            self.assertIn(k, en)
            self.assertIn(k, hi)
            self.assertIn(k, gu)
            # Script check
            self.assertTrue(any('\u0900' <= c <= '\u097F' for c in hi[k]), f"HI key {k} missing Devanagari characters")
            self.assertTrue(any('\u0A80' <= c <= '\u0AFF' for c in gu[k]), f"GU key {k} missing Gujarati characters")


if __name__ == "__main__":
    unittest.main()
