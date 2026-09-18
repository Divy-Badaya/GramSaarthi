"""
GRAMSAARTHI — Production Business Recommendation ML Service

Architecture:
    Dedicated inference service for the newly trained production ML model
    (HistGradientBoostingRegressor inside a SimpleImputer pipeline) trained on
    327 socioeconomic, infrastructural, demographic, and financial features
    across 979 Indian districts to predict 10 hyper-local business opportunity scores.

Pipeline:
    1. Robust normalization of state and district inputs
    2. Deterministic district lookup against the 979-row district_feature_store.csv
    3. In-memory feature vector assembly in the exact sequence specified by model_features.csv
    4. Input sanity validation (327 features, finite values, zero NaNs)
    5. Single-pass model forward prediction -> 10 business opportunity scores
    6. Output sanity validation (10 outputs, numeric, finite, range [0, 1])
    7. Canonical business target ranking (descending) and top-3 recommendation selection

This service is fully decoupled from the legacy models and endpoints, preserving
complete backward compatibility and zero disruption to ongoing user flows.
"""

import json
import logging
import os
import pathlib
import re
import sys
import warnings
from typing import Any

import joblib
import numpy as np
import pandas as pd

# ── Scikit-Learn Version Compatibility Bridge ─────────────────────────────────
# The production model was serialized with scikit-learn 1.6.1. When running under
# newer versions (e.g. 1.9.x), CyHalfSquaredError was relocated to sklearn._loss.loss.
try:
    import sklearn._loss.loss
    sys.modules["_loss"] = sklearn._loss.loss
    sys.modules["_loss.loss"] = sklearn._loss.loss
except Exception:
    pass

logger = logging.getLogger(__name__)

# ── Directory Paths ───────────────────────────────────────────────────────────
_SERVICE_DIR = pathlib.Path(__file__).resolve().parent
_BACKEND_DIR = _SERVICE_DIR.parent.parent
_ML_DIR = _BACKEND_DIR / "ml" / "business_recommendation"

# ── Canonical Business Mapping ────────────────────────────────────────────────
TARGET_TO_BUSINESS: dict[str, str] = {
    "agriculture_score": "Agriculture",
    "dairy_score": "Dairy",
    "poultry_score": "Poultry",
    "retail_score": "Retail Shop",
    "food_business_score": "Food Business",
    "textile_score": "Textile",
    "manufacturing_score": "Manufacturing",
    "digital_it_score": "Digital / IT",
    "healthcare_score": "Healthcare",
    "logistics_score": "Logistics",
}

BUSINESS_TO_TARGET: dict[str, str] = {v: k for k, v in TARGET_TO_BUSINESS.items()}

# ── Business Metadata (emoji, investment range, profit range, risk, demand) ──
BUSINESS_META: dict[str, dict[str, str]] = {
    "Agriculture":      {"emoji": "🌾", "inv_label": "₹2–8 Lakh",   "profit_label": "₹15–40K/month", "risk": "Low",    "demand": "High"},
    "Dairy":            {"emoji": "🐄", "inv_label": "₹8–12 Lakh",  "profit_label": "₹40–60K/month", "risk": "Medium", "demand": "High"},
    "Digital Services": {"emoji": "💻", "inv_label": "₹0.5–2 Lakh", "profit_label": "₹20–50K/month", "risk": "Low",    "demand": "High"},
    "Fisheries":        {"emoji": "🐟", "inv_label": "₹3–10 Lakh",  "profit_label": "₹25–50K/month", "risk": "Medium", "demand": "High"},
    "Food Business":    {"emoji": "🍱", "inv_label": "₹1–5 Lakh",   "profit_label": "₹20–40K/month", "risk": "Low",    "demand": "Very High"},
    "Manufacturing":    {"emoji": "🏭", "inv_label": "₹5–20 Lakh",  "profit_label": "₹30–80K/month", "risk": "Medium", "demand": "Medium"},
    "Poultry":          {"emoji": "🐔", "inv_label": "₹5–8 Lakh",   "profit_label": "₹30–45K/month", "risk": "Medium", "demand": "High"},
    "Retail Shop":      {"emoji": "🏪", "inv_label": "₹1–3 Lakh",   "profit_label": "₹15–30K/month", "risk": "Low",    "demand": "High"},
    "Textile":          {"emoji": "🧵", "inv_label": "₹1–5 Lakh",   "profit_label": "₹15–35K/month", "risk": "Low",    "demand": "Medium"},
    "Transport":        {"emoji": "🚛", "inv_label": "₹6–10 Lakh",  "profit_label": "₹35–55K/month", "risk": "Medium", "demand": "High"},
    "Digital / IT":     {"emoji": "💻", "inv_label": "₹0.5–2 Lakh", "profit_label": "₹20–50K/month", "risk": "Low",    "demand": "High"},
    "Healthcare":       {"emoji": "🏥", "inv_label": "₹3–10 Lakh",  "profit_label": "₹25–60K/month", "risk": "Low",    "demand": "High"},
    "Logistics":        {"emoji": "🚛", "inv_label": "₹6–10 Lakh",  "profit_label": "₹35–55K/month", "risk": "Medium", "demand": "High"},
}


# ── Custom Exceptions ─────────────────────────────────────────────────────────

class MLServiceError(Exception):
    """Base exception for all Production ML Service errors."""
    pass


class ModelFileNotFoundError(MLServiceError, FileNotFoundError):
    """Raised when any required production ML model file is missing."""
    pass


class InvalidLocationError(MLServiceError, ValueError):
    """Raised when provided location parameters (state/district) are empty or invalid."""
    pass


class DistrictNotFoundError(MLServiceError, LookupError):
    """Raised when the specified district cannot be found in the feature store."""
    pass


class AmbiguousDistrictError(MLServiceError, ValueError):
    """Raised when district lookup matches multiple distinct entries."""
    pass


class PredictionSanityError(MLServiceError, ValueError):
    """Raised when input features or model predictions fail sanity validation."""
    pass


# ── Production Business ML Service Class ──────────────────────────────────────

class BusinessMLService:
    """
    Dedicated production ML inference service for hyper-local business recommendations.
    Implemented as a thread-safe application singleton:
    - Loads the .pkl model and tabular feature store strictly ONCE into memory.
    - Preserves the exact 327-feature order defined in model_features.csv.
    - Performs deterministic state and district lookups without unsafe fuzzy matching.
    - Yields all 10 opportunity scores and top-3 ranked business recommendations.
    """

    def __init__(self, ml_dir: pathlib.Path | None = None):
        self._ml_dir = ml_dir or _ML_DIR
        self._model: Any = None
        self._features: list[str] = []
        self._targets: list[str] = []
        self._model_info: dict[str, Any] = {}
        self._feature_store_df: pd.DataFrame | None = None
        self._state_norm: pd.Series | None = None
        self._district_norm: pd.Series | None = None
        self._loaded: bool = False
        self._load_error: str | None = None
        self._load_count: int = 0

    @property
    def is_loaded(self) -> bool:
        """Indicates whether all model artifacts are loaded and ready for inference."""
        return self._loaded

    @property
    def load_error(self) -> str | None:
        """Returns the error message if loading failed, or None."""
        return self._load_error

    @property
    def load_count(self) -> int:
        """Returns the number of times load() has actually executed from disk."""
        return self._load_count

    @property
    def features(self) -> list[str]:
        """Returns the ordered list of 327 input feature names."""
        return list(self._features)

    @property
    def targets(self) -> list[str]:
        """Returns the ordered list of 10 target score names."""
        return list(self._targets)

    @property
    def model_info(self) -> dict[str, Any]:
        """Returns model provenance and training metadata."""
        return dict(self._model_info)

    @property
    def district_count(self) -> int:
        """Returns the number of unique districts in the feature store."""
        return len(self._feature_store_df) if self._feature_store_df is not None else 0

    # ── Artifact Loading ──────────────────────────────────────────────────────

    def load(self, force_reload: bool = False) -> None:
        """
        Load all production ML model artifacts into memory.
        Guarantees singleton behavior: only loads from disk once unless force_reload=True.
        """
        if self._loaded and not force_reload:
            return

        model_path = self._ml_dir / "gramsaarthi_business_model.pkl"
        features_path = self._ml_dir / "model_features.csv"
        targets_path = self._ml_dir / "model_targets.csv"
        info_path = self._ml_dir / "model_info.json"
        store_path = self._ml_dir / "district_feature_store.csv"

        # Validate existence of all 5 required artifacts
        required_files = {
            "Model file": model_path,
            "Features file": features_path,
            "Targets file": targets_path,
            "Model info metadata": info_path,
            "District feature store": store_path,
        }

        for name, path in required_files.items():
            if not path.exists():
                err = f"{name} not found at expected path: {path}"
                self._load_error = err
                self._loaded = False
                logger.error("[PRODUCTION_ML] %s", err)
                raise ModelFileNotFoundError(err)

        try:
            # 1. Load model_info.json
            with open(info_path, "r", encoding="utf-8") as f:
                self._model_info = json.load(f)

            # 2. Load model_features.csv
            feat_df = pd.read_csv(features_path)
            if "feature" not in feat_df.columns:
                raise ValueError(f"'feature' column missing in {features_path}")
            self._features = feat_df["feature"].dropna().astype(str).tolist()
            if len(self._features) != 327:
                logger.warning(
                    "[PRODUCTION_ML] Feature count is %d (expected 327 as per model_info.json)",
                    len(self._features),
                )

            # 3. Load model_targets.csv
            tgt_df = pd.read_csv(targets_path)
            if "target" not in tgt_df.columns:
                raise ValueError(f"'target' column missing in {targets_path}")
            self._targets = tgt_df["target"].dropna().astype(str).tolist()
            if len(self._targets) != 10:
                raise ValueError(f"Expected 10 targets in model_targets.csv, got {len(self._targets)}")

            # 4. Load district_feature_store.csv
            self._feature_store_df = pd.read_csv(store_path)
            if "STATE" not in self._feature_store_df.columns or "DISTRICT" not in self._feature_store_df.columns:
                raise ValueError(f"Required 'STATE' and 'DISTRICT' columns missing in {store_path}")

            # Validate that every model feature is present in the feature store
            missing_features = [f for f in self._features if f not in self._feature_store_df.columns]
            if missing_features:
                raise ValueError(
                    f"District feature store is missing {len(missing_features)} model features: {missing_features[:5]}..."
                )

            # Pre-compute uppercase normalized search vectors without mutating the underlying dataframe
            self._state_norm = (
                self._feature_store_df["STATE"].astype(str).map(self.normalize_location_text)
            )
            self._district_norm = (
                self._feature_store_df["DISTRICT"].astype(str).map(self.normalize_location_text)
            )

            # 5. Load model with warning suppression and scikit-learn version bridging
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                self._model = joblib.load(model_path)

            # Ensure SimpleImputer compatibility across scikit-learn versions
            if hasattr(self._model, "named_steps") and "imputer" in self._model.named_steps:
                imputer = self._model.named_steps["imputer"]
                if not hasattr(imputer, "_fill_dtype"):
                    imputer._fill_dtype = getattr(imputer, "_fit_dtype", np.float64)

            self._loaded = True
            self._load_error = None
            self._load_count += 1
            logger.info(
                "[PRODUCTION_ML] Successfully loaded Production Business ML Model. "
                "Districts: %d | Features: %d | Targets: %d",
                len(self._feature_store_df),
                len(self._features),
                len(self._targets),
            )
        except Exception as exc:
            self._loaded = False
            self._load_error = str(exc)
            logger.error("[PRODUCTION_ML] Failed loading model artifacts: %s", exc, exc_info=True)
            raise

    # ── Normalization & District Resolution ────────────────────────────────────

    @staticmethod
    def normalize_location_text(text: str | None) -> str:
        """
        Normalizes a location string:
        - Trims leading/trailing whitespace
        - Collapses internal repeated whitespace to a single space
        - Converts to uppercase
        - Strips punctuation variations
        """
        if not text:
            return ""
        # Collapse multiple spaces, tabs, and newlines
        cleaned = re.sub(r"\s+", " ", str(text).strip())
        return cleaned.upper()

    def lookup_district(self, state: str | None, district: str | None) -> pd.Series:
        """
        Locates the specific district row in district_feature_store.csv deterministically.

        Rules:
        - State and district must be non-empty strings.
        - Matching is exact on normalized text (case-insensitive, whitespace-collapsed).
        - No fuzzy guessing or silent substitution.
        - If district is not found, raises DistrictNotFoundError.
        - If multiple matches occur, raises AmbiguousDistrictError.

        Returns:
            pd.Series containing the complete district feature row.
        """
        if not self._loaded:
            self.load()

        norm_dist = self.normalize_location_text(district)
        if not norm_dist:
            raise InvalidLocationError("District name is required and cannot be empty.")

        norm_state = self.normalize_location_text(state)
        if not norm_state:
            raise InvalidLocationError("State name is required and cannot be empty.")

        # Filter strictly by both normalized STATE and DISTRICT
        mask = (self._state_norm == norm_state) & (self._district_norm == norm_dist)
        matches = self._feature_store_df[mask]

        if len(matches) == 1:
            return matches.iloc[0]

        if len(matches) > 1:
            raise AmbiguousDistrictError(
                f"Multiple entries ({len(matches)}) found for district '{district}' in state '{state}'."
            )

        # Zero matches: analyze whether district exists under other states to provide actionable error
        other_states = self._feature_store_df[self._district_norm == norm_dist]["STATE"].unique()
        if len(other_states) > 0:
            states_str = ", ".join(sorted(other_states))
            raise DistrictNotFoundError(
                f"District '{district}' was not found in state '{state}'. "
                f"It was found in: [{states_str}]. Please verify the state name."
            )

        # Check if state itself exists in feature store
        state_exists = (self._state_norm == norm_state).any()
        if not state_exists:
            raise DistrictNotFoundError(
                f"State '{state}' is not present in the district feature store. "
                f"District '{district}' could not be resolved."
            )

        raise DistrictNotFoundError(
            f"District '{district}' not found in state '{state}' within the 979-district feature store."
        )

    # ── Feature Extraction & Inference ────────────────────────────────────────

    def extract_features(self, district_row: pd.Series) -> pd.DataFrame:
        """
        Extracts only the required 327 model features in the EXACT sequence specified
        by model_features.csv. Excludes STATE, DISTRICT, or any non-model columns.
        """
        missing = [f for f in self._features if f not in district_row]
        if missing:
            raise PredictionSanityError(
                f"Cannot construct model input: row is missing {len(missing)} features."
            )

        # Build single-row DataFrame with exact columns and order
        X = pd.DataFrame([district_row[self._features].values], columns=self._features)

        # Validate dimensions
        if X.shape != (1, len(self._features)):
            raise PredictionSanityError(
                f"Input feature vector shape {X.shape} does not match expected (1, {len(self._features)})."
            )

        return X

    def predict_district(self, state: str, district: str) -> dict[str, Any]:
        """
        Full end-to-end inference flow for a given state and district:
        1. Resolve district in feature store.
        2. Extract exact 327 feature inputs.
        3. Execute forward pass with the loaded model.
        4. Validate predictions.
        5. Map target scores to business names and rank descending.
        6. Return complete structured response with top-3 recommendations.
        """
        if not self._loaded:
            self.load()

        # Step 1: Deterministic lookup
        row = self.lookup_district(state=state, district=district)
        canonical_state = str(row["STATE"])
        canonical_district = str(row["DISTRICT"])

        # Step 2: Feature extraction
        X_input = self.extract_features(row)

        # Step 3: Input verification
        # The model pipeline begins with SimpleImputer(strategy='median') to gracefully
        # impute any missing feature values present in the district feature store.
        vals = X_input.to_numpy(dtype=float)
        if np.isinf(vals).any():
            raise PredictionSanityError(
                f"Input features for {canonical_district}, {canonical_state} contain infinite values."
            )

        # Step 4: Model Prediction
        try:
            raw_pred = self._model.predict(X_input)
        except Exception as exc:
            logger.error("[PRODUCTION_ML] Model execution failed: %s", exc, exc_info=True)
            raise PredictionSanityError(f"Internal model prediction failure: {exc}")

        # Step 5: Output Sanity Validation
        if not isinstance(raw_pred, np.ndarray):
            raise PredictionSanityError(f"Model returned non-numpy output: {type(raw_pred)}")

        if raw_pred.ndim != 2 or raw_pred.shape != (1, len(self._targets)):
            raise PredictionSanityError(
                f"Output prediction shape {raw_pred.shape} does not match expected (1, {len(self._targets)})."
            )

        scores_vector = raw_pred[0]
        if not np.isfinite(scores_vector).all():
            raise PredictionSanityError("Model produced non-finite output scores (NaN or Inf).")

        # Step 6: Map to targets and businesses, ensure valid [0, 1] range
        raw_scores: dict[str, float] = {}
        scores_by_business: dict[str, float] = {}
        ranked_list: list[dict[str, Any]] = []

        for i, target_name in enumerate(self._targets):
            val = float(scores_vector[i])
            # Clip slightly out-of-bound values due to floating-point rounding
            clamped_val = max(0.0, min(1.0, val))
            raw_scores[target_name] = round(clamped_val, 6)

            business_name = TARGET_TO_BUSINESS.get(target_name, target_name)
            scores_by_business[business_name] = round(clamped_val, 6)

            ranked_list.append({
                "target": target_name,
                "business": business_name,
                "score": round(clamped_val, 6),
            })

        # Sort descending by score
        ranked_list.sort(key=lambda x: x["score"], reverse=True)

        # Assign ranks
        for rank_idx, item in enumerate(ranked_list, start=1):
            item["rank"] = rank_idx

        top3_businesses = [item["business"] for item in ranked_list[:3]]

        return {
            "success": True,
            "state": canonical_state,
            "district": canonical_district,
            "top3": top3_businesses,
            "ranked_recommendations": ranked_list,
            "raw_scores": raw_scores,
            "scores_by_business": scores_by_business,
            "metadata": {
                "model_name": self._model_info.get("model", "HistGradientBoosting"),
                "task": self._model_info.get("task", "Hyper-local business opportunity score prediction"),
                "sklearn_version": self._model_info.get("sklearn_version", "1.6.1"),
                "feature_count": len(self._features),
                "target_count": len(self._targets),
                "district_feature_store_rows": len(self._feature_store_df),
            },
        }


# ── Module-Level Singleton ────────────────────────────────────────────────────
business_ml_service = BusinessMLService()
