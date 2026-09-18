"""
GRAMSAARTHI — Admin Manual Document Verification Test Suite
Tests:
1. Admin authentication & authorization (Admin allowed, normal user 403, unauthenticated 401)
2. Admin stats endpoint (/api/admin/documents/stats)
3. Admin list pending documents (/api/admin/documents)
4. Admin verify document (status -> VERIFIED, verified_by and verified_at recorded)
5. Admin reject document (status -> REJECTED, remark recorded, doc status -> Needs Attention)
6. Admin request re-upload (status -> REUPLOAD_REQUIRED, remark recorded)
7. Immutability: Normal user cannot alter verification_status or verified_by via user APIs
8. User isolation: Normal User A cannot access User B's documents
9. Admin preview and download streaming endpoints
10. Verification audit history (/api/admin/documents/{id}/history)
11. Checklist & Application readiness integration (rejected/re-upload documents block readiness)
12. Roadmap Step 8 reacts to verification status
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
from app.models.document import Document, DocumentVerificationLog
from app.database.init_db import create_tables
from app.services.auth_service import hash_password, create_access_token
from app.services import document_service, roadmap_service


class AdminDocumentVerificationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        create_tables()

    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()
        self._cleanup()

        # 1. Normal Entrepreneur User
        self.user = User(
            id=99801,
            name="Ramesh Test Entrepreneur",
            phone="9980100000",
            email="ramesh@test.in",
            language="Hindi",
            state="Madhya Pradesh",
            district="Sehore",
            hashed_password=hash_password("userpass123"),
            is_active=True,
            is_admin=False,
            role="user",
        )

        # 2. Second Normal User (for isolation testing)
        self.other_user = User(
            id=99802,
            name="Suresh Test Farmer",
            phone="9980200000",
            email="suresh@test.in",
            language="Hindi",
            state="Madhya Pradesh",
            district="Bhopal",
            hashed_password=hash_password("userpass123"),
            is_active=True,
            is_admin=False,
            role="user",
        )

        # 3. Authorized GRAMSAARTHI Administrator User
        self.admin = User(
            id=99899,
            name="GRAMSAARTHI Administrator",
            phone="9989900000",
            email="admin_doc_test@gramsaarthi.in",
            language="English",
            state="Madhya Pradesh",
            district="Bhopal",
            hashed_password=hash_password("adminpass123"),
            is_active=True,
            is_admin=True,
            role="admin",
        )

        self.db.add(self.user)
        self.db.add(self.other_user)
        self.db.add(self.admin)
        self.db.commit()

        self.token_user = create_access_token(self.user.id, {"phone": self.user.phone})
        self.token_other = create_access_token(self.other_user.id, {"phone": self.other_user.phone})
        self.token_admin = create_access_token(self.admin.id, {"phone": self.admin.phone, "role": "admin"})

        self.headers_user = {"Authorization": f"Bearer {self.token_user}"}
        self.headers_other = {"Authorization": f"Bearer {self.token_other}"}
        self.headers_admin = {"Authorization": f"Bearer {self.token_admin}"}

    def tearDown(self):
        self._cleanup()
        self.db.close()

    def _cleanup(self):
        test_ids = [99801, 99802, 99899]
        docs = self.db.query(Document).filter(Document.user_id.in_(test_ids)).all()
        for d in docs:
            document_service.delete_physical_file(d.storage_path)

        self.db.query(DocumentVerificationLog).filter(DocumentVerificationLog.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(Document).filter(Document.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_(test_ids)).delete(synchronize_session=False)
        self.db.commit()

    def _make_dummy_pdf(self) -> bytes:
        return b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"

    def _upload_test_document(self, title: str = "Aadhaar Card", category: str = "Identity") -> dict:
        pdf_bytes = self._make_dummy_pdf()
        files = {"file": ("aadhaar.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        data = {"title": title, "category": category, "remarks": "Test upload"}
        res = self.client.post("/api/documents/upload", files=files, data=data, headers=self.headers_user)
        self.assertEqual(res.status_code, 201)
        return res.json()["document"]

    # ── Test Cases ────────────────────────────────────────────────────────────

    def test_01_admin_endpoints_require_admin_authorization(self):
        """Unauthenticated -> 401, Normal user -> 403, Admin -> 200."""
        # Unauthenticated
        res_no_auth = self.client.get("/api/admin/documents")
        self.assertEqual(res_no_auth.status_code, 401)

        # Normal user
        res_user = self.client.get("/api/admin/documents", headers=self.headers_user)
        self.assertEqual(res_user.status_code, 403)
        self.assertIn("Administrator role required", res_user.json()["detail"])

        # Admin user
        res_admin = self.client.get("/api/admin/documents", headers=self.headers_admin)
        self.assertEqual(res_admin.status_code, 200)

    def test_02_uploaded_document_has_pending_verification_status(self):
        """Newly uploaded document default verification_status must be PENDING."""
        doc = self._upload_test_document("PAN Card", "Identity")
        self.assertEqual(doc["verification_status"], "PENDING")
        self.assertIsNone(doc["verified_by"])
        self.assertIsNone(doc["verified_at"])
        self.assertIsNone(doc["verification_remark"])

    def test_03_admin_get_stats_and_list_documents(self):
        """Admin can fetch verification stats and list documents awaiting review."""
        doc = self._upload_test_document("Bank Statement", "Financial")

        # Stats
        res_stats = self.client.get("/api/admin/documents/stats", headers=self.headers_admin)
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.json()
        self.assertGreaterEqual(stats["pending_count"], 1)

        # List
        res_list = self.client.get("/api/admin/documents?status=PENDING", headers=self.headers_admin)
        self.assertEqual(res_list.status_code, 200)
        items = res_list.json()
        found = next((i for i in items if i["id"] == doc["id"]), None)
        self.assertIsNotNone(found)
        self.assertEqual(found["user"]["name"], "Ramesh Test Entrepreneur")
        self.assertTrue(found["system_validation_checks"]["magic_bytes_verified"])

    def test_04_admin_verify_document_success(self):
        """Admin marks document as VERIFIED with remark."""
        doc = self._upload_test_document("Aadhaar Card", "Identity")

        payload = {
            "decision": "VERIFIED",
            "remark": "Identity and details match profile perfectly.",
        }
        res = self.client.post(f"/api/admin/documents/{doc['id']}/verify", json=payload, headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        updated = res.json()
        self.assertEqual(updated["verification_status"], "VERIFIED")
        self.assertEqual(updated["verified_by"], self.admin.id)
        self.assertIsNotNone(updated["verified_at"])
        self.assertEqual(updated["verification_remark"], "Identity and details match profile perfectly.")

        # User checks their own document
        user_res = self.client.get(f"/api/documents/{doc['id']}", headers=self.headers_user)
        self.assertEqual(user_res.status_code, 200)
        u_doc = user_res.json()
        self.assertEqual(u_doc["verification_status"], "VERIFIED")
        self.assertEqual(u_doc["verification_remark"], "Identity and details match profile perfectly.")

    def test_05_admin_reject_document(self):
        """Admin marks document as REJECTED with feedback."""
        doc = self._upload_test_document("Damaged PAN Card", "Identity")

        payload = {
            "decision": "REJECTED",
            "remark": "Document is torn and name is illegible. Please upload a clear original copy.",
        }
        res = self.client.post(f"/api/admin/documents/{doc['id']}/verify", json=payload, headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        updated = res.json()
        self.assertEqual(updated["verification_status"], "REJECTED")
        self.assertEqual(updated["status"], "Needs Attention")
        self.assertEqual(updated["verification_remark"], payload["remark"])

    def test_06_admin_request_reupload(self):
        """Admin requests REUPLOAD_REQUIRED."""
        doc = self._upload_test_document("Old Bank Statement", "Financial")

        payload = {
            "decision": "REUPLOAD_REQUIRED",
            "remark": "Bank statement is older than 6 months. Please provide current statement.",
        }
        res = self.client.post(f"/api/admin/documents/{doc['id']}/verify", json=payload, headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        updated = res.json()
        self.assertEqual(updated["verification_status"], "REUPLOAD_REQUIRED")
        self.assertEqual(updated["status"], "Needs Attention")

        # When user replaces file, verification_status resets to PENDING
        pdf_bytes = self._make_dummy_pdf()
        files = {"file": ("new_bank_statement.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        rep_res = self.client.put(f"/api/documents/{doc['id']}/upload", files=files, headers=self.headers_user)
        self.assertEqual(rep_res.status_code, 200)
        replaced = rep_res.json()["document"]
        self.assertEqual(replaced["verification_status"], "PENDING")
        self.assertIsNone(replaced["verified_by"])

    def test_07_normal_user_cannot_modify_verification_status(self):
        """User cannot tamper with verification_status via PUT /api/documents/{id}."""
        doc = self._upload_test_document("PAN Card", "Identity")

        # User attempts privilege escalation via PUT /api/documents/{id}
        tamper_payload = {
            "title": "PAN Card Updated",
            "verification_status": "VERIFIED",
            "verified_by": 99801,
        }
        res = self.client.put(f"/api/documents/{doc['id']}", json=tamper_payload, headers=self.headers_user)
        self.assertEqual(res.status_code, 200)
        tampered = res.json()
        # verification_status must remain PENDING
        self.assertEqual(tampered["verification_status"], "PENDING")
        self.assertIsNone(tampered["verified_by"])

    def test_08_user_isolation_prevent_idor(self):
        """User B cannot view, download, preview, or delete User A's document."""
        doc_a = self._upload_test_document("User A Secret", "Identity")

        # User B tries to view
        res_view = self.client.get(f"/api/documents/{doc_a['id']}", headers=self.headers_other)
        self.assertEqual(res_view.status_code, 404)

        # User B tries to download
        res_dl = self.client.get(f"/api/documents/{doc_a['id']}/download", headers=self.headers_other)
        self.assertEqual(res_dl.status_code, 404)

        # User B tries to preview
        res_prev = self.client.get(f"/api/documents/{doc_a['id']}/preview", headers=self.headers_other)
        self.assertEqual(res_prev.status_code, 404)

        # User B tries to delete
        res_del = self.client.delete(f"/api/documents/{doc_a['id']}", headers=self.headers_other)
        self.assertEqual(res_del.status_code, 404)

    def test_09_admin_preview_and_download_streaming(self):
        """Admin can stream preview and download for any entrepreneur document."""
        doc = self._upload_test_document("Preview Test Doc", "Business")

        # Preview inline
        res_prev = self.client.get(f"/api/admin/documents/{doc['id']}/preview", headers=self.headers_admin)
        self.assertEqual(res_prev.status_code, 200)
        self.assertIn("inline", res_prev.headers.get("content-disposition", ""))

        # Download attachment
        res_dl = self.client.get(f"/api/admin/documents/{doc['id']}/download", headers=self.headers_admin)
        self.assertEqual(res_dl.status_code, 200)
        self.assertIn("attachment", res_dl.headers.get("content-disposition", ""))

    def test_10_verification_audit_history(self):
        """Verification decisions create immutable audit logs in history."""
        doc = self._upload_test_document("Audit Doc", "Loan")

        # Decision 1: Re-upload requested
        self.client.post(f"/api/admin/documents/{doc['id']}/verify", json={"decision": "REUPLOAD_REQUIRED", "remark": "First attempt blur"}, headers=self.headers_admin)

        # Decision 2: Verified
        self.client.post(f"/api/admin/documents/{doc['id']}/verify", json={"decision": "VERIFIED", "remark": "Clean copy accepted"}, headers=self.headers_admin)

        res_hist = self.client.get(f"/api/admin/documents/{doc['id']}/history", headers=self.headers_admin)
        self.assertEqual(res_hist.status_code, 200)
        logs = res_hist.json()
        self.assertEqual(len(logs), 2)
        self.assertEqual(logs[0]["decision"], "VERIFIED")
        self.assertEqual(logs[1]["decision"], "REUPLOAD_REQUIRED")

    def test_11_roadmap_step8_blocks_when_rejected(self):
        """Step 8 Prepare Documents is not completed if a document is rejected or needs re-upload."""
        doc = self._upload_test_document("Aadhaar Card", "Identity")
        # Reject document
        self.client.post(f"/api/admin/documents/{doc['id']}/verify", json={"decision": "REJECTED", "remark": "Photo blurry"}, headers=self.headers_admin)

        # Evaluate roadmap via client API
        res_rm = self.client.get("/api/journey/roadmap", headers=self.headers_user)
        self.assertEqual(res_rm.status_code, 200)
        roadmap_data = res_rm.json()
        step8 = next((s for s in roadmap_data["steps"] if s["id"] == "documents"), None)
        self.assertIsNotNone(step8)
        self.assertNotEqual(step8["status"], "completed")
        self.assertTrue(any("rejected" in m.lower() for m in step8["missing_requirements"]))


if __name__ == "__main__":
    unittest.main()
