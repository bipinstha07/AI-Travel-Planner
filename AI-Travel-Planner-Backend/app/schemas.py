from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class IntentRequest(BaseModel):
    text: str = Field(..., description="User preference or intent text")
    candidate_labels: List[str] = Field(default_factory=lambda: [
        "beach", "mountains", "city", "culture", "food"
    ])


class IntentResponse(BaseModel):
    label: str
    confidence: float
    scores: Dict[str, float] = {}


class ItineraryRequest(BaseModel):
    destination: str
    days: int = Field(..., ge=1, le=21)
    preferences: List[str] = []


class ItineraryDay(BaseModel):
    date: Optional[str] = None
    activities: List[str] = []
    food: List[str] = []
    sights: List[str] = []


class ItineraryResponse(BaseModel):
    days: List[ItineraryDay]
    notes: Optional[str] = None


class DestinationItem(BaseModel):
    name: str
    country: str
    tags: List[str] = []
    best_months: List[str] = []
    description: Optional[str] = None


class DestinationListResponse(BaseModel):
    items: List[DestinationItem]


class PlanRequest(BaseModel):
    text: str = Field(..., description="User message for planning")


class PlanResponse(BaseModel):
    intent: str
    recommendations: List[str]