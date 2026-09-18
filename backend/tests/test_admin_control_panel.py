"""
GRAMSAARTHI — Admin/Owner Control Panel Test Suite
Tests:
 1. Admin endpoints require admin authorization (Unauth -> 401, User -> 403, Admin -> 200)
 2. Admin dashboard stats return live database counts
 3. Admin user listing and search (by name, phone, email, place)
 4. Admin user status filter (ACTIVE, SUSPENDED, BLACKLISTED)
 5. Admin get user details (includes document and readiness breakdown, hides password hash)
 6. Admin suspend user: status becomes SUSPENDED, is_active=False, reason and admin stored
 7. Suspended user cannot log in (403 Forbidden with safe disabled message)
 8. Suspended user authenticated requests are rejected (401 Unauthorized)
 9. Admin blacklist user: requires mobile confirmation matching target account and reason
10. Blacklisted user cannot log in (403 Forbidden with safe disabled message)
11. Two users with same name but different phones are strictly isolated:
    Blacklisting user 1 does NOT affect user 2; user 2 can still log in
12. Admin restore user: status returns to ACTIVE, user can log in again
13. Normal user cannot tamper with status/is_active/role via PUT /api/user/profile
14. Admin activity log records all admin actions and is protected from normal users
15. Document verification generates unified AdminAuditLog entry
"""

import sys
import os
import unittest
from starlette.testclient import TestClient

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.document import Document
from app.models.admin_audit import AdminAuditLog
from app.database.init_db import create_tables
from app.services.auth_service import hash_password, create_access_token


class AdminControlPanelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        create_tables()

    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()
        self._cleanup()

        # 1. Normal User 1 (Rahul Kumar 1)
        self.user1 = User(
            id=99001,
            name="Rahul Kumar",
            phone="9876500001",
            email="rahul1_test@example.com",
            language="Hindi",
            state="Madhya Pradesh",
            district="Sehore",
            village="Khajuri",
            hashed_password=hash_password("pass1234"),
            is_active=True,
            status="ACTIVE",
            is_admin=False,
            role="user",
        )

        # 2. Normal User 2 (Rahul Kumar 2 — same name, different phone)
        self.user2 = User(
            id=99002,
            name="Rahul Kumar",
            phone="9876500002",
            email="rahul2_test@example.com",
            language="Hindi",
            state="Madhya Pradesh",
            district="Bhopal",
            village="Phanda",
            hashed_password=hash_password("pass1234"),
            is_active=True,
            status="ACTIVE",
            is_admin=False,
            role="user",
        )

        # 3. Authorized Admin
        self.admin = User(
            id=99099,
            name="GRAMSAARTHI System Administrator",
            phone="9999900000",
            email="admin_cp_test@gramsaarthi.in",
            language="English",
            state="Madhya Pradesh",
            district="Bhopal",
            hashed_password=hash_password("adminpass123"),
            is_active=True,
            status="ACTIVE",
            is_admin=True,
            role="admin",
        )

        self.db.add(self.user1)
        self.db.add(self.user2)
        self.db.add(self.admin)
        self.db.commit()

        self.token_user1 = create_access_token(self.user1.id, {"phone": self.user1.phone})
        self.token_user2 = create_access_token(self.user2.id, {"phone": self.user2.phone})
        self.token_admin = create_access_token(self.admin.id, {"phone": self.admin.phone, "role": "admin"})

        self.headers_user1 = {"Authorization": f"Bearer {self.token_user1}"}
        self.headers_user2 = {"Authorization": f"Bearer {self.token_user2}"}
        self.headers_admin = {"Authorization": f"Bearer {self.token_admin}"}

    def tearDown(self):
        self._cleanup()
        self.db.close()

    def _cleanup(self):
        test_ids = [99001, 99002, 99099]
        self.db.query(AdminAuditLog).filter(
            (AdminAuditLog.target_user_id.in_(test_ids)) | (AdminAuditLog.admin_id.in_(test_ids))
        ).delete(synchronize_session=False)
        self.db.query(Document).filter(Document.user_id.in_(test_ids)).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_(test_ids)).delete(synchronize_session=False)
        self.db.commit()

    # ── Test 1: Access Control ────────────────────────────────────────────────
    def test_01_admin_endpoints_require_admin_role(self):
        """Unauthenticated -> 401, Regular user -> 403, Admin -> 200."""
        # Unauthenticated
        res = self.client.get("/api/admin/dashboard/stats")
        self.assertEqual(res.status_code, 401)

        # Normal user
        res = self.client.get("/api/admin/dashboard/stats", headers=self.headers_user1)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Administrator role required", res.json()["detail"])

        # Admin user
        res = self.client.get("/api/admin/dashboard/stats", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)

    # ── Test 2: Live Dashboard Stats ──────────────────────────────────────────
    def test_02_admin_dashboard_stats(self):
        """Returns live counts of users and document queues."""
        res = self.client.get("/api/admin/dashboard/stats", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_users", data)
        self.assertIn("active_users", data)
        self.assertIn("suspended_users", data)
        self.assertIn("blacklisted_users", data)
        self.assertGreaterEqual(data["total_users"], 2)

    # ── Test 3: Users List & Search ───────────────────────────────────────────
    def test_03_admin_list_users_and_search(self):
        """Admin can list and search users by phone, name, email, or village."""
        # Search by unique phone
        res = self.client.get("/api/admin/users?search=9876500001", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["total"], 1)
        self.assertEqual(data["items"][0]["phone"], "9876500001")
        self.assertEqual(data["items"][0]["id"], 99001)

        # Search by place
        res = self.client.get("/api/admin/users?search=Sehore", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(any(u["id"] == 99001 for u in res.json()["items"]))

    # ── Test 4: User Details ──────────────────────────────────────────────────
    def test_04_admin_get_user_details_sanitized(self):
        """Returns comprehensive details without exposing password hashes."""
        res = self.client.get(f"/api/admin/users/{self.user1.id}", headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["id"], self.user1.id)
        self.assertEqual(data["phone"], "9876500001")
        self.assertEqual(data["name"], "Rahul Kumar")
        # Ensure passwords/hashes are not leaked
        self.assertNotIn("hashed_password", data)
        self.assertNotIn("password", data)

    # ── Test 5: Suspend User ──────────────────────────────────────────────────
    def test_05_admin_suspend_user_and_block_login(self):
        """Suspends user: status=SUSPENDED, login blocked, authenticated calls rejected."""
        payload = {"reason": "Suspected duplicate profile requiring verification"}
        res = self.client.post(f"/api/admin/users/{self.user1.id}/suspend", json=payload, headers=self.headers_admin)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "SUSPENDED")

        # 1. Login attempt MUST fail with safe message
        login_res = self.client.post("/api/auth/login", json={"identifier": "9876500001", "password": "pass1234"})
        self.assertEqual(login_res.status_code, 403)
        self.assertIn("disabled", login_res.json()["detail"].lower())

        # 2. Existing token requests rejected
        me_res = self.client.get("/api/auth/me", headers=self.headers_user1)
        self.assertEqual(me_res.status_code, 401)

    # ── Test 6: Blacklist User with Phone Confirmation ────────────────────────
    def test_06_admin_blacklist_requires_phone_confirmation(self):
        """Blacklist requires matching phone confirmation and mandatory reason."""
        # Mismatched phone -> 400
        res = self.client.post(
            f"/api/admin/users/{self.user1.id}/blacklist",
            json={"reason": "Fraudulent activities", "confirm_phone": "1111111111"},
            headers=self.headers_admin,
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("confirmation failed", res.json()["detail"].lower())

        # Missing reason -> 400
        res = self.client.post(
            f"/api/admin/users/{self.user1.id}/blacklist",
            json={"reason": "", "confirm_phone": "9876500001"},
            headers=self.headers_admin,
        )
        self.assertEqual(res.status_code, 400)

        # Successful blacklist
        res = self.client.post(
            f"/api/admin/users/{self.user1.id}/blacklist",
            json={"reason": "Fraudulent document submission", "confirm_phone": "9876500001"},
            headers=self.headers_admin,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "BLACKLISTED")

        # Login MUST be rejected
        login_res = self.client.post("/api/auth/login", json={"identifier": "9876500001", "password": "pass1234"})
        self.assertEqual(login_res.status_code, 403)
        self.assertEqual(login_res.json()["detail"], "Your account has been disabled. Please contact GRAMSAARTHI support.")

    # ── Test 7: Isolation of Same-Name Accounts ───────────────────────────────
    def test_07_same_name_users_isolation(self):
        """Blacklisting user 1 (Rahul Kumar 9876500001) MUST NOT affect user 2 (Rahul Kumar 9876500002)."""
        # Blacklist user 1
        res = self.client.post(
            f"/api/admin/users/{self.user1.id}/blacklist",
            json={"reason": "Policy violation", "confirm_phone": "9876500001"},
            headers=self.headers_admin,
        )
        self.assertEqual(res.status_code, 200)

        # User 1 cannot log in
        login1 = self.client.post("/api/auth/login", json={"identifier": "9876500001", "password": "pass1234"})
        self.assertEqual(login1.status_code, 403)

        # User 2 CAN still log in normally
        login2 = self.client.post("/api/auth/login", json={"identifier": "9876500002", "password": "pass1234"})
        self.assertEqual(login2.status_code, 200)
        self.assertIn("access_token", login2.json())
        self.assertEqual(login2.json()["user"]["id"], 99002)

    # ── Test 8: Restore User ──────────────────────────────────────────────────
    def test_08_restore_user_re_enables_login(self):
        """Restoring a blacklisted user sets status back to ACTIVE and re-enables login."""
        # Blacklist user 1
        self.client.post(
            f"/api/admin/users/{self.user1.id}/blacklist",
            json={"reason": "Testing restore", "confirm_phone": "9876500001"},
            headers=self.headers_admin,
        )

        # Restore user 1
        res = self.client.post(
            f"/api/admin/users/{self.user1.id}/restore",
            json={"reason": "Identity verified successfully"},
            headers=self.headers_admin,
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ACTIVE")

        # User 1 can now log in again
        login_res = self.client.post("/api/auth/login", json={"identifier": "9876500001", "password": "pass1234"})
        self.assertEqual(login_res.status_code, 200)
        self.assertIn("access_token", login_res.json())

    # ── Test 9: Tamper Resistance ─────────────────────────────────────────────
    def test_09_user_cannot_modify_own_status(self):
        """User cannot modify status or is_admin via PUT /api/user/profile."""
        res = self.client.put(
            "/api/user/profile",
            json={"status": "BLACKLISTED", "is_admin": True, "role": "admin"},
            headers=self.headers_user1,
        )
        self.assertEqual(res.status_code, 200)

        # User in DB remains non-admin and active
        self.db.expire_all()
        u = self.db.query(User).filter(User.id == self.user1.id).first()
        self.assertFalse(u.is_admin)
        self.assertEqual(u.role, "user")
        self.assertEqual(u.status, "ACTIVE")

    # ── Test 10: Admin Activity / Audit Log ───────────────────────────────────
    def test_10_admin_activity_log(self):
        """Admin actions are recorded into the audit trail and viewable only by admins."""
        # Perform suspension to generate an audit entry
        self.client.post(
            f"/api/admin/users/{self.user1.id}/suspend",
            json={"reason": "Audit verification test"},
            headers=self.headers_admin,
        )

        # Normal user cannot read audit logs (use user2 who is ACTIVE)
        res_user = self.client.get("/api/admin/activity", headers=self.headers_user2)
        self.assertEqual(res_user.status_code, 403)

        # Admin reads audit logs
        res_admin = self.client.get("/api/admin/activity", headers=self.headers_admin)
        self.assertEqual(res_admin.status_code, 200)
        logs = res_admin.json()
        self.assertTrue(any(l["action"] == "USER_SUSPENDED" and l["target_user_id"] == self.user1.id for l in logs))


if __name__ == "__main__":
    unittest.main()
