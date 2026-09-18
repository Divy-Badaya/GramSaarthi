"""
GRAMSAARTHI — Phase 6 Comprehensive Automated Test Suite
Tests:
1. Dataset shape integrity (strictly 860 rows x 473 columns)
2. Dynamic Personalized Business Roadmap:
   - Initial fresh user state (Step 1 current, future locked/pending)
   - Progressive state (Profile -> Assessment -> Business -> Finance -> DPR)
   - Dynamic missing requirement detection
   - Route integrity for all 10 milestones
3. What-If Financial & Business Simulation:
   - Variable investments, capital contribution, and loan requirement
   - Revenue sensitivity and expense shock multipliers
   - Downstream metrics recalculation: Revenue, Expenses, Net Profit, EMI, DSCR, ROI, Break-even
   - Reuses existing financial and 8-factor risk services without formula duplication
   - Explicit financial assumptions included in output
4. Side-by-Side Scenario Comparison:
   - Dairy vs Poultry comparison
   - Scale comparisons (₹2L vs ₹5L vs ₹10L)
   - Comparison matrix table and automated comparative insights
5. API Endpoints via TestClient:
   - GET /api/journey/roadmap
   - POST /api/finance/simulate
   - POST /api/finance/simulate/compare
"""

import sys
import os
import uuid
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
from app.models.dpr import DPR
from app.services.auth_service import hash_password, create_access_token
from app.services import roadmap_service, simulation_service
from app.schemas.finance import SimulationRequest, ScenarioCompareRequest


def test_01_dataset_shape_integrity():
    """Verify dataset has not been modified, filtered, sampled, or aggregated."""
    csv_path = os.path.join(backend_dir, "ml", "gramsaarthi_ml_dataset.csv")
    df = pd.read_csv(csv_path)
    print(f"\n[DATASET INTEGRITY] Shape: {df.shape}")
    assert df.shape == (860, 473), f"Dataset shape modified! Expected (860, 473), got {df.shape}"


def test_02_dynamic_roadmap_fresh_user():
    """Verify dynamic roadmap evaluation for a newly registered, fresh user."""
    create_tables()
    db = SessionLocal()
    try:
        uname = f"test_fresh_{uuid.uuid4().hex[:6]}"
        user = User(
            name="Fresh Rural Entrepreneur",
            email=f"{uname}@test.com",
            phone=f"98{uuid.uuid4().int % 100000000:08d}",
            hashed_password=hash_password("password123"),
            state=None,  # Missing location
            district=None,
            social_category=None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        roadmap = roadmap_service.evaluate_user_roadmap(db, user)

        print(f"\n[ROADMAP FRESH] Progress: {roadmap.overall_progress_pct}%, Completed: {roadmap.completed_steps}/{roadmap.total_steps}")
        assert roadmap.total_steps == 10
        assert len(roadmap.steps) == 10

        # Step 1 should be current / action required because state & district are missing
        step1 = roadmap.steps[0]
        assert step1.id == "profile"
        assert step1.status in ("current", "needs_update")
        assert len(step1.missing_requirements) > 0
        assert "District" in step1.missing_requirements and "State" in step1.missing_requirements

        # Future steps like DPR and Financing should be pending / locked
        step7 = roadmap.steps[6] # DPR
        assert step7.id == "dpr"
        assert step7.status == "pending"
        assert step7.is_locked is True

    finally:
        db.close()


def test_03_dynamic_roadmap_progressive_user():
    """Verify dynamic roadmap updates when user has completed assessment, finance, and DPR."""
    db = SessionLocal()
    try:
        uname = f"test_prog_{uuid.uuid4().hex[:6]}"
        user = User(
            name="Progressive Farmer",
            email=f"{uname}@test.com",
            phone=f"98{uuid.uuid4().int % 100000000:08d}",
            hashed_password=hash_password("password123"),
            state="Gujarat",
            district="Anand",
            social_category="OBC",
            education="Graduate",
            occupation="Agriculture",
            capital=250000,
            experience="3-5 years",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Add Assessment
        asm = Assessment(
            user_id=user.id,
            business_interest="Dairy Farming",
            location="Anand, Gujarat",
            capital=300000,
            status="completed",
        )
        db.add(asm)

        # Add Finance
        fin = Finance(
            user_id=user.id,
            business_type="dairy",
            business_name="Dairy Farming",
            project_cost=1000000,
            user_capital=250000,
            loan_amount=750000,
            margin_pct=25.0,
            interest_rate=9.5,
            loan_tenure=60,
            moratorium=0,
            emi=15750,
            subsidy_amount=0,
            subsidy_percentage=0.0,
            matched_scheme_name="PMMY",
            expected_monthly_revenue=70000,
            monthly_expenses=35000,
            monthly_profit=19250,
            annual_revenue=840000,
            annual_profit=231000,
            annual_debt_obligation=189000,
            annual_cfads=420000,
            dscr=2.22,
            break_even_month=13,
            roi=23.1,
            status="completed",
        )
        db.add(fin)

        # Add DPR
        dpr = DPR(
            user_id=user.id,
            business_type="dairy",
            business_name="Dairy Farming",
            status="generated",
            report_data={"sections": ["1", "2"]},
        )
        db.add(dpr)
        db.commit()

        roadmap = roadmap_service.evaluate_user_roadmap(db, user)

        print(f"\n[ROADMAP PROGRESSIVE] Progress: {roadmap.overall_progress_pct}%, Completed: {roadmap.completed_steps}/{roadmap.total_steps}")
        assert roadmap.completed_steps >= 5
        assert roadmap.overall_progress_pct >= 50
        assert roadmap.business_name == "Dairy Farming"

        # Check completed status on profile, assessment, select_business, finance, dpr
        step_dict = {s.id: s for s in roadmap.steps}
        assert step_dict["profile"].status == "completed"
        assert step_dict["assessment"].status == "completed"
        assert step_dict["select_business"].status == "completed"
        assert step_dict["finance"].status == "completed"
        assert step_dict["dpr"].status == "completed"

    finally:
        db.close()


def test_04_what_if_simulation_recalculation_and_stress_testing():
    """Verify What-If simulation recalculates metrics accurately using existing finance and risk logic."""
    # Baseline Scenario
    baseline_req = SimulationRequest(
        business_type="dairy",
        project_cost=1000000.0,
        user_capital=200000.0,
        loan_amount=800000.0,
        revenue_multiplier=1.0,
        expense_multiplier=1.0,
    )
    baseline_res = simulation_service.simulate_scenario(baseline_req)

    print(f"\n[SIMULATION BASELINE] Profit: ₹{baseline_res.monthly_profit}, EMI: ₹{baseline_res.emi}, DSCR: {baseline_res.dscr}x")
    assert baseline_res.project_cost == 1000000.0
    assert baseline_res.user_capital == 200000.0
    assert baseline_res.loan_amount == 800000.0
    assert baseline_res.monthly_revenue > 0
    assert baseline_res.monthly_profit > 0
    assert baseline_res.dscr > 0
    assert baseline_res.break_even_month > 0
    assert len(baseline_res.assumptions) >= 4
    assert baseline_res.risk_summary is not None
    assert len(baseline_res.risk_summary["factors"]) == 8

    # Stressed Scenario: Revenue down 20% (0.8x), Expenses up 15% (1.15x)
    stress_req = SimulationRequest(
        business_type="dairy",
        project_cost=1000000.0,
        user_capital=200000.0,
        loan_amount=800000.0,
        revenue_multiplier=0.8,
        expense_multiplier=1.15,
    )
    stress_res = simulation_service.simulate_scenario(stress_req)

    print(f"[SIMULATION STRESSED] Profit: ₹{stress_res.monthly_profit}, EMI: ₹{stress_res.emi}, DSCR: {stress_res.dscr}x")
    # Stressed revenue must be lower than baseline
    assert stress_res.monthly_revenue < baseline_res.monthly_revenue
    # Stressed expenses must be higher than baseline
    assert stress_res.monthly_expenses > baseline_res.monthly_expenses
    # Stressed profit must be lower
    assert stress_res.monthly_profit < baseline_res.monthly_profit
    # DSCR under stress should be lower
    assert stress_res.dscr < baseline_res.dscr


def test_05_what_if_simulation_capital_margin_and_scale():
    """Verify What-If simulation responds correctly to different scales and capital margin ratios."""
    # Small Scale (₹2 Lakh)
    small_req = SimulationRequest(
        business_type="retail",
        project_cost=200000.0,
        user_capital=50000.0,
    )
    small_res = simulation_service.simulate_scenario(small_req)

    # Medium Scale (₹10 Lakh)
    med_req = SimulationRequest(
        business_type="retail",
        project_cost=1000000.0,
        user_capital=250000.0,
    )
    med_res = simulation_service.simulate_scenario(med_req)

    print(f"\n[SCALE TEST] Retail ₹2L -> Revenue: ₹{small_res.monthly_revenue}, EMI: ₹{small_res.emi}")
    print(f"[SCALE TEST] Retail ₹10L -> Revenue: ₹{med_res.monthly_revenue}, EMI: ₹{med_res.emi}")

    assert med_res.monthly_revenue > small_res.monthly_revenue
    assert med_res.emi > small_res.emi
    assert med_res.loan_amount == 750000.0
    assert small_res.loan_amount == 150000.0


def test_06_side_by_side_scenario_comparison():
    """Verify side-by-side comparison between different businesses (Dairy vs Poultry)."""
    scenarios = [
        SimulationRequest(
            business_type="dairy",
            project_cost=800000.0,
            user_capital=150000.0,
            label="Dairy Farming (₹8.0L Outlay)",
        ),
        SimulationRequest(
            business_type="poultry",
            project_cost=800000.0,
            user_capital=150000.0,
            label="Poultry Farming (₹8.0L Outlay)",
        ),
    ]

    compare_req = ScenarioCompareRequest(scenarios=scenarios)
    compare_res = simulation_service.compare_scenarios(compare_req)

    print(f"\n[SCENARIO COMPARE] Total Scenarios: {len(compare_res.scenarios)}")
    print(f"[SCENARIO COMPARE] Recommended: {compare_res.recommended_scenario_label}")
    print(f"[SCENARIO COMPARE] Insights: {compare_res.insights}")

    assert len(compare_res.scenarios) == 2
    assert len(compare_res.comparison_table) >= 8
    assert len(compare_res.insights) >= 2
    assert compare_res.recommended_scenario_label is not None

    # Check key comparison metrics exist in table
    metrics_in_table = [row["Metric"] for row in compare_res.comparison_table]
    assert "Total Project Cost" in metrics_in_table
    assert "Net Monthly Profit (After EMI)" in metrics_in_table
    assert "Debt Service Coverage Ratio (DSCR)" in metrics_in_table
    assert "Annual Return on Investment (ROI)" in metrics_in_table


def test_07_api_journey_roadmap_endpoint():
    """Verify GET /api/journey/roadmap endpoint through TestClient."""
    db = SessionLocal()
    try:
        uname = f"test_api_road_{uuid.uuid4().hex[:6]}"
        user = User(
            name="API Roadmap User",
            email=f"{uname}@test.com",
            phone=f"98{uuid.uuid4().int % 100000000:08d}",
            hashed_password=hash_password("secret123"),
            state="Maharashtra",
            district="Pune",
            social_category="General",
            education="Post Graduate",
            occupation="Business",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = create_access_token(user.id)
    finally:
        db.close()

    client = TestClient(app)
    response = client.get(
        "/api/journey/roadmap",
        headers={"Authorization": f"Bearer {token}"},
    )
    print(f"\n[API GET /api/journey/roadmap] Status: {response.status_code}")
    assert response.status_code == 200
    data = response.json()
    assert data["total_steps"] == 10
    assert "overall_progress_pct" in data
    assert len(data["steps"]) == 10
    assert data["steps"][0]["id"] == "profile"


def test_08_api_simulation_and_comparison_endpoints():
    """Verify POST /api/finance/simulate and POST /api/finance/simulate/compare through TestClient."""
    client = TestClient(app)

    # 1. Simulate Single Scenario
    sim_payload = {
        "business_type": "dairy",
        "project_cost": 500000.0,
        "user_capital": 100000.0,
        "revenue_multiplier": 1.0,
        "expense_multiplier": 1.0,
    }
    sim_resp = client.post("/api/finance/simulate", json=sim_payload)
    print(f"\n[API POST /api/finance/simulate] Status: {sim_resp.status_code}")
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["business_type"] == "dairy"
    assert sim_data["project_cost"] == 500000.0
    assert sim_data["loan_amount"] == 400000.0
    assert "monthly_profit" in sim_data
    assert "dscr" in sim_data
    assert "assumptions" in sim_data
    assert len(sim_data["assumptions"]) > 0

    # 2. Compare Multiple Scenarios
    comp_payload = {
        "scenarios": [
            {
                "business_type": "dairy",
                "project_cost": 500000.0,
                "user_capital": 100000.0,
                "label": "Small Scale Dairy (₹5L)",
            },
            {
                "business_type": "dairy",
                "project_cost": 1000000.0,
                "user_capital": 200000.0,
                "label": "Commercial Dairy (₹10L)",
            },
        ]
    }
    comp_resp = client.post("/api/finance/simulate/compare", json=comp_payload)
    print(f"[API POST /api/finance/simulate/compare] Status: {comp_resp.status_code}")
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert len(comp_data["scenarios"]) == 2
    assert "comparison_table" in comp_data
    assert len(comp_data["insights"]) > 0
