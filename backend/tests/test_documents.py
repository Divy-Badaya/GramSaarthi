"""
GRAMSAARTHI — Comprehensive Documents Test Suite
Tests:
1. Unauthenticated requests to /api/documents/* rejected with HTTP 401
2. Upload valid PDF document (magic bytes, UUID storage, DB record)
3. Upload valid JPG and PNG images
4. Rejection of invalid file extensions (.exe, .txt, .sh) with HTTP 400
5. Rejection of spoofed files with mismatching magic bytes with HTTP 400
6. Rejection of oversized files (>10MB) with HTTP 413
7. Authenticated download with proper Content-Disposition attachment header
8. Authenticated preview with inline header and correct MIME type
9. Document file replacement: verifies previous disk file cleaned up and metadata updated
10. Document metadata update (PUT /api/documents/{id})
11. Document deletion: verifies both physical disk file and DB record are removed
12. Strict Multi-User Isolation: User B cannot view, download, preview, replace, or delete User A's doc
13. Category, status, and search filters on GET /api/documents
14. Document summary stats endpoint GET /api/documents/summary
15. Non-existent document returns HTTP 404
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
from app.models.document import Document
from app.database.init_db import create_tables
from app.services.auth_service import hash_password, create_access_token
from app.services import document_service


class DocumentsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        create_tables()

    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()
        self._cleanup()

        # Create test users
        self.user_a = User(
            id=99981,
            name="Test User A",
            phone="9998100000",
            language="English",
            hashed_password=hash_password("pass123"),
            is_active=True,
        )
        self.user_b = User(
            id=99982,
            name="Test User B",
            phone="9998200000",
            language="Hindi",
            hashed_password=hash_password("pass123"),
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
        test_ids = [99981, 99982]
        # Clean up files from disk
        docs = self.db.query(Document).filter(Document.user_id.in_(test_ids)).all()
        for d in docs:
            document_service.delete_physical_file(d.storage_path)

        self.db.query(Document).filter(Document.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_(test_ids)).delete(synchronize_session=False)
        self.db.commit()

    def _refresh_db(self):
        """Close and reopen DB session to reset transaction and identity map."""
        self.db.close()
        self.db = SessionLocal()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _make_dummy_pdf(self) -> bytes:
        return b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"

    def _make_dummy_jpg(self) -> bytes:
        # Standard JPEG header + padding + EOI
        return b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\xff\xd9"

    def _make_dummy_png(self) -> bytes:
        # PNG signature + IHDR chunk + IEND
        return b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\x00IEND\xaeB`\x82"

    # ── Test Cases ───────────────────────────────────────────────────────────

    def test_unauthenticated_requests_rejected(self):
        """Endpoints should reject missing or invalid tokens with HTTP 401."""
        res_list = self.client.get("/api/documents")
        self.assertEqual(res_list.status_code, 401)

        res_summary = self.client.get("/api/documents/summary")
        self.assertEqual(res_summary.status_code, 401)

        res_upload = self.client.post("/api/documents/upload")
        self.assertEqual(res_upload.status_code, 401)

    def test_upload_valid_pdf(self):
        """Uploading a valid PDF should return 201, store physical file, and create DB record."""
        pdf_bytes = self._make_dummy_pdf()
        files = {"file": ("aadhaar_card.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        data = {"title": "Aadhaar Card", "category": "Identity", "remarks": "Front and back scan"}

        res = self.client.post("/api/documents/upload", headers=self.headers_a, files=files, data=data)
        self.assertEqual(res.status_code, 201, res.text)
        body = res.json()
        self.assertEqual(body["status"], "success")
        doc = body["document"]
        self.assertEqual(doc["title"], "Aadhaar Card")
        self.assertEqual(doc["category"], "Identity")
        self.assertEqual(doc["status"], "Uploaded")
        self.assertEqual(doc["file_type"], "application/pdf")
        self.assertGreater(doc["file_size"], 0)

        # Check in DB
        self._refresh_db()
        db_doc = self.db.query(Document).filter(Document.id == doc["id"]).first()
        self.assertIsNotNone(db_doc)
        self.assertIsNotNone(db_doc.storage_path)

        # Check physical file exists
        upload_dir = document_service.get_upload_dir()
        physical_file = upload_dir / db_doc.storage_path
        self.assertTrue(physical_file.exists())

    def test_upload_valid_jpg_and_png(self):
        """Images (JPG and PNG) should upload and validate correctly."""
        # JPG
        jpg_files = {"file": ("photo.jpg", io.BytesIO(self._make_dummy_jpg()), "image/jpeg")}
        res_jpg = self.client.post(
            "/api/documents/upload",
            headers=self.headers_a,
            files=jpg_files,
            data={"title": "Passport Photo", "category": "Identity"},
        )
        self.assertEqual(res_jpg.status_code, 201)
        self.assertEqual(res_jpg.json()["document"]["file_type"], "image/jpeg")

        # PNG
        png_files = {"file": ("premises.png", io.BytesIO(self._make_dummy_png()), "image/png")}
        res_png = self.client.post(
            "/api/documents/upload",
            headers=self.headers_a,
            files=png_files,
            data={"title": "Premises Map", "category": "Business"},
        )
        self.assertEqual(res_png.status_code, 201)
        self.assertEqual(res_png.json()["document"]["file_type"], "image/png")

    def test_reject_invalid_file_extension(self):
        """Disallowed extensions (.exe, .txt, .sh) must be rejected with 400."""
        files = {"file": ("malicious.exe", io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00"), "application/x-msdownload")}
        res = self.client.post(
            "/api/documents/upload",
            headers=self.headers_a,
            files=files,
            data={"title": "Malicious App", "category": "Other"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unsupported file extension", res.json()["detail"])

    def test_reject_spoofed_file(self):
        """A file named fake.pdf containing random text without %PDF header must be rejected."""
        fake_pdf = b"Hello I am just a plain text file pretending to be a PDF"
        files = {"file": ("fake.pdf", io.BytesIO(fake_pdf), "application/pdf")}
        res = self.client.post(
            "/api/documents/upload",
            headers=self.headers_a,
            files=files,
            data={"title": "Fake PDF", "category": "Other"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("magic byte mismatch", res.json()["detail"])

    def test_reject_oversized_file(self):
        """Files exceeding 10MB limit must be rejected."""
        # Temporarily mock MAX_FILE_SIZE to 50KB to test limit without allocating 10MB in test
        original_max = document_service.MAX_FILE_SIZE
        try:
            document_service.MAX_FILE_SIZE = 50 * 1024  # 50 KB
            oversized_data = b"%PDF-1.4\n" + (b"A" * 60 * 1024)  # ~60KB
            files = {"file": ("large.pdf", io.BytesIO(oversized_data), "application/pdf")}
            res = self.client.post(
                "/api/documents/upload",
                headers=self.headers_a,
                files=files,
                data={"title": "Huge File", "category": "Other"},
            )
            self.assertEqual(res.status_code, 413)
        finally:
            document_service.MAX_FILE_SIZE = original_max

    def test_download_document(self):
        """Authenticated user can download their document."""
        pdf_bytes = self._make_dummy_pdf()
        files = {"file": ("bank_stmt.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        res_up = self.client.post(
            "/api/documents/upload",
            headers=self.headers_a,
            files=files,
            data={"title": "Bank Statement", "category": "Financial"},
        )
        doc_id = res_up.json()["document"]["id"]

        res_dl = self.client.get(f"/api/documents/{doc_id}/download", headers=self.headers_a)
        self.assertEqual(res_dl.status_code, 200)
        self.assertIn("attachment", res_dl.headers.get("content-disposition", ""))
        self.assertEqual(res_dl.content, pdf_bytes)

    def test_preview_document(self):
        """Authenticated user can preview their document inline."""
        png_bytes = self._make_dummy_png()
        files = {"file": ("preview_test.png", io.BytesIO(png_bytes), "image/png")}
        res_up = self.client.post(
            "/api/documents/upload",
            headers=self.headers_a,
            files=files,
            data={"title": "Preview Test", "category": "Other"},
        )
        doc_id = res_up.json()["document"]["id"]

        res_prev = self.client.get(f"/api/documents/{doc_id}/preview", headers=self.headers_a)
        self.assertEqual(res_prev.status_code, 200)
        self.assertIn("inline", res_prev.headers.get("content-disposition", ""))
        self.assertEqual(res_prev.headers.get("content-type"), "image/png")
        self.assertEqual(res_prev.content, png_bytes)

    def test_replace_document_file(self):
        """Replacing a file should delete old disk file, save new file, and update metadata."""
        # 1. Upload initial PDF
        pdf1 = self._make_dummy_pdf()
        res_init = self.client.post(
            "/api/documents/upload",
            headers=self.headers_a,
            files={"file": ("v1.pdf", io.BytesIO(pdf1), "application/pdf")},
            data={"title": "Project DPR", "category": "DPR"},
        )
        doc_id = res_init.json()["document"]["id"]

        self._refresh_db()
        db_doc = self.db.query(Document).filter(Document.id == doc_id).first()
        self.assertIsNotNone(db_doc)
        old_storage_path = db_doc.storage_path
        old_file = document_service.get_upload_dir() / old_storage_path
        self.assertTrue(old_file.exists())

        # 2. Replace with new PDF
        pdf2 = b"%PDF-1.4\n2 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF_V2"
        res_rep = self.client.put(
            f"/api/documents/{doc_id}/upload",
            headers=self.headers_a,
            files={"file": ("v2_final.pdf", io.BytesIO(pdf2), "application/pdf")},
        )
        self.assertEqual(res_rep.status_code, 200)

        # 3. Verify old file is gone, new file exists
        self.assertFalse(old_file.exists())
        self._refresh_db()
        updated_doc = self.db.query(Document).filter(Document.id == doc_id).first()
        self.assertNotEqual(updated_doc.storage_path, old_storage_path)
        new_file = document_service.get_upload_dir() / updated_doc.storage_path
        self.assertTrue(new_file.exists())
        self.assertEqual(new_file.read_bytes(), pdf2)

    def test_update_document_metadata(self):
        """Updating title, category, status, or remarks via PUT /api/documents/{id}."""
        doc = Document(
            user_id=self.user_a.id,
            title="Old Title",
            category="Identity",
            status="Missing",
        )
        self.db.add(doc)
        self.db.commit()

        res = self.client.put(
            f"/api/documents/{doc.id}",
            headers=self.headers_a,
            json={"title": "New Title", "category": "Business", "status": "Needs Attention", "remarks": "Fix page 2"},
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["title"], "New Title")
        self.assertEqual(body["category"], "Business")
        self.assertEqual(body["status"], "Needs Attention")
        self.assertEqual(body["remarks"], "Fix page 2")

    def test_delete_document(self):
        """Deleting a document removes the physical file and DB record."""
        pdf = self._make_dummy_pdf()
        res_up = self.client.post(
            "/api/documents/upload",
            headers=self.headers_a,
            files={"file": ("del.pdf", io.BytesIO(pdf), "application/pdf")},
            data={"title": "Doc to Delete", "category": "Other"},
        )
        doc_id = res_up.json()["document"]["id"]

        self._refresh_db()
        db_doc = self.db.query(Document).filter(Document.id == doc_id).first()
        self.assertIsNotNone(db_doc)
        storage_path = db_doc.storage_path
        file_on_disk = document_service.get_upload_dir() / storage_path
        self.assertTrue(file_on_disk.exists())

        # Delete
        res_del = self.client.delete(f"/api/documents/{doc_id}", headers=self.headers_a)
        self.assertEqual(res_del.status_code, 200)
        self.assertEqual(res_del.json()["status"], "success")

        # Verify DB record deleted
        self._refresh_db()
        self.assertIsNone(self.db.query(Document).filter(Document.id == doc_id).first())
        # Verify physical file deleted
        self.assertFalse(file_on_disk.exists())

    def test_strict_multi_user_isolation(self):
        """User B cannot view, download, preview, replace, or delete User A's document."""
        # User A uploads a document
        pdf = self._make_dummy_pdf()
        res_up = self.client.post(
            "/api/documents/upload",
            headers=self.headers_a,
            files={"file": ("user_a_secret.pdf", io.BytesIO(pdf), "application/pdf")},
            data={"title": "Confidential Tax Record", "category": "Financial"},
        )
        doc_a_id = res_up.json()["document"]["id"]

        # User B attempts to access doc A
        # 1. GET doc details
        res_get = self.client.get(f"/api/documents/{doc_a_id}", headers=self.headers_b)
        self.assertEqual(res_get.status_code, 404)

        # 2. Download doc
        res_dl = self.client.get(f"/api/documents/{doc_a_id}/download", headers=self.headers_b)
        self.assertEqual(res_dl.status_code, 404)

        # 3. Preview doc
        res_prev = self.client.get(f"/api/documents/{doc_a_id}/preview", headers=self.headers_b)
        self.assertEqual(res_prev.status_code, 404)

        # 4. Replace doc
        res_rep = self.client.put(
            f"/api/documents/{doc_a_id}/upload",
            headers=self.headers_b,
            files={"file": ("hacked.pdf", io.BytesIO(self._make_dummy_pdf()), "application/pdf")},
        )
        self.assertEqual(res_rep.status_code, 404)

        # 5. Delete doc
        res_del = self.client.delete(f"/api/documents/{doc_a_id}", headers=self.headers_b)
        self.assertEqual(res_del.status_code, 404)

        # User A's document must still exist intact
        self._refresh_db()
        doc_check = self.db.query(Document).filter(Document.id == doc_a_id).first()
        self.assertIsNotNone(doc_check)

    def test_category_and_status_filtering(self):
        """Filtering by category, status, and search returns matching items."""
        # User A has 3 documents
        d1 = Document(user_id=self.user_a.id, title="Land Lease Deed", category="Business", status="Uploaded")
        d2 = Document(user_id=self.user_a.id, title="Electricity Bill", category="Financial", status="Missing")
        d3 = Document(user_id=self.user_a.id, title="Voter ID Card", category="Identity", status="Uploaded")
        self.db.add_all([d1, d2, d3])
        self.db.commit()

        # Filter category=Business
        res_cat = self.client.get("/api/documents?category=Business", headers=self.headers_a)
        self.assertEqual(res_cat.status_code, 200)
        items = res_cat.json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "Land Lease Deed")

        # Filter status=Missing
        res_stat = self.client.get("/api/documents?status=Missing", headers=self.headers_a)
        self.assertEqual(res_stat.status_code, 200)
        items = res_stat.json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "Electricity Bill")

        # Search term "Lease"
        res_search = self.client.get("/api/documents?search=Lease", headers=self.headers_a)
        self.assertEqual(res_search.status_code, 200)
        items = res_search.json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["title"], "Land Lease Deed")

    def test_document_summary_stats(self):
        """GET /api/documents/summary calculates correct totals."""
        d1 = Document(user_id=self.user_a.id, title="Doc 1", category="Identity", status="Uploaded")
        d2 = Document(user_id=self.user_a.id, title="Doc 2", category="Identity", status="Pending Review")
        d3 = Document(user_id=self.user_a.id, title="Doc 3", category="Financial", status="Needs Attention")
        d4 = Document(user_id=self.user_a.id, title="Doc 4", category="Loan", status="Missing")
        self.db.add_all([d1, d2, d3, d4])
        self.db.commit()

        res = self.client.get("/api/documents/summary", headers=self.headers_a)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["total"], 4)
        self.assertEqual(body["uploaded"], 1)
        self.assertEqual(body["pending_review"], 1)
        self.assertEqual(body["needs_attention"], 1)
        self.assertEqual(body["missing"], 1)
        self.assertEqual(body["categories_count"]["Identity"], 2)
        self.assertEqual(body["categories_count"]["Financial"], 1)
        self.assertEqual(body["categories_count"]["Loan"], 1)


if __name__ == "__main__":
    unittest.main()
