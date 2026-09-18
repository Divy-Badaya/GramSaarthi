"""
Comprehensive Backend Test Suite for Production Business ML Service

Validates Requirements A through Q:
  A. Model loads successfully.
  B. Feature list loads successfully (327 features).
  C. Exactly 10 targets are loaded.
  D. District feature store loads successfully (979 districts).
  E. A valid state + district produces a prediction.
  F. Prediction contains exactly 10 scores.
  G. Scores are numeric floats.
  H. No NaN values.
  I. No infinity values.
  J. Scores are within [0, 1].
  K. Recommendations are sorted descending by score.
  L. Exactly 3 top recommendations are returned.
  M. Invalid state is handled correctly.
  N. Invalid district is handled correctly.
  O. Missing state/district is handled correctly.
  P. Feature ordering is exactly the same as model_features.csv.
  Q. Model is not reloaded for every prediction (singleton pattern preserved).
"""

import os
import sys
import unittest
import numpy as np
import pandas as pd

# Ensure backend root is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.business_ml_service import (
    business_ml_service,
    BusinessMLService,
    InvalidLocationError,
    DistrictNotFoundError,
    TARGET_TO_BUSINESS,
)


class TestBusinessMLService(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Ensure the production ML service is loaded once for all tests."""
        business_ml_service.load()

    # ── Test A: Model Loads Successfully ──────────────────────────────────────
    def test_a_model_loads_successfully(self):
        """Verify model loads and is marked ready."""
        self.assertTrue(business_ml_service.is_loaded, f"Model failed to load: {business_ml_service.load_error}")
        self.assertIsNotNone(business_ml_service._model, "Model instance is None")

    # ── Test B: Feature List Loads Successfully ───────────────────────────────
    def test_b_feature_list_loads_successfully(self):
        """Verify feature list is loaded with exactly 327 features."""
        features = business_ml_service.features
        self.assertEqual(len(features), 327, f"Expected 327 features, got {len(features)}")
        self.assertEqual(features[0], "Lg_Dist_Code")
        self.assertEqual(features[-1], "opportunity_margin")

    # ── Test C: Exactly 10 Targets Are Loaded ─────────────────────────────────
    def test_c_exactly_10_targets_loaded(self):
        """Verify target list contains exactly the 10 domain targets."""
        targets = business_ml_service.targets
        self.assertEqual(len(targets), 10, f"Expected 10 targets, got {len(targets)}")
        expected_targets = [
            "agriculture_score", "dairy_score", "poultry_score", "retail_score",
            "food_business_score", "textile_score", "manufacturing_score",
            "digital_it_score", "healthcare_score", "logistics_score"
        ]
        self.assertEqual(targets, expected_targets)

    # ── Test D: District Feature Store Loads Successfully ─────────────────────
    def test_d_district_feature_store_loads(self):
        """Verify district feature store loads with 979 real Indian districts."""
        count = business_ml_service.district_count
        self.assertEqual(count, 979, f"Expected 979 districts, got {count}")

        # Verify critical identifier columns exist
        df = business_ml_service._feature_store_df
        self.assertIn("STATE", df.columns)
        self.assertIn("DISTRICT", df.columns)

    # ── Test E: Valid State + District Produces a Prediction ──────────────────
    def test_e_valid_state_and_district_prediction(self):
        """Verify inference succeeds on real districts from the feature store."""
        # Test location 1: SEHORE, MADHYA PRADESH
        res1 = business_ml_service.predict_district("Madhya Pradesh", "Sehore")
        self.assertTrue(res1["success"])
        self.assertEqual(res1["district"], "SEHORE")
        self.assertEqual(res1["state"], "MADHYA PRADESH")

        # Test location 2: PUNE, MAHARASHTRA
        res2 = business_ml_service.predict_district("MAHARASHTRA", "PUNE")
        self.assertTrue(res2["success"])
        self.assertEqual(res2["district"], "PUNE")

        # Test location 3: ANAND, GUJARAT
        res3 = business_ml_service.predict_district("Gujarat", "Anand")
        self.assertTrue(res3["success"])
        self.assertEqual(res3["district"], "ANAND")

    # ── Test F: Prediction Contains Exactly 10 Scores ─────────────────────────
    def test_f_prediction_contains_10_scores(self):
        """Verify prediction outputs contain scores for all 10 business sectors."""
        res = business_ml_service.predict_district("Madhya Pradesh", "Sehore")
        self.assertEqual(len(res["raw_scores"]), 10)
        self.assertEqual(len(res["scores_by_business"]), 10)
        self.assertEqual(len(res["ranked_recommendations"]), 10)

    # ── Test G: Scores Are Numeric ────────────────────────────────────────────
    def test_g_scores_are_numeric(self):
        """Verify all predicted values are Python floats / numeric types."""
        res = business_ml_service.predict_district("Madhya Pradesh", "Sehore")
        for target, val in res["raw_scores"].items():
            self.assertIsInstance(val, (float, int), f"Score for {target} is not numeric: {type(val)}")
        for item in res["ranked_recommendations"]:
            self.assertIsInstance(item["score"], (float, int))

    # ── Test H: No NaN Values ─────────────────────────────────────────────────
    def test_h_no_nan_values(self):
        """Verify zero NaN values in raw scores or ranked output."""
        res = business_ml_service.predict_district("Madhya Pradesh", "Sehore")
        for target, val in res["raw_scores"].items():
            self.assertFalse(np.isnan(val), f"Score for {target} is NaN")

    # ── Test I: No Infinity Values ────────────────────────────────────────────
    def test_i_no_infinity_values(self):
        """Verify zero infinite values in predictions."""
        res = business_ml_service.predict_district("Madhya Pradesh", "Sehore")
        for target, val in res["raw_scores"].items():
            self.assertFalse(np.isinf(val), f"Score for {target} is Inf")

    # ── Test J: Scores Are Within [0, 1] ──────────────────────────────────────
    def test_j_scores_within_zero_to_one(self):
        """Verify all opportunity scores are normalized within valid bounds [0.0, 1.0]."""
        test_locations = [
            ("MADHYA PRADESH", "SEHORE"),
            ("MAHARASHTRA", "NAGPUR"),
            ("ANDHRA PRADESH", "ANAKAPALLI"),
            ("RAJASTHAN", "JAIPUR"),
        ]
        for state, district in test_locations:
            res = business_ml_service.predict_district(state, district)
            for target, val in res["raw_scores"].items():
                self.assertGreaterEqual(val, 0.0, f"Score for {target} in {district} below 0.0: {val}")
                self.assertLessEqual(val, 1.0, f"Score for {target} in {district} above 1.0: {val}")

    # ── Test K: Recommendations Are Sorted Descending ─────────────────────────
    def test_k_recommendations_sorted_descending(self):
        """Verify ranked_recommendations list is strictly sorted in descending score order."""
        res = business_ml_service.predict_district("Madhya Pradesh", "Sehore")
        recs = res["ranked_recommendations"]
        scores = [item["score"] for item in recs]
        sorted_scores = sorted(scores, reverse=True)
        self.assertEqual(scores, sorted_scores, "Recommendations are not sorted descending by score")

        # Verify ranks match index
        for idx, item in enumerate(recs, start=1):
            self.assertEqual(item["rank"], idx, f"Rank mismatch at index {idx}")

    # ── Test L: Exactly 3 Top Recommendations Returned ────────────────────────
    def test_l_exactly_3_top_recommendations(self):
        """Verify top3 list contains exactly 3 distinct business categories."""
        res = business_ml_service.predict_district("Madhya Pradesh", "Sehore")
        top3 = res["top3"]
        self.assertEqual(len(top3), 3, f"Expected 3 recommendations, got {len(top3)}")
        self.assertEqual(len(set(top3)), 3, "Top 3 recommendations contain duplicates")
        # Ensure top3 match the first 3 in ranked_recommendations
        first_3_ranked = [item["business"] for item in res["ranked_recommendations"][:3]]
        self.assertEqual(top3, first_3_ranked)

    # ── Test M: Invalid State Is Handled Correctly ────────────────────────────
    def test_m_invalid_state_handled(self):
        """Verify invalid or non-existent state raises DistrictNotFoundError with clean message."""
        with self.assertRaises(DistrictNotFoundError) as ctx:
            business_ml_service.predict_district("NonExistentStateXYZ", "Sehore")
        self.assertIn("NonExistentStateXYZ", str(ctx.exception))

    # ── Test N: Invalid District Is Handled Correctly ─────────────────────────
    def test_n_invalid_district_handled(self):
        """Verify invalid or non-existent district raises DistrictNotFoundError."""
        with self.assertRaises(DistrictNotFoundError) as ctx:
            business_ml_service.predict_district("Madhya Pradesh", "FakeDistrict999")
        self.assertIn("FakeDistrict999", str(ctx.exception))

    # ── Test O: Missing State/District Is Handled Correctly ───────────────────
    def test_o_missing_state_or_district_handled(self):
        """Verify empty or None inputs raise InvalidLocationError."""
        with self.assertRaises(InvalidLocationError):
            business_ml_service.predict_district("Madhya Pradesh", "")

        with self.assertRaises(InvalidLocationError):
            business_ml_service.predict_district("", "Sehore")

        with self.assertRaises(InvalidLocationError):
            business_ml_service.predict_district(None, "Sehore")

        with self.assertRaises(InvalidLocationError):
            business_ml_service.predict_district("Madhya Pradesh", None)

    # ── Test P: Feature Ordering Matches model_features.csv Exactly ───────────
    def test_p_feature_ordering_exact_match(self):
        """Verify extracted feature vectors match model_features.csv sequence exactly."""
        row = business_ml_service.lookup_district("Madhya Pradesh", "Sehore")
        X = business_ml_service.extract_features(row)
        self.assertEqual(list(X.columns), business_ml_service.features)
        self.assertEqual(X.shape, (1, 327))

    # ── Test Q: Model Is Not Reloaded for Every Prediction ────────────────────
    def test_q_singleton_no_repeated_reload(self):
        """Verify joblib.load is called once and load_count does not increment on predictions."""
        initial_count = business_ml_service.load_count
        self.assertGreaterEqual(initial_count, 1)

        # Execute multiple predictions
        business_ml_service.predict_district("Madhya Pradesh", "Sehore")
        business_ml_service.predict_district("Maharashtra", "Pune")
        business_ml_service.predict_district("Gujarat", "Anand")

        # Load count must remain strictly unchanged
        self.assertEqual(business_ml_service.load_count, initial_count)

        # Calling load() again must not reload unless forced
        business_ml_service.load()
        self.assertEqual(business_ml_service.load_count, initial_count)


if __name__ == "__main__":
    unittest.main()
