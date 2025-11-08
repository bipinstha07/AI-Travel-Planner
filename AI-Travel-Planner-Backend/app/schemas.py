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
    days: int = Field(..., ge=1, le=30)
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
    # Optional preferred label from model classification: one of beach, mountains, city, food, culture
    preferred_label: Optional[str] = None
    # Conversation context
    session_id: Optional[str] = Field(default=None, description="Conversation/session identifier")
    destination: Optional[str] = Field(default=None, description="Chosen destination name")
    days: Optional[int] = Field(default=None, ge=1, le=30, description="Planned travel days")
    budget: Optional[str] = Field(default=None, description="Budget band, e.g., budget, mid, luxury")


class PlanResponse(BaseModel):
    intent: str
    recommendations: List[str]
    # Orchestration additions
    session_id: Optional[str] = None
    next_questions: List[str] = []
    itinerary: Optional[ItineraryResponse] = None