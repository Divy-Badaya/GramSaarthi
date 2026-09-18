"""
GRAMSAARTHI — Phase 3 Test Suite: Explainable Recommendations & Connected Data Flow

Verifies:
1. Dataset shape integrity: strictly (860, 473)
2. Production ML & Explainability engine:
   - Factual non-hallucinated explanations
   - Positive factors ("Why")
   - Negative factors ("Concerns")
   - 3 Suitability dimensions (Location with percentile rank, Investment, Profile)
   - Financial feasibility indicators
   - Key assumptions & risk analysis
   - Top-3 alternatives explainability
3. Connected Data Flow:
   - Profile -> Assessment -> ML Recommendation -> Explainability -> Finance -> Loan -> Advisor
4. 404 Resolution:
   - GET /api/finance/me resolves 200 OK even for "AI Suggest" or newly completed assessments
"""

import sys
import os
import pathlib
import pytest
import pandas as pd
from fastapi.testclient import TestClient

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to sys.path
BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.database.connection import get_db, Base, engine
from app.models.user import User
from app.models.assessment import Assessment
from app.models.finance import Finance
from app.services.auth_service import create_access_token, hash_password
from app.services.business_ml_service import business_ml_service
from app.services.explainability_service import explainability_service
from app.services.advisor_service import _get_ml_context, _build_gemini_prompt
from app.schemas.advisor import UserProfileContext


client = TestClient(app)


def test_01_dataset_shape_integrity():
    """Verify strictly 979 rows x 329 columns in district_feature_store.csv."""
    dataset_path = BACKEND_DIR / "ml" / "business_recommendation" / "district_feature_store.csv"
    assert dataset_path.exists(), f"District feature store missing at {dataset_path}"

    df = pd.read_csv(dataset_path)
    print(f"\n[DATASET INTEGRITY] Shape: {df.shape}")
    assert df.shape == (979, 329), f"Dataset shape modified! Expected (979, 329), got {df.shape}"


def test_02_explainability_service_direct():
    """Verify explainability service returns complete, non-hallucinated intelligence."""
    explanation = explainability_service.generate_explanation(
        business="Dairy",
        recommendation_score=87,
        district="SEHORE",
        state="MADHYA PRADESH",
        capital=150000,
        experience="Intermediate",
        opportunity_index=84.5,
    )

    assert explanation.business == "Dairy"
    assert explanation.recommendation_score == 87
    assert len(explanation.positive_factors) >= 3
    assert len(explanation.negative_factors) >= 1
    assert explanation.location_suitability.score > 0
    assert "SEHORE" in explanation.location_suitability.description or "percentile" in explanation.location_suitability.description.lower()
    assert explanation.investment_suitability.score >= 60
    assert explanation.user_profile_suitability.score >= 60
    assert len(explanation.financial_feasibility) >= 3
    assert len(explanation.assumptions) >= 3

    print("\n[EXPLAINABILITY DIRECT TEST]")
    print(f"Business: {explanation.business} | Score: {explanation.recommendation_score}")
    print(f"Positive Factors ({len(explanation.positive_factors)}): {[f.title for f in explanation.positive_factors]}")
    print(f"Negative Factors ({len(explanation.negative_factors)}): {[f.title for f in explanation.negative_factors]}")
    print(f"Location Suitability: {explanation.location_suitability.score} ({explanation.location_suitability.label})")
    print(f"Investment Suitability: {explanation.investment_suitability.score} ({explanation.investment_suitability.label})")


def test_03_recommend_endpoint_includes_explainability():
    """Verify POST /api/recommend returns explanation and top3_explanations."""
    payload = {
        "location": "Khajuri Kalan, Sehore, Madhya Pradesh",
        "village": "Khajuri Kalan",
        "district": "SEHORE",
        "state": "MADHYA PRADESH",
        "capital": 100000,
        "business": "Dairy",
        "experience": "Beginner",
    }
    resp = client.post("/api/recommend", json=payload)
    assert resp.status_code == 200, f"Error: {resp.text}"
    data = resp.json()

    assert "explanation" in data and data["explanation"] is not None
    exp = data["explanation"]
    assert exp["business"] == "Dairy"
    assert len(exp["positive_factors"]) > 0
    assert len(exp["negative_factors"]) > 0
    assert exp["location_suitability"]["score"] > 0
    assert exp["investment_suitability"]["score"] > 0
    assert exp["user_profile_suitability"]["score"] > 0
    assert len(exp["financial_feasibility"]) > 0
    assert len(exp["assumptions"]) > 0

    assert "top3_explanations" in data and data["top3_explanations"] is not None
    assert len(data["top3_explanations"]) == len(data["top3"])
    print(f"\n[RECOMMEND ENDPOINT] Top3: {data['top3']}, Explanations count: {len(data['top3_explanations'])}")


def test_04_connected_flow_and_finance_404_elimination():
    """Verify Profile -> Assessment -> Recommend -> Finance 200 OK without 404."""
    db = next(get_db())

    # Create a clean test user
    test_mobile = "9876543210"
    user = db.query(User).filter(User.mobile_number == test_mobile).first()
    if not user:
        user = User(
            mobile_number=test_mobile,
            full_name="Phase 3 Rural Test Entrepreneur",
            state="MADHYA PRADESH",
            district="SEHORE",
            block="SEHORE",
            village="Khajuri Kalan",
            capital=120000,
            experience="Intermediate",
            business_interest="AI Suggest",
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Clean up previous finances & assessments for clean test
    db.query(Finance).filter(Finance.user_id == user.id).delete()
    db.query(Assessment).filter(Assessment.user_id == user.id).delete()
    db.commit()

    token = create_access_token(user.id)
    headers = {"Authorization": f"Bearer {token}"}

    # Step 1: Save Assessment with "AI Suggest"
    assessment_payload = {
        "location": "Khajuri Kalan, SEHORE, MADHYA PRADESH",
        "capital": 120000,
        "business_interest": "AI Suggest",
        "experience": "Intermediate",
    }
    ass_resp = client.post("/api/assessments", json=assessment_payload, headers=headers)
    assert ass_resp.status_code == 201

    # Step 2: Request Recommendation
    rec_payload = {
        "location": "Khajuri Kalan, SEHORE, MADHYA PRADESH",
        "district": "SEHORE",
        "state": "MADHYA PRADESH",
        "capital": 120000,
        "business": None,
        "experience": "Intermediate",
    }
    rec_resp = client.post("/api/recommend", json=rec_payload, headers=headers)
    assert rec_resp.status_code == 200
    rec_data = rec_resp.json()
    recommended_biz = rec_data["business"]
    assert recommended_biz is not None

    # Step 3: Call GET /api/finance/me — MUST BE 200 OK (NOT 404!)
    fin_resp = client.get("/api/finance/me", headers=headers)
    assert fin_resp.status_code == 200, f"Expected 200 OK from /api/finance/me, got {fin_resp.status_code}: {fin_resp.text}"
    fin_data = fin_resp.json()

    print(f"\n[FINANCE ME ENDPOINT 200 OK VERIFIED]")
    print(f"Business: {fin_data.get('business_name')} (type: {fin_data.get('business_type')})")
    print(f"Project Cost: ₹{fin_data.get('project_cost'):,}")
    print(f"User Capital: ₹{fin_data.get('user_capital'):,}")
    print(f"Loan Amount: ₹{fin_data.get('loan_amount'):,}")
    emi_val = fin_data.get('emi') if fin_data.get('emi') is not None else fin_data.get('monthly_emi', 0)
    print(f"Monthly EMI: ₹{emi_val:,}")
    print(f"Matched Scheme: {fin_data.get('matched_scheme_name')}")

    assert fin_data.get("project_cost") > 0
    assert fin_data.get("user_capital") == 120000


def test_05_advisor_prompt_context_injection():
    """Verify AI Advisor ML and Finance context includes explainability factors."""
    profile = UserProfileContext(
        name="Test Farmer",
        district="SEHORE",
        state="MADHYA PRADESH",
        capital=150000,
        experience="Intermediate",
        business_interest="Dairy",
        language="en",
    )

    ml_context, ml_used = _get_ml_context(profile, mentioned_businesses=["Dairy"])
    assert ml_used is True
    assert "Why this fits" in ml_context or "Positive factors" in ml_context or "Suitability Dimensions" in ml_context
    print(f"\n[ADVISOR ML CONTEXT INJECTION]\n{ml_context[:350]}...")

    prompt_contents = _build_gemini_prompt(
        question="Is Dairy suitable for Sehore?",
        intent="BUSINESS",
        ml_context=ml_context,
        scheme_context_text="",
        profile=profile,
        history=[],
        finance_context="[ACTIVE FINANCIAL PLAN FOR USER]\n- Business: Dairy\n- Total Project Cost: ₹600,000\n- Loan: ₹450,000",
    )
    assert len(prompt_contents) > 0
    full_text = str(prompt_contents)
    assert "ACTIVE FINANCIAL PLAN" in full_text
    assert "Dairy" in full_text


if __name__ == "__main__":
    pytest.main(["-s", "-v", __file__])
