"""
GRAMSAARTHI — Journey Reset & Deletion Comprehensive Tests
Tests:
1. Unauthenticated request rejected with HTTP 401
2. Authenticated user journey reset deletes finance, assessment, activities, and business fields
3. Permanent profile & demographic fields are strictly preserved
4. Strict multi-user data isolation: User A resetting does not affect User B
5. Atomic transaction rollback if an error occurs
"""

import sys
import os
import unittest
from unittest.mock import patch

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from starlette.testclient import TestClient

from app.main import app
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.finance import Finance
from app.models.assessment import Assessment
from app.models.activity import Activity
from app.services.auth_service import hash_password, create_access_token


class JourneyDeletionTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

        # Clean up any leftover test users
        self.db.query(Activity).filter(Activity.user_id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.query(Finance).filter(Finance.user_id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.query(Assessment).filter(Assessment.user_id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.commit()

    def tearDown(self):
        self.db.query(Activity).filter(Activity.user_id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.query(Finance).filter(Finance.user_id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.query(Assessment).filter(Assessment.user_id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def _create_user(self, user_id: int, phone: str, name: str, business: str):
        user = User(
            id=user_id,
            name=name,
            phone=phone,
            email=f"{phone}@example.com",
            hashed_password=hash_password("Secret@123"),
            language="Hindi",
            state="Rajasthan",
            district="Jaipur",
            block="Amber",
            village="Rampura",
            rural_or_urban="Rural",
            age=35,
            gender="Male",
            education="12th Pass",
            occupation="Farmer",
            social_category="OBC",
            annual_family_income=180000,
            has_bank_account=True,
            has_land=True,
            has_commercial_space=False,
            has_equipment=True,
            skills="Animal Husbandry, Crop Management",
            business_type=business,
            business_name=f"{business} Unit",
            business_interest=business,
            business_status="Planning",
            business_investment=200000,
            business_goals="Establish sustainable micro enterprise",
            capital=200000,
            investment_capacity=200000,
        )
        self.db.add(user)
        self.db.commit()

        # Add assessment
        asm = Assessment(
            user_id=user_id,
            location=f"Rampura, Amber, Jaipur, Rajasthan",
            capital=200000,
            business_interest=business,
            experience="Beginner",
            status="completed",
        )
        self.db.add(asm)

        # Add finance record
        fin = Finance(
            user_id=user_id,
            business_type=business,
            business_name=f"{business} Unit",
            project_cost=1500000,
            user_capital=200000,
            loan_amount=1300000,
            margin_pct=13.3,
            interest_rate=7.0,
            loan_tenure=60,
            moratorium=6,
            emi=25741,
            subsidy_amount=0,
            subsidy_percentage=0.0,
            matched_scheme_name="PM Mudra Yojana",
            expected_monthly_revenue=85000,
            monthly_expenses=45000,
            monthly_profit=14259,
            annual_revenue=1020000,
            annual_profit=171108,
            annual_debt_obligation=308892,
            annual_cfads=480000,
            dscr=1.55,
            break_even_month=8,
            roi=14.2,
            status="draft",
        )
        self.db.add(fin)

        # Add activity
        act = Activity(
            user_id=user_id,
            activity_type="assessment",
            title=f"Business assessment completed for {business}",
            description="Location: Rampura | Capital: 200000",
            icon="📊",
        )
        self.db.add(act)
        self.db.commit()

        token = create_access_token(user_id, extra_data={"phone": phone})
        return token

    def test_unauthenticated_journey_delete_rejected(self):
        """Unauthenticated request to DELETE /api/journey/me must return 401."""
        resp = self.client.delete("/api/journey/me")
        self.assertEqual(resp.status_code, 401)

    def test_authenticated_journey_delete_clears_only_journey_data(self):
        """Deleting journey clears finance, assessment, activities and business fields while preserving demographics."""
        token = self._create_user(98881, "9999988810", "Ramesh Kumar", "Poultry")

        headers = {"Authorization": f"Bearer {token}"}
        resp = self.client.delete("/api/journey/me", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "success")

        # Verify DB: finances deleted
        fin = self.db.query(Finance).filter(Finance.user_id == 98881).all()
        self.assertEqual(len(fin), 0)

        # Verify DB: assessments deleted
        asm = self.db.query(Assessment).filter(Assessment.user_id == 98881).all()
        self.assertEqual(len(asm), 0)

        # Verify DB: activities deleted
        acts = self.db.query(Activity).filter(Activity.user_id == 98881).all()
        self.assertEqual(len(acts), 0)

        # Verify DB: User model journey fields reset
        self.db.expire_all()
        user = self.db.query(User).filter(User.id == 98881).first()
        self.assertIsNotNone(user)
        self.assertIsNone(user.business_type)
        self.assertIsNone(user.business_name)
        self.assertIsNone(user.business_interest)
        self.assertIsNone(user.business_status)
        self.assertIsNone(user.business_investment)
        self.assertIsNone(user.business_goals)

        # CRUCIAL: Verify permanent account & demographic fields are INTACT
        self.assertEqual(user.name, "Ramesh Kumar")
        self.assertEqual(user.phone, "9999988810")
        self.assertEqual(user.language, "Hindi")
        self.assertEqual(user.state, "Rajasthan")
        self.assertEqual(user.district, "Jaipur")
        self.assertEqual(user.village, "Rampura")
        self.assertEqual(user.age, 35)
        self.assertEqual(user.gender, "Male")
        self.assertEqual(user.education, "12th Pass")
        self.assertEqual(user.occupation, "Farmer")
        self.assertEqual(user.social_category, "OBC")
        self.assertEqual(user.annual_family_income, 180000)
        self.assertTrue(user.has_bank_account)
        self.assertTrue(user.has_land)
        self.assertTrue(user.is_active)

    def test_strict_multi_user_data_isolation(self):
        """Deleting User A's journey must NEVER affect User B's journey."""
        token_a = self._create_user(98881, "9999988810", "User A", "Dairy")
        token_b = self._create_user(98882, "9999988820", "User B", "Poultry")

        # User A deletes their journey
        resp = self.client.delete("/api/journey/me", headers={"Authorization": f"Bearer {token_a}"})
        self.assertEqual(resp.status_code, 200)

        self.db.expire_all()

        # User A's journey data is gone
        self.assertEqual(self.db.query(Finance).filter(Finance.user_id == 98881).count(), 0)
        self.assertEqual(self.db.query(Assessment).filter(Assessment.user_id == 98881).count(), 0)
        user_a = self.db.query(User).filter(User.id == 98881).first()
        self.assertIsNone(user_a.business_type)

        # User B's journey data is 100% UNTOUCHED
        fin_b = self.db.query(Finance).filter(Finance.user_id == 98882).first()
        self.assertIsNotNone(fin_b)
        self.assertEqual(fin_b.business_type, "Poultry")

        asm_b = self.db.query(Assessment).filter(Assessment.user_id == 98882).first()
        self.assertIsNotNone(asm_b)
        self.assertEqual(asm_b.business_interest, "Poultry")

        act_b = self.db.query(Activity).filter(Activity.user_id == 98882).count()
        self.assertGreater(act_b, 0)

        user_b = self.db.query(User).filter(User.id == 98882).first()
        self.assertEqual(user_b.business_type, "Poultry")
        self.assertEqual(user_b.name, "User B")

    def test_transactional_rollback_on_failure(self):
        """If an error occurs during journey deletion, rollback occurs and data is not lost."""
        token = self._create_user(98881, "9999988810", "Rollback User", "Dairy")

        # Mock db.commit to raise an exception simulating a database failure
        with patch("sqlalchemy.orm.Session.commit", side_effect=RuntimeError("Simulated DB error")):
            resp = self.client.delete("/api/journey/me", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(resp.status_code, 500)

        self.db.expire_all()
        # Because of rollback, assessment, finance, and user fields must still exist
        fin = self.db.query(Finance).filter(Finance.user_id == 98881).first()
        self.assertIsNotNone(fin)
        asm = self.db.query(Assessment).filter(Assessment.user_id == 98881).first()
        self.assertIsNotNone(asm)
        user = self.db.query(User).filter(User.id == 98881).first()
        self.assertEqual(user.business_type, "Dairy")


if __name__ == "__main__":
    unittest.main()

