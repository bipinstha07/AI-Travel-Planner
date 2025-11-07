from typing import List, Dict

from ..config import settings


def _template_itinerary(destination: str, days: int, preferences: List[str]) -> Dict:
    base = []
    prefs = ", ".join(preferences) if preferences else "highlights"
    for d in range(1, days + 1):
        base.append({
            "date": None,
            "activities": [f"Explore {destination} {prefs}", "Relax", "Photo walk"],
            "food": ["Local breakfast", "Popular lunch spot", "Street food dinner"],
            "sights": ["Top landmark", "Neighborhood walk"],
        })
    return {"days": base, "notes": "Template itinerary (no generation libs installed)"}


def generate_itinerary(destination: str, days: int, preferences: List[str]) -> Dict:
    # Prefer transformers text-generation if available
    try:
        from transformers import pipeline
        model_name = settings.itinerary_model
        gen = pipeline("text-generation", model=model_name)
        prompt = (
            f"Create a travel itinerary for {destination} over {days} days. "
            f"Preferences: {', '.join(preferences) if preferences else 'general sightseeing and food'}. "
            "Return concise day-by-day activities, food suggestions, and sights."
        )
        _ = gen(prompt, max_new_tokens=300, do_sample=True)
        # For simplicity, return a templated structure; parsing model output is a later milestone
        return _template_itinerary(destination, days, preferences)
    except Exception:
        return _template_itinerary(destination, days, preferences)