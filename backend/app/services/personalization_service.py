"""
GRAMSAARTHI — Personalization & Business Rules Service

Architecture:
    Completely decoupled from the Random Forest ML inference engine.
    Receives raw district opportunity scores and applies user-level personalization:
      - Entrepreneur capital adequacy vs. sector benchmark
      - Experience level adjustments
      - Entrepreneur business preference handling
      - 0–100 Feasibility Score derivation
      - Metric synthesis and explanatory reasons generation
"""

import logging
from typing import Any

from app.schemas.assessment import MetricItem, ReasonItem, LocationDetail
from app.services.business_ml_service import TARGET_TO_BUSINESS, BUSINESS_META

logger = logging.getLogger(__name__)

# Experience scoring curve
EXPERIENCE_SCORES = {
    "Beginner":     70,
    "Intermediate": 85,
    "Expert":       98,
}


class PersonalizationService:
    """
    Pure business rule and personalization engine.
    Does not interact with ML models directly.
    """

    def build_recommendation(
        self,
        district: str,
        state: str,
        opportunity_indices: dict[str, float],
        raw_opportunity_scores: dict[str, float],
        capital: int | None = None,
        experience: str | None = "Beginner",
        preferred_business: str | None = None,
        village: str | None = None,
        block: str | None = None,
        ml_source: str = "production_ml",
        model_info: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Combines district ML opportunity scores with user inputs to form a complete recommendation.
        """
        # Step 1: Map targets to human-readable business names with opportunity index
        target_map = TARGET_TO_BUSINESS
        biz_rankings = []
        for target_col, opp_idx in opportunity_indices.items():
            biz_name = target_map.get(target_col)
            if biz_name:
                biz_rankings.append({
                    "business": biz_name,
                    "target_col": target_col,
                    "opportunity_index": opp_idx,
                    "raw_score": raw_opportunity_scores.get(target_col, 0.0),
                })

        # Sort businesses by opportunity index descending
        biz_rankings.sort(key=lambda x: x["opportunity_index"], reverse=True)
        top_ml_businesses = [b["business"] for b in biz_rankings]

        # Step 2: Determine Primary Recommendation
        # If user explicitly requested a business, evaluate that as primary
        # Otherwise, the #1 ML-ranked business becomes primary
        primary = top_ml_businesses[0] if top_ml_businesses else "Retail Shop"
        user_selected_custom = False

        if preferred_business and preferred_business.strip():
            pref_clean = preferred_business.strip()
            pref_lower = pref_clean.lower()
            # Normalize synonyms for Digital Services / Digital / IT and Transport / Logistics
            synonym_matches = {
                "digital": ["digital", "it", "csc"],
                "transport": ["transport", "logistics", "loader"],
                "logistics": ["transport", "logistics", "loader"],
                "food": ["food", "spice", "processing"],
                "retail": ["retail", "kirana", "shop", "store"],
            }
            # Check match against canonical businesses
            for b in top_ml_businesses:
                b_lower = b.lower()
                if pref_lower in b_lower or b_lower in pref_lower:
                    primary = b
                    user_selected_custom = True
                    break
                # Check synonym clusters
                for syn_key, syn_terms in synonym_matches.items():
                    if any(st in pref_lower for st in syn_terms) and any(st in b_lower for st in syn_terms):
                        primary = b
                        user_selected_custom = True
                        break
                if user_selected_custom:
                    break

            if not user_selected_custom and pref_lower != "suggest":
                primary = pref_clean.title()
                user_selected_custom = True

        # Step 3: Select Top-3 Recommendations
        # Include top ML picks while ensuring primary is present
        top3 = []
        if primary in top_ml_businesses:
            top3 = [primary] + [b for b in top_ml_businesses if b != primary][:2]
        else:
            top3 = [primary] + top_ml_businesses[:2]

        # Step 4: Calculate Feasibility Score
        primary_opp_idx = 75.0
        for b in biz_rankings:
            if b["business"].lower() == primary.lower():
                primary_opp_idx = b["opportunity_index"]
                break

        capital_fit_score = self._compute_capital_fit(primary, capital)
        exp_score = EXPERIENCE_SCORES.get(experience or "Beginner", 70)

        # Transparent combination: 60% District Opportunity + 20% Capital Adequacy + 20% Experience
        raw_feasibility = (
            0.60 * primary_opp_idx +
            0.20 * capital_fit_score +
            0.20 * exp_score
        )
        final_score = int(max(35, min(98, round(raw_feasibility))))

        # Step 5: Recommendation Label
        if final_score >= 80:
            rec_label = "Recommended"
        elif final_score >= 60:
            rec_label = "Feasible"
        else:
            rec_label = "Risky"

        # Step 6: Synthesize 6 Metrics
        meta = BUSINESS_META.get(primary, {})
        demand = meta.get("demand", "High")
        risk = meta.get("risk", "Medium")

        demand_score = {"Very High": 92, "High": 82, "Medium": 65, "Low": 40}.get(demand, 75)
        risk_score = {"Low": 85, "Medium": 65, "Medium-High": 45, "High": 30}.get(risk, 65)

        metrics = [
            MetricItem(name="Market Demand", value=demand_score, label=demand, color="green" if demand_score >= 75 else "amber"),
            MetricItem(name="Competition", value=min(95, max(30, 100 - int(primary_opp_idx * 0.4))), label="Moderate", color="amber" if final_score < 80 else "green"),
            MetricItem(name="Profit Potential", value=min(95, max(40, final_score + 2)), label="Good", color="green"),
            MetricItem(name="Location Suitability", value=min(98, max(40, int(primary_opp_idx))), label="Good" if primary_opp_idx >= 60 else "Fair", color="green" if primary_opp_idx >= 60 else "amber"),
            MetricItem(name="Risk Level", value=100 - risk_score, label=risk, color="green" if risk == "Low" else "amber"),
            MetricItem(name="Investment Required", value=capital_fit_score, label="Moderate", color="blue"),
        ]

        # Step 7: Synthesize Detailed Reasons
        reasons = self._build_reasons(
            primary=primary,
            top3=top3,
            district=district,
            capital=capital,
            score=final_score,
            opp_idx=primary_opp_idx,
            user_selected=user_selected_custom,
        )

        return {
            "location": LocationDetail(village=village, block=block, district=district, state=state),
            "capital": capital,
            "business": primary,
            "score": final_score,
            "recommendation": rec_label,
            "reasons": reasons,
            "metrics": metrics,
            "top3": top3,
            "ml_source": ml_source,
            "raw_opportunity_scores": raw_opportunity_scores,
            "model_info": model_info,
        }

    def _compute_capital_fit(self, business: str, capital: int | None) -> int:
        """Evaluates capital suitability against sector norms."""
        if capital is None:
            return 75

        meta = BUSINESS_META.get(business, {})
        inv_label = meta.get("inv_label", "")
        if not inv_label:
            return 75

        try:
            nums = [int(x) for x in inv_label.replace("₹", "").replace(" Lakh", "").replace("L", "").split("–")]
            min_lakhs = nums[0]
            capital_lakhs = capital / 100000.0
            if capital_lakhs >= min_lakhs:
                return 92
            ratio = capital_lakhs / min_lakhs if min_lakhs > 0 else 1.0
            return max(35, int(ratio * 90))
        except Exception:
            return 75

    def _build_reasons(
        self,
        primary: str,
        top3: list[str],
        district: str,
        capital: int | None,
        score: int,
        opp_idx: float,
        user_selected: bool,
    ) -> list[ReasonItem]:
        """Constructs human-readable reasons explaining the feasibility score."""
        reasons = []

        if user_selected:
            reasons.append(ReasonItem(
                label=f"Feasibility evaluated for your selected business: {primary} (District Opportunity Index: {int(opp_idx)}/100)",
                positive=True,
            ))
        else:
            reasons.append(ReasonItem(
                label=f"ML model ranked {primary} as the highest opportunity sector for {district} based on local socioeconomic data",
                positive=True,
            ))

        if len(top3) > 1:
            alternatives = " and ".join(top3[1:3])
            reasons.append(ReasonItem(
                label=f"Top alternative opportunities for {district}: {alternatives}",
                positive=True,
            ))

        if capital:
            reasons.append(ReasonItem(
                label=f"Available capital of ₹{capital:,} can be matched with government scheme subsidies",
                positive=True,
            ))

        if score >= 80:
            reasons.append(ReasonItem(
                label=f"Strong feasibility: High alignment between local infrastructure and {primary} requirements",
                positive=True,
            ))
        elif score >= 60:
            reasons.append(ReasonItem(
                label="Moderate feasibility: Viable enterprise with standard operational planning",
                positive=True,
            ))
        else:
            reasons.append(ReasonItem(
                label="Higher risk profile: Careful margin planning and financial buffering recommended",
                positive=False,
            ))

        return reasons


personalization_service = PersonalizationService()
