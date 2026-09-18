"""
GRAMSAARTHI — Phase 4 Comprehensive Automated Test Suite
Tests:
1. Dataset shape integrity (must remain strictly 860 rows x 473 columns)
2. Financial feasibility: actual investment, revenue, expenses, capital, and clear assumptions
3. Loan connection: estimated investment, own contribution, funding requirement, possible loan,
   important conditions, and 4 distinct statuses:
   - Eligible
   - Potentially eligible
   - Not eligible
   - Insufficient information
4. Risk analysis service: all 8 dimensions (Capital, Loan, Repayment, Market, Skill Gap,
   Operating-Cost, Revenue Sensitivity, Scalability) with LOW/MEDIUM/HIGH/INSUFFICIENT DATA,
   grounded reasons, and mitigations
5. Complete connected flow via /api/finance/comprehensive-assessment
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
from app.services import finance_service, loan_eligibility_service, risk_analysis_service


def test_01_dataset_shape_integrity():
    """Verify dataset has not been modified, filtered, sampled, or aggregated."""
    csv_path = os.path.join(backend_dir, "ml", "gramsaarthi_ml_dataset.csv")
    df = pd.read_csv(csv_path)
    print(f"\n[DATASET INTEGRITY] Shape: {df.shape}")
    assert df.shape == (860, 473), f"Dataset shape modified! Expected (860, 473), got {df.shape}"


def test_02_financial_feasibility_actual_parameters():
    """Verify financial feasibility uses actual investment, revenue, expenses, and exposes clear assumptions."""
    plan = finance_service.calculate_financial_plan(
        business_type="Dairy",
        user_capital=150000,
        project_cost=1000000,
        loan_amount=750000,
    )
    summary = finance_service.get_financial_feasibility_summary(plan)

    print("\n[FINANCIAL FEASIBILITY VERIFICATION]")
    print(f"Business: Dairy | Status: {summary['feasibility_status']}")
    print(f"Project Cost: Rs. {summary['project_cost']:,} | Own Capital: Rs. {summary['user_capital']:,} ({summary['margin_pct']}%)")
    print(f"Monthly Revenue: Rs. {summary['monthly_revenue']:,} | Monthly Expenses: Rs. {summary['monthly_expenses']:,}")
    print(f"Monthly Profit (After EMI): Rs. {summary['monthly_profit']:,} | DSCR: {summary['dscr']}x")
    print(f"Break-Even Horizon: {summary['break_even_month']} months | Scale: {summary['production_scale']}")
    print(f"Assumptions count: {len(summary['assumptions'])}")

    assert summary["is_feasible"] is True
    assert summary["feasibility_status"] in ["Highly Feasible", "Feasible with Conditions"]
    assert summary["project_cost"] == 1000000
    assert summary["user_capital"] == 150000
    assert summary["margin_pct"] == 15.0
    assert summary["monthly_revenue"] > 0
    assert summary["monthly_expenses"] > 0
    assert summary["monthly_profit"] > 0
    assert len(summary["assumptions"]) >= 3


def test_03_loan_connection_and_statuses():
    """Verify loan connection outputs required fields and clearly distinguishes all 4 statuses."""
    # Case A: Eligible
    eligible_plan = finance_service.calculate_financial_plan(
        business_type="Dairy",
        user_capital=200000,
        project_cost=1000000,
        loan_amount=600000,
    )
    res_a = loan_eligibility_service.evaluate_plan_loan_eligibility(eligible_plan)
    print(f"\n[LOAN STATUS 1 - ELIGIBLE]: {res_a['status']}")
    assert res_a["status"] == "Eligible"
    assert res_a["estimated_investment"] == 1000000
    assert res_a["own_contribution"] == 200000
    assert res_a["own_contribution_pct"] == 20.0
    assert res_a["funding_requirement"] == 800000
    assert res_a["possible_loan_requirement"] == 600000
    assert len(res_a["important_conditions"]) >= 4

    # Case B: Potentially Eligible (marginal equity / DSCR)
    partial_plan = finance_service.calculate_financial_plan(
        business_type="Retail",
        user_capital=50000,
        project_cost=350000,
        loan_amount=260000,
    )
    res_b = loan_eligibility_service.evaluate_plan_loan_eligibility(partial_plan)
    print(f"[LOAN STATUS 2 - POTENTIALLY ELIGIBLE]: {res_b['status']}")
    assert "Potentially" in res_b["status"] or res_b["status_key"] == "partially_eligible"
    assert "Potentially" in res_b["status"] or res_b["status_key"] == "partially_eligible"

    # Case C: Not Eligible (excessive requested loan far exceeding debt capacity)
    unviable_plan = {
        "business_type": "Generic",
        "project_cost": 500000,
        "user_capital": 10000,
        "loan_amount": 490000,
        "margin_pct": 2.0,
        "interest_rate": 10.0,
        "loan_tenure": 36,
        "moratorium": 0,
        "emi": 15800,
        "expected_monthly_revenue": 16000,
        "monthly_expenses": 15000,
        "monthly_profit": -14800,
        "annual_cfads": 12000,
        "dscr": 0.06,
    }
    res_c = loan_eligibility_service.evaluate_plan_loan_eligibility(unviable_plan)
    print(f"[LOAN STATUS 3 - NOT ELIGIBLE]: {res_c['status']}")
    assert res_c["status"] == "Not Eligible"

    # Case D: Insufficient Information (zero capital)
    missing_plan = {
        "business_type": "Dairy",
        "project_cost": 0,
        "user_capital": 0,
        "loan_amount": 0,
        "margin_pct": 0.0,
    }
    res_d = loan_eligibility_service.evaluate_plan_loan_eligibility(missing_plan)
    print(f"[LOAN STATUS 4 - INSUFFICIENT INFO]: {res_d['status']}")
    assert res_d["status"] == "Insufficient information"


def test_04_risk_analysis_8_dimensions():
    """Verify risk analysis evaluates all 8 dimensions with LOW/MEDIUM/HIGH/INSUFFICIENT DATA and practical mitigations."""
    plan = finance_service.calculate_financial_plan(
        business_type="Poultry",
        user_capital=150000,
        project_cost=1000000,
        loan_amount=700000,
    )

    # Test beginner with no land
    user_beginner = User(
        id=88881,
        name="Beginner Farmer",
        experience="Beginner - No prior poultry experience",
        has_land=False,
        has_commercial_space=False,
        has_bank_account=True,
    )

    risk_beg = risk_analysis_service.evaluate_business_risks(
        financial_plan=plan,
        user_profile=user_beginner,
    )

    print(f"\n[RISK ANALYSIS - BEGINNER POULTRY]")
    print(f"Overall Risk: {risk_beg['overall_risk']} (Score: {risk_beg['overall_score']})")
    print(f"Summary: {risk_beg['summary']}")
    assert len(risk_beg["factors"]) == 8

    category_names = [f["category"] for f in risk_beg["factors"]]
    expected_categories = [
        "Capital Risk",
        "Loan Risk",
        "Repayment Risk",
        "Market Risk",
        "Skill Gap",
        "Operating-Cost Risk",
        "Revenue Sensitivity",
        "Scalability Risk",
    ]
    for cat in expected_categories:
        assert cat in category_names, f"Missing category: {cat}"

    # Verify skill gap is HIGH for beginner
    skill_factor = next(f for f in risk_beg["factors"] if f["category"] == "Skill Gap")
    print(f"Skill Gap Level: {skill_factor['level']}")
    print(f"Skill Gap Reason: {skill_factor['reason']}")
    print(f"Skill Gap Mitigation: {skill_factor['mitigation']}")
    assert skill_factor["level"] == "HIGH"
    assert "KVK" in skill_factor["mitigation"] or "training" in skill_factor["mitigation"].lower()

    # Verify Scalability Risk is HIGH because poultry requires land and user has no land
    scale_factor = next(f for f in risk_beg["factors"] if f["category"] == "Scalability Risk")
    assert scale_factor["level"] == "HIGH"

    # Test Experienced farmer with land
    user_expert = User(
        id=88882,
        name="Expert Farmer",
        experience="5 years experienced in commercial poultry",
        has_land=True,
        has_commercial_space=True,
        has_bank_account=True,
    )
    risk_exp = risk_analysis_service.evaluate_business_risks(
        financial_plan=plan,
        user_profile=user_expert,
    )
    skill_exp = next(f for f in risk_exp["factors"] if f["category"] == "Skill Gap")
    assert skill_exp["level"] == "LOW"

    # Test Insufficient Data handling (missing profile experience)
    risk_no_data = risk_analysis_service.evaluate_business_risks(
        financial_plan=plan,
        user_profile=None,
    )
    skill_nd = next(f for f in risk_no_data["factors"] if f["category"] == "Skill Gap")
    assert skill_nd["level"] == "INSUFFICIENT DATA"


def test_05_comprehensive_assessment_endpoint():
    """Verify POST /api/finance/comprehensive-assessment connects Feasibility, Loan, and Risk end-to-end."""
    client = TestClient(app)
    payload = {
        "business_type": "Dairy",
        "user_capital": 150000,
        "project_cost": 1000000,
        "experience": "Intermediate - 2 years experience",
    }
    resp = client.post("/api/finance/comprehensive-assessment", json=payload)
    assert resp.status_code == 200, f"Error: {resp.text}"
    data = resp.json()

    print("\n[COMPREHENSIVE ASSESSMENT API VERIFIED]")
    print(f"Business: {data['business_name']} ({data['business_type']})")
    print(f"Feasibility: {data['financial_feasibility']['feasibility_status']} (Monthly Profit: Rs. {data['financial_feasibility']['monthly_profit']:,})")
    print(f"Loan Status: {data['loan_assessment']['status']} (Max Loan: Rs. {data['loan_assessment']['maximum_eligible_loan']:,})")
    print(f"Risk Profile: {data['risk_analysis']['overall_risk']} Risk ({len(data['risk_analysis']['factors'])} factors)")

    assert "financial_feasibility" in data
    assert "loan_assessment" in data
    assert "risk_analysis" in data
    assert data["financial_feasibility"]["project_cost"] == 1000000
    assert data["loan_assessment"]["status"] in ["Eligible", "Potentially eligible", "Potentially Eligible"]
    assert len(data["risk_analysis"]["factors"]) == 8
