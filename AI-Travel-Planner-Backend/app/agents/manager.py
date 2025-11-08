from __future__ import annotations

from typing import List, Dict, Optional
from uuid import uuid4
from pathlib import Path
import json

from ..schemas import PlanRequest, PlanResponse, ItineraryResponse
from .recommender import classify_intent
from .itinerary_builder import generate_itinerary


# Load catalog locally to avoid circular imports
CATALOG_PATH = Path(__file__).parent.parent / "data" / "destinations.json"
try:
    with CATALOG_PATH.open("r", encoding="utf-8") as f:
        DESTINATIONS: List[dict] = json.load(f)
except Exception:
    DESTINATIONS = []


ALLOWED_LABELS = {"beach", "mountains", "city", "food", "culture"}


def _score_destinations(matched_tags: List[str], primary_label: str) -> List[str]:
    scored: List[tuple[str, int]] = []
    for d in DESTINATIONS:
        tags = [str(x).lower() for x in d.get("tags", [])]
        score = sum(1 for mt in matched_tags if mt in tags) if matched_tags else 0
        name = d.get("name")
        if isinstance(name, str) and (score > 0 or (primary_label and primary_label in tags)):
            scored.append((name, max(score, 1 if primary_label in tags else 0)))

    # Prefer known picks for beach as a small bias example
    recommendations: List[str] = []
    if "beach" in matched_tags:
        for p in ["Bali", "Maldives", "Goa"]:
            if any(n == p for n, _ in scored) and p not in recommendations:
                recommendations.append(p)

    scored.sort(key=lambda x: x[1], reverse=True)
    for n, _ in scored:
        if n not in recommendations:
            recommendations.append(n)

    return recommendations[:3] or ["Bali"]


def orchestrate(req: PlanRequest) -> PlanResponse:
    # Session
    session_id = req.session_id or str(uuid4())

    # Determine label
    label = "unknown"
    matched_tags: List[str] = []
    preferred = (req.preferred_label or "").strip().lower() if req.preferred_label else None
    if preferred and preferred in ALLOWED_LABELS:
        label = preferred
        matched_tags = [preferred]
    else:
        # Call classifier to get a label
        try:
            intent = classify_intent(req.text, list(ALLOWED_LABELS))
            label = str(intent.get("label", "unknown") or "unknown")
            if label in ALLOWED_LABELS:
                matched_tags = [label]
        except Exception:
            # Lightweight heuristics fallback
            t = req.text.lower()
            if "beach" in t or any(k in t for k in ["sea", "sand", "island", "coast"]):
                matched_tags.append("beach")
            if any(k in t for k in ["hike", "trek", "alps", "mountain", "peak"]):
                matched_tags.append("mountains")
            if any(k in t for k in ["city", "cities", "museum", "nightlife", "shopping", "downtown", "urban", "metropolis", "metropolitan"]):
                matched_tags.append("city")
            if any(k in t for k in ["food", "cuisine", "restaurant", "street food", "dining"]):
                matched_tags.append("food")
            if any(k in t for k in ["culture", "cultural", "history", "historic", "art", "heritage", "festival", "tradition", "traditional"]):
                matched_tags.append("culture")
            label = matched_tags[0] if matched_tags else "unknown"

    # Recommend destinations
    recommendations = _score_destinations(matched_tags, label)

    # Clarifying questions
    next_questions: List[str] = []
    if not req.days:
        next_questions.append("How many days will you travel?")
    if not req.destination:
        next_questions.append("Which destination would you like from the suggestions?")
    if not req.budget:
        next_questions.append("What budget range should I consider (budget/mid/luxury)?")

    # If enough info is present, generate an itinerary now
    itinerary: Optional[ItineraryResponse] = None
    if req.destination and req.days:
        try:
            itinerary_dict = generate_itinerary(req.destination, int(req.days), [label])
            # Build ItineraryResponse via Pydantic model
            itinerary = ItineraryResponse(**itinerary_dict)  # type: ignore
            next_questions = []
        except Exception:
            itinerary = None

    return PlanResponse(
        intent=label,
        recommendations=recommendations,
        session_id=session_id,
        next_questions=next_questions,
        itinerary=itinerary,
    )