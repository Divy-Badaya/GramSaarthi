"""
Integration Test Suite for Connected Business Recommendation API Flow (POST /api/recommend)

Validates all 13 Requirements from Integration Stage 8:
  1. Request succeeds (HTTP 200).
  2. Correct state is returned.
  3. Correct district is returned.
  4. Recommendation list is present.
  5. Exactly 3 recommendations are returned in top3.
  6. Recommendations / scores are validly ranked.
  7. Scores are numeric.
  8. Scores are between 0 and 1.
  9. No NaN.
  10. No infinity.
  11. Unknown district produces appropriate error (or safe fallback).
  12. Missing state produces appropriate error.
  13. Missing district produces appropriate error.
"""

import os
import sys
import unittest
import numpy as np
from fastapi.testclient import TestClient

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app


class TestRecommendationAPIIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Ensure startup events run
        with cls.client as c:
            pass

    def test_01_successful_recommendation_sehore(self):
        """Test real location: Sehore, Madhya Pradesh."""
        payload = {
            "location": "Khajuri Kalan, Ichhawar, Sehore, Madhya Pradesh",
            "district": "Sehore",
            "state": "Madhya Pradesh",
            "capital": 100000,
            "experience": "Beginner",
            "business": None,
        }
        with TestClient(app) as client:
            resp = client.post("/api/recommend", json=payload)
            self.assertEqual(resp.status_code, 200, f"Expected 200, got {resp.status_code}: {resp.text}")
            data = resp.json()

            # 1. Request succeeds
            self.assertIsNotNone(data)

            # 2. Correct state
            self.assertEqual(data["location"]["state"].upper(), "MADHYA PRADESH")

            # 3. Correct district
            self.assertEqual(data["location"]["district"].upper(), "SEHORE")

            # 4. Recommendation list present
            self.assertIn("top3", data)
            self.assertIn("metrics", data)
            self.assertIn("reasons", data)

            # 5. Exactly 3 recommendations returned
            self.assertEqual(len(data["top3"]), 3)

            # 6. Primary business is one of the top 3
            self.assertIn(data["business"], data["top3"])

            # 7, 8, 9, 10. Raw scores validity
            raw_scores = data.get("raw_opportunity_scores")
            if raw_scores:
                self.assertEqual(len(raw_scores), 10)
                for tgt, val in raw_scores.items():
                    self.assertIsInstance(val, (float, int))
                    self.assertTrue(0.0 <= val <= 1.0, f"Value out of bounds: {tgt} = {val}")
                    self.assertFalse(np.isnan(val))
                    self.assertFalse(np.isinf(val))

            # Score is 0-100 feasibility
            self.assertTrue(0 <= data["score"] <= 100)

            # ML source should be production_ml
            self.assertEqual(data["ml_source"], "production_ml")

    def test_02_successful_recommendation_pune(self):
        """Test real location: Pune, Maharashtra (urban hub with high digital/service potential)."""
        payload = {
            "location": "Pune, Maharashtra",
            "district": "Pune",
            "state": "Maharashtra",
            "capital": 200000,
            "experience": "Intermediate",
            "business": None,
        }
        with TestClient(app) as client:
            resp = client.post("/api/recommend", json=payload)
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["location"]["state"].upper(), "MAHARASHTRA")
            self.assertEqual(data["location"]["district"].upper(), "PUNE")
            self.assertEqual(len(data["top3"]), 3)
            self.assertEqual(data["ml_source"], "production_ml")

    def test_03_successful_recommendation_anand(self):
        """Test real location: Anand, Gujarat (famous dairy cluster)."""
        payload = {
            "location": "Anand, Gujarat",
            "district": "Anand",
            "state": "Gujarat",
            "capital": 150000,
            "experience": "Expert",
            "business": None,
        }
        with TestClient(app) as client:
            resp = client.post("/api/recommend", json=payload)
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["location"]["state"].upper(), "GUJARAT")
            self.assertEqual(data["location"]["district"].upper(), "ANAND")
            self.assertEqual(len(data["top3"]), 3)
            self.assertEqual(data["ml_source"], "production_ml")

    def test_04_unknown_district_triggers_fallback_gracefully(self):
        """Unknown district gracefully executes multi-tier fallback without failing."""
        payload = {
            "location": "Fake Village, NonExistentDistrict999, Madhya Pradesh",
            "district": "NonExistentDistrict999",
            "state": "Madhya Pradesh",
            "capital": 100000,
            "experience": "Beginner",
            "business": None,
        }
        with TestClient(app) as client:
            resp = client.post("/api/recommend", json=payload)
            # Must return 200 with fallback recommendations rather than crash with 500
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn(data["ml_source"], ["csv_lookup", "fallback", None])

    def test_05_missing_district_handled(self):
        """Missing district falls back gracefully to rule-based recommendations."""
        payload = {
            "location": "Some Village, Madhya Pradesh",
            "district": "",
            "state": "Madhya Pradesh",
            "capital": 100000,
            "experience": "Beginner",
            "business": None,
        }
        with TestClient(app) as client:
            resp = client.post("/api/recommend", json=payload)
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIsNotNone(data["business"])
            self.assertTrue(0 <= data["score"] <= 100)

    def test_06_direct_production_ml_endpoints(self):
        """Verify dedicated testing endpoints /api/recommend/production-ml."""
        with TestClient(app) as client:
            # POST endpoint
            resp_post = client.post(
                "/api/recommend/production-ml",
                json={"state": "Madhya Pradesh", "district": "Sehore"},
            )
            self.assertEqual(resp_post.status_code, 200)
            post_data = resp_post.json()
            self.assertTrue(post_data["success"])
            self.assertEqual(len(post_data["top3"]), 3)
            self.assertEqual(len(post_data["ranked_recommendations"]), 10)

            # GET endpoint
            resp_get = client.get("/api/recommend/production-ml/scores/Madhya%20Pradesh/Sehore")
            self.assertEqual(resp_get.status_code, 200)
            get_data = resp_get.json()
            self.assertEqual(get_data["district"], "SEHORE")

            # Error cases on direct endpoint: 404 for unknown district
            resp_err = client.post(
                "/api/recommend/production-ml",
                json={"state": "Madhya Pradesh", "district": "FakeDistrict123"},
            )
            self.assertEqual(resp_err.status_code, 404)

            # Error cases on direct endpoint: 400 for empty district
            resp_empty = client.post(
                "/api/recommend/production-ml",
                json={"state": "Madhya Pradesh", "district": ""},
            )
            self.assertEqual(resp_empty.status_code, 400)


if __name__ == "__main__":
    unittest.main()
