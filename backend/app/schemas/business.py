"""
GRAMSAARTHI — Business Pydantic Schemas
"""

from pydantic import BaseModel


class BusinessIdeaResponse(BaseModel):
    """
    Single business idea in the ideas list.
    Matches BUSINESS_IDEAS shape from frontend mockData.js exactly.
    """
    id: int
    name: str
    emoji: str | None = "🏪"
    investment: str       # e.g. "₹8–12 Lakh"
    demand: str           # High / Very High / Medium / Low
    competition: str      # High / Medium / Low
    profit: str           # e.g. "₹40–60K/month"
    risk: str             # High / Medium / Low
    score: int            # 0–100

    model_config = {"from_attributes": True}


class BusinessIdeasListResponse(BaseModel):
    """Response for GET /api/recommend/ideas."""
    ideas: list[BusinessIdeaResponse]
