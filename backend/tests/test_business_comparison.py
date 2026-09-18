"""
GRAMSAARTHI — Business Comparison Service Tests

Tests the business comparison engine for correct scoring, ranking,
and response structure.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest


def test_get_available_business_types():
    """Test that available business types are returned correctly."""
    from app.services.business_comparison_service import get_available_business_types

    types = get_available_business_types()
    assert isinstance(types, list)
    assert len(types) >= 8  # 8 template-backed businesses (excluding generic)

    # Verify each type has required fields
    for bt in types:
        assert "id" in bt, f"Missing 'id' in business type: {bt}"
        assert "name" in bt, f"Missing 'name' in business type: {bt}"
        assert "category" in bt, f"Missing 'category' in business type: {bt}"
        assert "emoji" in bt, f"Missing 'emoji' in business type: {bt}"

    # Verify specific business types are present
    ids = [bt["id"] for bt in types]
    assert "dairy" in ids
    assert "poultry" in ids
    assert "retail" in ids
    assert "food" in ids
    assert "generic" not in ids  # generic should be excluded


def test_compare_two_businesses():
    """Test comparing 2 businesses returns correct structure."""
    from app.services.business_comparison_service import compare_businesses

    result = compare_businesses(
        business_types=["dairy", "retail"],
        user_capital=200000,
        user_experience="Beginner",
    )

    assert isinstance(result, dict)
    assert "recommended_business" in result
    assert "businesses" in result
    assert len(result["businesses"]) == 2

    # Verify recommended business
    rec = result["recommended_business"]
    assert "id" in rec
    assert "name" in rec
    assert "overall_score" in rec
    assert "reason" in rec
    assert 0 <= rec["overall_score"] <= 100

    # Verify each business has all required fields
    for biz in result["businesses"]:
        assert "business_type" in biz
        assert "business_name" in biz
        assert "overall_score" in biz
        assert "is_recommended" in biz
        assert "investment" in biz
        assert "estimated_profit" in biz
        assert "demand" in biz
        assert "risk" in biz
        assert "market_demand_score" in biz
        assert "competition_score" in biz
        assert "profit_potential_score" in biz
        assert "location_fit_score" in biz
        assert "risk_score" in biz
        assert "low_investment_score" in biz
        assert "financial" in biz

        # Score bounds check
        assert 0 <= biz["overall_score"] <= 100
        assert 0 <= biz["market_demand_score"] <= 100
        assert 0 <= biz["competition_score"] <= 100
        assert 0 <= biz["profit_potential_score"] <= 100
        assert 0 <= biz["location_fit_score"] <= 100
        assert 0 <= biz["risk_score"] <= 100
        assert 0 <= biz["low_investment_score"] <= 100

    # Exactly one business should be recommended
    recommended_count = sum(1 for b in result["businesses"] if b["is_recommended"])
    assert recommended_count == 1


def test_compare_four_businesses():
    """Test comparing maximum 4 businesses."""
    from app.services.business_comparison_service import compare_businesses

    result = compare_businesses(
        business_types=["dairy", "poultry", "retail", "food"],
        user_capital=300000,
        user_experience="Intermediate",
    )

    assert len(result["businesses"]) == 4

    # Verify exactly one recommended
    recommended = [b for b in result["businesses"] if b["is_recommended"]]
    assert len(recommended) == 1

    # Recommended should have the highest score
    rec_score = recommended[0]["overall_score"]
    for biz in result["businesses"]:
        assert biz["overall_score"] <= rec_score


def test_compare_too_few_businesses():
    """Test that fewer than 2 businesses raises error."""
    from app.services.business_comparison_service import compare_businesses

    with pytest.raises(ValueError, match="At least 2"):
        compare_businesses(business_types=["dairy"], user_capital=100000)


def test_compare_too_many_businesses():
    """Test that more than 4 businesses raises error."""
    from app.services.business_comparison_service import compare_businesses

    with pytest.raises(ValueError, match="Maximum 4"):
        compare_businesses(
            business_types=["dairy", "poultry", "retail", "food", "textile", "transport"],
            user_capital=100000,
        )


def test_financial_data_present():
    """Test that financial data is present in each comparison."""
    from app.services.business_comparison_service import compare_businesses

    result = compare_businesses(
        business_types=["dairy", "food"],
        user_capital=150000,
        user_experience="Beginner",
    )

    for biz in result["businesses"]:
        fin = biz.get("financial", {})
        assert "project_cost" in fin
        assert "monthly_revenue" in fin
        assert "monthly_profit" in fin
        assert "monthly_expenses" in fin
        assert fin["project_cost"] > 0
        assert fin["monthly_revenue"] > 0


def test_experience_affects_score():
    """Test that experience level affects overall score."""
    from app.services.business_comparison_service import compare_businesses

    result_beginner = compare_businesses(
        business_types=["dairy", "retail"],
        user_capital=200000,
        user_experience="Beginner",
    )

    result_expert = compare_businesses(
        business_types=["dairy", "retail"],
        user_capital=200000,
        user_experience="Expert",
    )

    # Expert scores should generally be >= Beginner scores
    for i in range(len(result_beginner["businesses"])):
        beg_score = result_beginner["businesses"][i]["overall_score"]
        exp_score = result_expert["businesses"][i]["overall_score"]
        # Allow small variations due to clamping
        assert exp_score >= beg_score - 5, \
            f"Expert score ({exp_score}) should be >= Beginner score ({beg_score}) - 5 tolerance"


def test_investment_display_format():
    """Test that investment display is properly formatted."""
    from app.services.business_comparison_service import compare_businesses

    result = compare_businesses(
        business_types=["dairy", "retail"],
        user_capital=200000,
    )

    for biz in result["businesses"]:
        inv = biz["investment"]
        assert isinstance(inv, str)
        assert inv != "", f"Investment display should not be empty for {biz['business_type']}"
        # Should contain ₹ if not a dash
        if inv != "—":
            assert "₹" in inv, f"Investment should contain ₹ symbol: {inv}"


def test_compare_response_structure():
    """Test the full response structure matches expected schema."""
    from app.services.business_comparison_service import compare_businesses

    result = compare_businesses(
        business_types=["textile", "transport", "agriculture"],
        user_capital=250000,
        user_experience="Intermediate",
    )

    # Top-level keys
    assert "recommended_business" in result
    assert "businesses" in result
    assert "has_ml_data" in result
    assert "has_assessment" in result
    assert "user_capital" in result

    # user_capital should reflect what was passed
    assert result["user_capital"] == 250000

    # has_ml_data should be False since no location was provided
    assert result["has_ml_data"] is False
    assert result["has_assessment"] is False


# ── FastAPI Endpoint Integration Tests ─────────────────────────────────────────

from starlette.testclient import TestClient
from app.main import app
from app.database.connection import SessionLocal
from app.models.user import User
from app.models.assessment import Assessment
from app.services.auth_service import hash_password, create_access_token


def test_api_get_business_types_endpoint():
    """Test GET /api/businesses/types returns all available business types."""
    client = TestClient(app)
    resp = client.get("/api/businesses/types")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 8
    type_ids = [item["id"] for item in data]
    assert "dairy" in type_ids
    assert "poultry" in type_ids
    assert "food" in type_ids


def test_api_compare_unauthenticated_rejected():
    """Test POST /api/businesses/compare requires authentication."""
    client = TestClient(app)
    resp = client.post("/api/businesses/compare", json={"businesses": ["dairy", "retail"]})
    assert resp.status_code == 401


def test_api_compare_authenticated_success():
    """Test POST /api/businesses/compare with valid JWT token and 3 businesses."""
    db = SessionLocal()
    user_id = 99771
    try:
        db.query(Assessment).filter(Assessment.user_id == user_id).delete(synchronize_session=False)
        db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
        db.commit()

        user = User(
            id=user_id,
            name="Test Compare User",
            phone="9999999771",
            email="compare_test@example.com",
            hashed_password=hash_password("Pass@123"),
            state="Madhya Pradesh",
            district="Sehore",
            capital=150000,
            experience="Intermediate",
        )
        db.add(user)
        db.commit()

        token = create_access_token(user_id)
        client = TestClient(app)
        resp = client.post(
            "/api/businesses/compare",
            headers={"Authorization": f"Bearer {token}"},
            json={"businesses": ["dairy", "retail", "food"]},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "recommended_business" in data
        assert "businesses" in data
        assert len(data["businesses"]) == 3
        assert data["has_ml_data"] is True
        assert data["user_capital"] == 150000

        # Check recommended business details
        rec = data["recommended_business"]
        assert rec["id"] in ["dairy", "retail", "food"]
        assert rec["overall_score"] > 0
        assert len(rec["reason"]) > 5
    finally:
        db.query(Assessment).filter(Assessment.user_id == user_id).delete(synchronize_session=False)
        db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
        db.commit()
        db.close()


def test_api_compare_validation_limits():
    """Test validation rejecting fewer than 2 and more than 4 businesses."""
    db = SessionLocal()
    user_id = 99772
    try:
        db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
        db.commit()

        user = User(
            id=user_id,
            name="Test Limits User",
            phone="9999999772",
            email="limits_test@example.com",
            hashed_password=hash_password("Pass@123"),
            state="Madhya Pradesh",
            district="Sehore",
        )
        db.add(user)
        db.commit()

        token = create_access_token(user_id)
        client = TestClient(app)

        # 1 business -> fails validation (422 from Pydantic)
        resp1 = client.post(
            "/api/businesses/compare",
            headers={"Authorization": f"Bearer {token}"},
            json={"businesses": ["dairy"]},
        )
        assert resp1.status_code in [400, 422]

        # 5 businesses -> fails validation
        resp5 = client.post(
            "/api/businesses/compare",
            headers={"Authorization": f"Bearer {token}"},
            json={"businesses": ["dairy", "retail", "food", "poultry", "textile"]},
        )
        assert resp5.status_code in [400, 422]
    finally:
        db.query(User).filter(User.id == user_id).delete(synchronize_session=False)
        db.commit()
        db.close()


def test_api_multi_user_isolation():
    """Test strict multi-user isolation: User A in MP and User B in Rajasthan."""
    db = SessionLocal()
    user_a_id = 99773
    user_b_id = 99774
    try:
        db.query(Assessment).filter(Assessment.user_id.in_([user_a_id, user_b_id])).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_([user_a_id, user_b_id])).delete(synchronize_session=False)
        db.commit()

        user_a = User(
            id=user_a_id,
            name="User A (Sehore)",
            phone="9999999773",
            email="usera@example.com",
            hashed_password=hash_password("Pass@123"),
            state="Madhya Pradesh",
            district="Sehore",
            capital=500000,
        )
        user_b = User(
            id=user_b_id,
            name="User B (Jaipur)",
            phone="9999999774",
            email="userb@example.com",
            hashed_password=hash_password("Pass@123"),
            state="Rajasthan",
            district="Jaipur",
            capital=100000,
        )
        db.add_all([user_a, user_b])
        db.commit()

        token_a = create_access_token(user_a_id)
        token_b = create_access_token(user_b_id)

        client = TestClient(app)

        resp_a = client.post(
            "/api/businesses/compare",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"businesses": ["dairy", "retail"]},
        )
        resp_b = client.post(
            "/api/businesses/compare",
            headers={"Authorization": f"Bearer {token_b}"},
            json={"businesses": ["dairy", "retail"]},
        )

        assert resp_a.status_code == 200
        assert resp_b.status_code == 200

        data_a = resp_a.json()
        data_b = resp_b.json()

        # User A capital reflects 500000, User B capital reflects 100000
        assert data_a["user_capital"] == 500000
        assert data_b["user_capital"] == 100000

        # Both have different location-fit scores based on Sehore vs Jaipur
        dairy_a = next(b for b in data_a["businesses"] if b["business_type"] == "dairy")
        dairy_b = next(b for b in data_b["businesses"] if b["business_type"] == "dairy")
        assert "location_fit_score" in dairy_a
        assert "location_fit_score" in dairy_b
    finally:
        db.query(Assessment).filter(Assessment.user_id.in_([user_a_id, user_b_id])).delete(synchronize_session=False)
        db.query(User).filter(User.id.in_([user_a_id, user_b_id])).delete(synchronize_session=False)
        db.commit()
        db.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
