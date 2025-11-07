from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Any, List
from pathlib import Path
import json

try:
    # Local imports inside try so module loads even if deps missing
    from .config import settings
    from .schemas import (
        IntentRequest,
        IntentResponse,
        ItineraryRequest,
        ItineraryResponse,
        DestinationItem,
        DestinationListResponse,
        PlanRequest,
        PlanResponse,
    )
    from .agents.recommender import classify_intent
    from .agents.itinerary_builder import generate_itinerary
except Exception:
    # Minimal fallbacks so the app can start; endpoints will error if used before deps are installed
    settings = None  # type: ignore
    IntentRequest = IntentResponse = ItineraryRequest = ItineraryResponse = DestinationItem = DestinationListResponse = PlanRequest = PlanResponse = Any  # type: ignore
    classify_intent = None  # type: ignore
    generate_itinerary = None  # type: ignore


app = FastAPI(title="AI Travel Planner Backend", version="0.1.0")

# Allow local dev frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# Load destination catalog once at startup
CATALOG_PATH = Path(__file__).parent / "data" / "destinations.json"
try:
    with CATALOG_PATH.open("r", encoding="utf-8") as f:
        DESTINATIONS: List[dict] = json.load(f)
except Exception:
    DESTINATIONS = []


@app.post("/api/recommendations/classify-intent", response_model=IntentResponse)
def api_classify_intent(req: IntentRequest):
    if classify_intent is None:
        return {"label": "unknown", "confidence": 0.0, "scores": {}}  # type: ignore
    result = classify_intent(text=req.text, candidate_labels=req.candidate_labels)
    return result


@app.post("/api/itinerary/generate", response_model=ItineraryResponse)
def api_generate_itinerary(req: ItineraryRequest):
    if generate_itinerary is None:
        return {"days": [], "notes": "Dependencies not installed"}  # type: ignore
    itinerary = generate_itinerary(
        destination=req.destination,
        days=req.days,
        preferences=req.preferences,
    )
    return itinerary


@app.get("/api/recommendations/destinations", response_model=DestinationListResponse)
def api_list_destinations(
    tag: str | None = Query(default=None, description="Filter by tag"),
    month: str | None = Query(default=None, description="Filter by best month"),
    limit: int = Query(default=24, ge=1, le=100, description="Max items to return"),
):
    items: List[dict] = DESTINATIONS
    if tag:
        t = tag.strip().lower()
        items = [d for d in items if any(x.lower() == t for x in d.get("tags", []))]
    if month:
        m = month.strip()
        items = [d for d in items if m in d.get("best_months", [])]
    items = items[:limit]
    return {"items": items}


@app.post("/api/plan", response_model=PlanResponse)
def api_plan(req: PlanRequest):
    # Lightweight multi-tag intent classification for fast, relevant suggestions
    t = req.text.lower()

    matched_tags: List[str] = []
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

    # Choose primary label for UI messaging (first match or unknown)
    label = matched_tags[0] if matched_tags else "unknown"

    # Score destinations by number of matched tags (prefer items that fit multiple intents)
    scored: List[tuple[str, int]] = []
    for d in DESTINATIONS:
        tags = [str(x).lower() for x in d.get("tags", [])]
        score = sum(1 for mt in matched_tags if mt in tags) if matched_tags else 0
        name = d.get("name")
        if isinstance(name, str) and score > 0:
            scored.append((name, score))

    # If no multi-tag matches, fall back to single primary label filter
    if not scored and label != "unknown":
        for d in DESTINATIONS:
            tags = [str(x).lower() for x in d.get("tags", [])]
            if label in tags:
                name = d.get("name")
                if isinstance(name, str):
                    scored.append((name, 1))

    # Prefer known beach picks if beach is among matched tags
    recommendations: List[str] = []
    if "beach" in matched_tags:
        preferred = ["Bali", "Maldives", "Goa"]
        for p in preferred:
            # Only add if it actually matched tags
            for n, s in scored:
                if n == p and p not in recommendations:
                    recommendations.append(p)
                    break

    # Sort by score descending; maintain original catalog order for ties
    scored.sort(key=lambda x: x[1], reverse=True)
    for n, _ in scored:
        if n not in recommendations:
            recommendations.append(n)

    recommendations = recommendations[:3]

    return {"intent": label, "recommendations": recommendations or ["Bali"]}