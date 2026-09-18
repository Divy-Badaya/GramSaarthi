"""
GRAMSAARTHI — Finance Feature Comprehensive Test Suite
Tests:
1. Standard Banking Calculations (EMI, r=0, zero-principal)
2. Formal DSCR Formula (Annual CFADS / Annual Debt Obligation)
3. Genuine Break-Even Derivation
4. Input Validations (negative numbers, out-of-bound tenure/interest)
5. Multi-Business Cost Templates (Dairy, Poultry, Retail, Textile, Food, Transport, Fisheries)
6. Official Government Scheme Matching
7. Loan Eligibility Evaluation
8. Database Multi-User Isolation
9. Draft vs Finalized Lifecycle
"""

import sys
import os
import unittest

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database.connection import SessionLocal
from app.models.user import User
from app.models.finance import Finance
from app.services import finance_service, business_template_service
from app.services.auth_service import hash_password


class FinanceCalculationTests(unittest.TestCase):
    def test_emi_standard_calculation(self):
        # ₹9,00,000 at 7% p.a. for 60 months
        # P = 900000, r = 7/1200 = 0.005833333333333333, n = 60
        # Expected EMI: ~₹17,821 - ₹17,822
        emi = finance_service._calculate_emi(900000, 7.0, 60)
        self.assertAlmostEqual(emi, 17822, delta=5)

    def test_emi_zero_interest(self):
        # 0% interest loan: P / n
        emi = finance_service._calculate_emi(600000, 0.0, 60)
        self.assertEqual(emi, 10000)

    def test_emi_zero_principal(self):
        emi = finance_service._calculate_emi(0, 8.5, 60)
        self.assertEqual(emi, 0)

    def test_formal_dscr_calculation(self):
        # Plan with monthly rev = 55,000, monthly exp = 30,000, emi = 15,000
        # Annual CFADS = (55000 - 30000) * 12 = 300,000
        # Annual Debt = 15000 * 12 = 180,000
        # DSCR = 300000 / 180000 = 1.67
        plan = finance_service.calculate_financial_plan(
            business_type="Dairy",
            user_capital=100000,
            project_cost=1000000,
            loan_amount=900000,
            interest_rate=7.0,
            loan_tenure=60,
        )
        self.assertGreater(plan["annual_cfads"], 0)
        self.assertGreater(plan["annual_debt_obligation"], 0)
        expected_dscr = round(plan["annual_cfads"] / plan["annual_debt_obligation"], 2)
        self.assertEqual(plan["dscr"], expected_dscr)

    def test_genuine_break_even(self):
        plan = finance_service.calculate_financial_plan(
            business_type="Dairy",
            user_capital=100000,
            project_cost=1000000,
        )
        self.assertIsInstance(plan["break_even_month"], int)
        self.assertGreaterEqual(plan["break_even_month"], 3)
        self.assertLessEqual(plan["break_even_month"], 48)

    def test_strict_input_validation(self):
        # Negative capital
        with self.assertRaises(ValueError):
            finance_service.calculate_financial_plan(business_type="Dairy", user_capital=-50000)

        # Zero or negative project cost
        with self.assertRaises(ValueError):
            finance_service.calculate_financial_plan(business_type="Dairy", user_capital=10000, project_cost=0)

        # Out-of-bounds interest rate (> 50%)
        with self.assertRaises(ValueError):
            finance_service.calculate_financial_plan(business_type="Dairy", user_capital=10000, interest_rate=65.0)

        # Out-of-bounds loan tenure (< 1 month)
        with self.assertRaises(ValueError):
            finance_service.calculate_financial_plan(business_type="Dairy", user_capital=10000, loan_tenure=0)

    def test_multi_business_differentiation(self):
        capital = 200000
        dairy_plan = finance_service.calculate_financial_plan("Dairy", capital)
        poultry_plan = finance_service.calculate_financial_plan("Poultry", capital)
        retail_plan = finance_service.calculate_financial_plan("Retail Shop", capital)
        textile_plan = finance_service.calculate_financial_plan("Textile Unit", capital)

        # Different businesses must produce distinct financial metrics
        self.assertNotEqual(dairy_plan["expected_monthly_revenue"], poultry_plan["expected_monthly_revenue"])
        self.assertNotEqual(dairy_plan["monthly_expenses"], retail_plan["monthly_expenses"])
        self.assertNotEqual(retail_plan["project_cost"], textile_plan["project_cost"])

    def test_scheme_matching_consistency(self):
        # Dairy aligns with KCC / Mudra
        dairy = finance_service.calculate_financial_plan("Dairy", 100000)
        self.assertIn(dairy["matched_scheme_id"], ["PMMY", "KCC", "NLM", "PMEGP"])

        # Food processing aligns with PMFME or PMEGP
        food = finance_service.calculate_financial_plan("Food Processing", 150000)
        self.assertIn(food["matched_scheme_id"], ["PMFME", "PMEGP", "PMMY"])

        # Textile / Tailoring aligns with PM Vishwakarma or PMEGP
        textile = finance_service.calculate_financial_plan("Tailoring & Textile", 80000)
        self.assertIn(textile["matched_scheme_id"], ["PMVISHWAKARMA", "PMMY", "PMEGP"])

    def test_loan_eligibility_evaluation(self):
        # Eligible scenario: good margin (15%), DSCR > 1.30
        good_plan = {
            "margin_pct": 20.0,
            "dscr": 1.55,
            "monthly_profit": 28000,
            "loan_amount": 800000,
            "project_cost": 1000000,
            "user_capital": 200000,
            "emi": 15800,
            "matched_scheme_name": "PM Mudra Yojana – Tarun",
        }
        res_good = finance_service.evaluate_loan_eligibility(good_plan)
        self.assertEqual(res_good["status"], "Eligible")
        self.assertGreaterEqual(res_good["score"], 75)

        # Low margin (<10%) and tight DSCR (<1.0)
        poor_plan = {
            "margin_pct": 5.0,
            "dscr": 0.85,
            "monthly_profit": -2000,
            "loan_amount": 950000,
            "project_cost": 1000000,
            "user_capital": 50000,
            "emi": 19000,
            "matched_scheme_name": "PM Mudra Yojana – Tarun",
        }
        res_poor = finance_service.evaluate_loan_eligibility(poor_plan)
        self.assertEqual(res_poor["status"], "Not Eligible")
        self.assertLess(res_poor["score"], 50)

    def test_agriculture_template_scaling(self):
        plan = finance_service.calculate_financial_plan(
            business_type="Agriculture",
            user_capital=150000,
            project_cost=600000,
        )
        self.assertEqual(plan["business_type"], "Agriculture")
        self.assertGreater(plan["fixed_monthly_expenses"], 0)
        self.assertGreater(plan["variable_monthly_expenses"], 0)
        self.assertEqual(plan["fixed_monthly_expenses"] + plan["variable_monthly_expenses"], plan["monthly_expenses"])
        self.assertGreater(plan["expected_monthly_revenue"], plan["monthly_expenses"])
        self.assertIn("fertilizer", str(plan["capex_breakdown"]).lower())

    def test_fixed_variable_expenses_and_margin(self):
        plan = finance_service.calculate_financial_plan(
            business_type="Dairy",
            user_capital=200000,
            project_cost=1000000,
            loan_amount=800000,
            interest_rate=8.5,
            loan_tenure=60,
        )
        # Sum of fixed + variable must equal total monthly expenses
        self.assertEqual(plan["fixed_monthly_expenses"] + plan["variable_monthly_expenses"], plan["monthly_expenses"])
        # Profit margin must be calculated accurately
        self.assertGreater(plan["profit_margin"], 0)
        expected_margin = round((plan["net_monthly_profit"] / plan["expected_monthly_revenue"]) * 100, 1)
        self.assertEqual(plan["profit_margin"], expected_margin)
        # Break-even monthly revenue must be positive
        self.assertGreater(plan["break_even_revenue"], 0)

    def test_detailed_12m_and_yearly_projections(self):
        plan = finance_service.calculate_financial_plan(
            business_type="Poultry",
            user_capital=250000,
            project_cost=1000000,
        )
        # 12-month projections
        self.assertEqual(len(plan["projections_12m"]), 12)
        for m in plan["projections_12m"]:
            self.assertIn("month", m)
            self.assertIn("revenue", m)
            self.assertIn("expenses", m)
            self.assertIn("fixed_expense", m)
            self.assertIn("variable_expense", m)
            self.assertIn("operating_profit", m)
            self.assertIn("emi", m)
            self.assertIn("net_profit", m)
            self.assertIn("net_cash_flow", m)
            self.assertIn("outstanding_loan", m)
            self.assertEqual(m["fixed_expense"] + m["variable_expense"], m["expenses"])

        # 3-year projections
        self.assertEqual(len(plan["yearly_projections"]), 3)
        self.assertEqual([y["year"] for y in plan["yearly_projections"]], [1, 2, 3])
        for y in plan["yearly_projections"]:
            self.assertIn("revenue", y)
            self.assertIn("expenses", y)
            self.assertIn("profit", y)
            self.assertIn("debt_service", y)
            self.assertIn("net_cash_flow", y)


class FinanceDatabaseIsolationTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

        # Clean up any previous test users
        self.db.query(Finance).filter(Finance.user_id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.commit()

        # Create User A (Dairy, ₹2,00,000)
        self.user_a = User(
            id=98881,
            name="Test User A",
            phone="9999998881",
            business_type="Dairy",
            capital=200000,
            hashed_password=hash_password("pass123"),
            is_active=True,
        )
        # Create User B (Poultry, ₹5,00,000)
        self.user_b = User(
            id=98882,
            name="Test User B",
            phone="9999998882",
            business_type="Poultry",
            capital=500000,
            hashed_password=hash_password("pass123"),
            is_active=True,
        )
        self.db.add_all([self.user_a, self.user_b])
        self.db.commit()

    def tearDown(self):
        self.db.query(Finance).filter(Finance.user_id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_([98881, 98882])).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def test_strict_multi_user_data_isolation(self):
        # Compute and save finance for User A
        plan_a = finance_service.calculate_financial_plan(
            business_type="Dairy",
            user_capital=200000,
            user_profile=self.user_a,
            status="draft",
        )
        rec_a = finance_service.save_or_update_user_finance(
            db=self.db,
            user_id=self.user_a.id,
            data=plan_a,
            status="draft",
        )

        # Compute and save finance for User B
        plan_b = finance_service.calculate_financial_plan(
            business_type="Poultry",
            user_capital=500000,
            user_profile=self.user_b,
            status="finalized",
        )
        rec_b = finance_service.save_or_update_user_finance(
            db=self.db,
            user_id=self.user_b.id,
            data=plan_b,
            status="finalized",
        )

        # Query User A finance
        fetched_a = finance_service.get_user_finance(self.db, self.user_a.id)
        fetched_b = finance_service.get_user_finance(self.db, self.user_b.id)

        self.assertIsNotNone(fetched_a)
        self.assertIsNotNone(fetched_b)
        self.assertEqual(fetched_a.user_id, self.user_a.id)
        self.assertEqual(fetched_b.user_id, self.user_b.id)
        self.assertEqual(fetched_a.business_type, "Dairy")
        self.assertEqual(fetched_b.business_type, "Poultry")
        self.assertEqual(fetched_a.user_capital, 200000)
        self.assertEqual(fetched_b.user_capital, 500000)
        self.assertEqual(fetched_a.status, "draft")
        self.assertEqual(fetched_b.status, "finalized")

        # Verify User A never gets User B's metrics
        self.assertNotEqual(fetched_a.project_cost, fetched_b.project_cost)
        self.assertNotEqual(fetched_a.loan_amount, fetched_b.loan_amount)
        self.assertNotEqual(fetched_a.expected_monthly_revenue, fetched_b.expected_monthly_revenue)


class FinanceApiIntegrationTests(unittest.TestCase):
    def setUp(self):
        from starlette.testclient import TestClient
        from app.main import app
        from app.services.auth_service import create_access_token

        self.client = TestClient(app)
        self.db = SessionLocal()

        # Clean test users
        self.db.query(Finance).filter(Finance.user_id.in_([99991, 99992])).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_([99991, 99992])).delete(synchronize_session=False)
        self.db.commit()

        # Create User A & User B
        self.user_a = User(
            id=99991,
            name="API User A",
            phone="9999999991",
            business_type="Dairy",
            capital=200000,
            hashed_password=hash_password("pass123"),
            is_active=True,
        )
        self.user_b = User(
            id=99992,
            name="API User B",
            phone="9999999992",
            business_type="Poultry",
            capital=500000,
            hashed_password=hash_password("pass123"),
            is_active=True,
        )
        self.db.add_all([self.user_a, self.user_b])
        self.db.commit()

        self.token_a = create_access_token(self.user_a.id)
        self.token_b = create_access_token(self.user_b.id)

    def tearDown(self):
        self.db.query(Finance).filter(Finance.user_id.in_([99991, 99992])).delete(synchronize_session=False)
        self.db.query(User).filter(User.id.in_([99991, 99992])).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def test_unauthenticated_request_rejected(self):
        resp = self.client.get("/api/finance/me")
        self.assertEqual(resp.status_code, 401)

    def test_new_user_has_no_fake_finance(self):
        headers = {"Authorization": f"Bearer {self.token_a}"}
        resp = self.client.get("/api/finance/me", headers=headers)
        # Newly registered user must NOT see fake Dairy demo finance
        self.assertEqual(resp.status_code, 404)

    def test_assessment_flow_seeds_draft_finance_and_finalizes(self):
        headers_a = {"Authorization": f"Bearer {self.token_a}"}

        # 1. User A submits assessment for Dairy with ₹2,00,000 capital
        assess_resp = self.client.post(
            "/api/assessments",
            json={
                "location": "Khajuri Kalan, Sehore, Madhya Pradesh",
                "capital": 200000,
                "business_interest": "Dairy",
                "experience": "Beginner",
            },
            headers=headers_a,
        )
        self.assertEqual(assess_resp.status_code, 201)

        # 2. Verify Finance is now initialized as 'draft' with User A's real assessment metrics
        fin_resp = self.client.get("/api/finance/me", headers=headers_a)
        self.assertEqual(fin_resp.status_code, 200)
        fin_data = fin_resp.json()
        self.assertEqual(fin_data["business_type"], "Dairy")
        self.assertEqual(fin_data["user_capital"], 200000)
        self.assertEqual(fin_data["margin"], 200000)
        self.assertEqual(fin_data["status"], "draft")
        self.assertGreater(fin_data["project_cost"], 0)
        self.assertGreater(fin_data["emi"], 0)

        # 3. User A edits and finalizes their finance plan
        put_resp = self.client.put(
            "/api/finance/me",
            json={
                "user_capital": 250000,
                "status": "finalized",
            },
            headers=headers_a,
        )
        self.assertEqual(put_resp.status_code, 200)
        updated_data = put_resp.json()
        self.assertEqual(updated_data["user_capital"], 250000)
        self.assertEqual(updated_data["status"], "finalized")

        # 4. User B completes assessment for Poultry with ₹5,00,000
        headers_b = {"Authorization": f"Bearer {self.token_b}"}
        self.client.post(
            "/api/assessments",
            json={
                "location": "Pipaliya, Sehore, Madhya Pradesh",
                "capital": 500000,
                "business_interest": "Poultry",
                "experience": "Intermediate",
            },
            headers=headers_b,
        )

        fin_resp_b = self.client.get("/api/finance/me", headers=headers_b)
        self.assertEqual(fin_resp_b.status_code, 200)
        fin_data_b = fin_resp_b.json()
        self.assertEqual(fin_data_b["business_type"], "Poultry")
        self.assertEqual(fin_data_b["user_capital"], 500000)

        # 5. User A still has their distinct Dairy data
        fin_resp_a_again = self.client.get("/api/finance/me", headers=headers_a)
        self.assertEqual(fin_resp_a_again.json()["business_type"], "Dairy")
        self.assertEqual(fin_resp_a_again.json()["user_capital"], 250000)

    def test_eligibility_and_schemes_api(self):
        headers_a = {"Authorization": f"Bearer {self.token_a}"}

        # Seed assessment first
        self.client.post(
            "/api/assessments",
            json={
                "location": "Khajuri Kalan, Sehore",
                "capital": 150000,
                "business_interest": "Dairy",
                "experience": "Beginner",
            },
            headers=headers_a,
        )

        # Check eligibility endpoint
        elig_resp = self.client.get("/api/finance/eligibility", headers=headers_a)
        self.assertEqual(elig_resp.status_code, 200)
        elig_data = elig_resp.json()
        self.assertIn(elig_data["status"], ["Eligible", "Potentially Eligible", "Not Eligible"])
        self.assertIn("score", elig_data)
        self.assertIn("metrics", elig_data)
        self.assertIn("disclaimer", elig_data)

        # Check schemes endpoint
        scheme_resp = self.client.get("/api/finance/schemes", headers=headers_a)
        self.assertEqual(scheme_resp.status_code, 200)
        schemes = scheme_resp.json()
        self.assertIsInstance(schemes, list)
        self.assertGreater(len(schemes), 0)

    def test_calculate_api_endpoint_dynamic(self):
        # Calculate endpoint should return dynamic preview without persisting or requiring prior assessment
        calc_resp = self.client.post(
            "/api/finance/calculate",
            json={
                "business_type": "Agriculture",
                "user_capital": 200000,
                "project_cost": 800000,
                "loan_amount": 600000,
                "interest_rate": 8.0,
                "loan_tenure": 48,
            },
        )
        self.assertEqual(calc_resp.status_code, 200)
        data = calc_resp.json()
        self.assertEqual(data["business_type"], "Agriculture")
        self.assertEqual(data["user_capital"], 200000)
        self.assertEqual(data["project_cost"], 800000)
        self.assertEqual(data["loan_amount"], 600000)
        self.assertGreater(data["fixed_monthly_expenses"], 0)
        self.assertGreater(data["variable_monthly_expenses"], 0)
        self.assertGreater(data["profit_margin"], 0)
        self.assertGreater(data["break_even_revenue"], 0)
        self.assertEqual(len(data["projections_12m"]), 12)
        self.assertEqual(len(data["yearly_projections"]), 3)

    def test_update_business_type_via_finance_api(self):
        headers_b = {"Authorization": f"Bearer {self.token_b}"}
        # Directly PUT to /api/finance/me to create/update finance plan with a new business_type
        put_resp = self.client.put(
            "/api/finance/me",
            json={
                "business_type": "Agriculture",
                "business_name": "Kisan Seed & Fertilizer Store",
                "user_capital": 180000,
                "project_cost": 750000,
                "loan_amount": 570000,
                "interest_rate": 7.5,
                "loan_tenure": 60,
                "status": "finalized",
            },
            headers=headers_b,
        )
        self.assertEqual(put_resp.status_code, 200)
        data = put_resp.json()
        self.assertEqual(data["business_type"], "Agriculture")
        self.assertEqual(data["business_name"], "Kisan Seed & Fertilizer Store")
        self.assertEqual(data["status"], "finalized")
        self.assertEqual(data["user_capital"], 180000)
        self.assertEqual(data["project_cost"], 750000)
        self.assertEqual(data["loan_amount"], 570000)

        # Re-fetch via GET /api/finance/me
        get_resp = self.client.get("/api/finance/me", headers=headers_b)
        self.assertEqual(get_resp.status_code, 200)
        get_data = get_resp.json()
        self.assertEqual(get_data["business_type"], "Agriculture")
        self.assertEqual(get_data["business_name"], "Kisan Seed & Fertilizer Store")
        self.assertEqual(get_data["status"], "finalized")


if __name__ == "__main__":
    unittest.main()
