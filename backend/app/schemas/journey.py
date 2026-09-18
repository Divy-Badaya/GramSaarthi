"""
GRAMSAARTHI — Journey Schemas
"""

from pydantic import BaseModel, Field
from typing import Any


class JourneyDeleteResponse(BaseModel):
    status: str = "success"
    message: str


class RoadmapStep(BaseModel):
    id: str
    step_number: int
    title: str
    short_title: str
    status: str  # "completed" | "current" | "pending" | "needs_update"
    route: str
    action_label: str
    description: str
    missing_requirements: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    is_locked: bool = False


class RoadmapResponse(BaseModel):
    overall_progress_pct: int
    completed_steps: int
    total_steps: int = 10
    current_step_id: str
    current_step_title: str
    business_name: str | None = None
    steps: list[RoadmapStep]
    summary_message: str
