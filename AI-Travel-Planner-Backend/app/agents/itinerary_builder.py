from typing import List, Dict, Optional
from pathlib import Path
import json
import random

from ..config import settings
from .poi_provider import get_pois
from functools import lru_cache
import re
from itertools import islice


def _template_itinerary(destination: str, days: int, preferences: List[str], note: Optional[str] = None) -> Dict:
    base = []
    prefs = ", ".join(preferences) if preferences else "highlights"
    for d in range(1, days + 1):
        base.append({
            "date": None,
            "activities": [f"Explore {destination} {prefs}", "Relax", "Photo walk"],
            "food": ["Local breakfast", "Popular lunch spot", "Street food dinner"],
            "sights": ["Top landmark", "Neighborhood walk"],
        })
    return {"days": base, "notes": note or "Personalized itinerary"}


def _load_places() -> Dict[str, Dict[str, List[str]]]:
    path = Path(__file__).parent.parent / "data" / "places.json"
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _rule_based_itinerary(destination: str, days: int) -> Optional[Dict]:
    places = _load_places()
    city = places.get(destination)
    if not city:
        return None
    sights = city.get("sights", [])
    acts = city.get("activities", [])
    foods = city.get("food", [])
    # Shuffle pools to avoid obvious cycles
    for lst in (sights, acts, foods):
        random.shuffle(lst)
    base = []
    recent_window = 2  # avoid repeating same item within last 2 days
    used_acts: List[str] = []
    used_foods: List[str] = []
    used_sights: List[str] = []
    for i in range(days):
        def pick(lst: List[str], used: List[str]) -> str:
            if not lst:
                return "Explore"
            # try to find item not in recent window
            for item in lst:
                if item not in used[-recent_window:]:
                    used.append(item)
                    return item
            # if all conflict, rotate and pick
            item = lst[i % len(lst)]
            used.append(item)
            return item
        base.append({
            "date": None,
            "activities": [
                pick(acts, used_acts) if acts else f"Explore {destination}",
                pick(acts, used_acts) if acts else "Relax",
                pick(acts, used_acts) if acts else "Photo walk",
            ],
            "food": [
                pick(foods, used_foods) if foods else "Local breakfast",
                pick(foods, used_foods) if foods else "Popular lunch spot",
                pick(foods, used_foods) if foods else "Street food dinner",
            ],
            "sights": [
                pick(sights, used_sights) if sights else "Top landmark",
                pick(sights, used_sights) if sights else "Neighborhood walk",
            ],
        })
    return {"days": base, "notes": "Personalized itinerary"}


@lru_cache(maxsize=1)
def _get_gen_pipeline():
    from transformers import pipeline
    model_name = settings.itinerary_model
    return pipeline("text-generation", model=model_name)


def generate_itinerary(destination: str, days: int, preferences: List[str]) -> Dict:
    # Prefer dynamic, per-day generation for uniqueness; fallback to curated or template silently
    try:
        # Use a cached GPT-style text generation pipeline to avoid re-loading per request
        gen = _get_gen_pipeline()

        # Load curated places for hybrid enrichment
        places = _load_places()
        curated_city = places.get(destination, {})
        curated_sights: List[str] = curated_city.get("sights", []) if isinstance(curated_city, dict) else []
        curated_acts: List[str] = curated_city.get("activities", []) if isinstance(curated_city, dict) else []
        curated_foods: List[str] = curated_city.get("food", []) if isinstance(curated_city, dict) else []
        # Shuffle curated pools to vary anchors day-to-day
        random.shuffle(curated_sights)
        random.shuffle(curated_acts)
        random.shuffle(curated_foods)

        food_kw = {
            "restaurant","street food","ramen","sushi","bistro","bbq","curry",
            "breakfast","lunch","dinner","coffee","bar","wine","bakery","pastry",
            "macaron","seafood","grill"
        }
        sights_kw = {
            "museum","temple","cathedral","tower","park","market","beach","mountain",
            "landmark","palace","garden","bridge","old town","church","monument","castle"
        }
        act_kw = {"walk","tour","hike","cruise","shopping","yoga","photo","sunset","snorkel","spa","stroll"}
        banned_terms = {
            # meta/instructions
            "prefer","word","left","right","appropriate","add the rest","suggest",
            "provide","example","placeholder","instruction","return only","bullet",
            # blog/contact/internet noise
            "blog","contact","email","http","https","www","subscribe","download",
            "messenger","phone","share information","years","note","avoid","confused",
            "project"
        }

        def _too_meta(s: str) -> bool:
            # Fast reject on obvious non-travel text
            if any(bt in s for bt in banned_terms):
                return True
            if re.search(r"(@|http|www\.|\.com|\.io|\.net)", s):
                return True
            # Very long sentences are likely explanations
            return len(s) > 80 or len(s.split()) > 12

        def is_travel_phrase(p: str) -> bool:
            s = p.lower()
            if _too_meta(s):
                return False
            if len(s) < 3:
                return False
            # Short travel-like fragments only
            if len(s.split()) < 2 or len(s.split()) > 8:
                return False
            return (
                any(k in s for k in food_kw) or
                any(k in s for k in sights_kw) or
                any(k in s for k in act_kw) or
                any(w in s for w in ["visit","explore","stroll","view","ride","market","festival","heritage"]) 
            )

        def classify_phrase(p: str) -> str:
            s = p.lower()
            if any(k in s for k in food_kw):
                return "food"
            if any(k in s for k in sights_kw):
                return "sights"
            if any(k in s for k in act_kw):
                return "activities"
            return "activities"

        used_acts: List[str] = []
        used_foods: List[str] = []
        used_sights: List[str] = []
        recent_window = 2

        def pick_unique(bucket: List[str], used: List[str], fallback: str) -> str:
            for item in bucket:
                if item and item not in used[-recent_window:]:
                    used.append(item)
                    return item
            if bucket:
                item = bucket[0]
                used.append(item)
                return item
            # Track fallback too to avoid repeating across consecutive days
            used.append(fallback)
            return fallback

        days_out: List[Dict] = []
        # Fetch POIs once and pass into prompts to act as content anchors
        primary_pref = preferences[0] if preferences else None
        poi_list = get_pois(destination, primary_pref, limit=8)
        poi_str = ", ".join(poi_list) if poi_list else ""

        for d in range(1, days + 1):
            prompt = (
                f"Create 8 short, comma-separated travel phrases for Day {d} in {destination}. "
                f"Use these points of interest if relevant: {poi_str}. "
                f"Mix activities, sights, and local food. Preferences: {', '.join(preferences) if preferences else 'general'}. "
                "Each phrase 2-5 words, no sentences, no email/contact/blog/instructions. "
                "Return only the comma-separated list."
            )
            # Try up to two generations to get clean travel phrases
            text = ""
            for attempt in range(2):
                try:
                    r = gen(
                        prompt,
                        max_new_tokens=80,
                        do_sample=True,
                        temperature=0.7,
                        top_p=0.9,
                        repetition_penalty=1.1,
                        return_full_text=False,
                        clean_up_tokenization_spaces=True,
                        num_return_sequences=1,
                    )[0]
                    text = r.get("generated_text", "")
                except Exception:
                    text = ""
                parts_try = re.split(r"[\n\r\.;,]+", text)
                phrases_try = [p.strip() for p in parts_try if p.strip()]
                # strip meta and keep only travel phrases
                phrases_try = [p for p in phrases_try if not _too_meta(p.lower())]
                phrases_try = [p for p in phrases_try if not re.search(r"\b(day|suggest|provide|return only)\b", p, re.IGNORECASE)]
                phrases_try = [p for p in phrases_try if is_travel_phrase(p)]
                if len(phrases_try) >= 6:
                    phrases = phrases_try
                    break
            else:
                parts = re.split(r"[\n\r\.;,]+", text)
                phrases = [p.strip() for p in parts if p.strip()]
                phrases = [p for p in phrases if not _too_meta(p.lower())]
                phrases = [p for p in phrases if not re.search(r"\b(day|suggest|provide|return only)\b", p, re.IGNORECASE)]
                phrases = [p for p in phrases if is_travel_phrase(p)]
            # Extract phrases from text
            parts = re.split(r"[\n\r\.;,]+", text)
            phrases = [p.strip() for p in parts if p.strip()]
            # Remove any leftover prompt echoes
            phrases = [p for p in phrases if not _too_meta(p.lower())]
            phrases = [p for p in phrases if not re.search(r"\b(day|suggest|provide|return only)\b", p, re.IGNORECASE)]
            # Bucketize
            b_acts: List[str] = []
            b_foods: List[str] = []
            b_sights: List[str] = []
            for ph in phrases:
                cat = classify_phrase(ph)
                if cat == "food":
                    b_foods.append(ph)
                elif cat == "sights":
                    b_sights.append(ph)
                else:
                    b_acts.append(ph)
            # Bring in POIs and classify them as phrases too
            for poi in poi_list:
                cat = classify_phrase(poi)
                if cat == "food":
                    if poi not in b_foods:
                        b_foods.append(poi)
                elif cat == "sights":
                    if poi not in b_sights:
                        b_sights.append(poi)
                else:
                    if poi not in b_acts:
                        b_acts.append(poi)
            # Deduplicate while preserving order
            def unique_preserve(lst: List[str]) -> List[str]:
                seen = set()
                out: List[str] = []
                for x in lst:
                    k = x.strip()
                    if k and k.lower() not in seen:
                        seen.add(k.lower())
                        out.append(k)
                return out

            b_acts = unique_preserve(b_acts)
            b_foods = unique_preserve(b_foods)
            b_sights = unique_preserve(b_sights)

            # Hybrid: enrich buckets with curated anchors first
            def append_from_curated(bucket: List[str], curated: List[str], max_to_add: int) -> None:
                if not curated or max_to_add <= 0:
                    return
                for item in curated:
                    if len(bucket) >= max_to_add:
                        break
                    if item and item not in bucket:
                        bucket.append(item)

            append_from_curated(b_acts, curated_acts, max_to_add=max(3, len(b_acts)))
            append_from_curated(b_foods, curated_foods, max_to_add=max(3, len(b_foods)))
            append_from_curated(b_sights, curated_sights, max_to_add=max(2, len(b_sights)))

            # Ensure minimum items with varied, generic fallbacks
            act_fallbacks = [
                f"Explore {destination}",
                "City walk",
                "Photo walk",
                "Riverfront stroll",
                "Neighborhood exploration",
            ]
            food_fallbacks = [
                "Local cuisine tasting",
                "Street food tour",
                "Cafe stop",
                "Regional dinner",
                "Market bites",
            ]
            sight_fallbacks = [
                "Iconic landmark visit",
                "Historic district walk",
                "Museum stop",
                "Scenic viewpoint",
                "Garden visit",
            ]
            for fb in act_fallbacks:
                if len(b_acts) >= 3:
                    break
                if fb not in b_acts:
                    b_acts.append(fb)
            for fb in food_fallbacks:
                if len(b_foods) >= 3:
                    break
                if fb not in b_foods:
                    b_foods.append(fb)
            for fb in sight_fallbacks:
                if len(b_sights) >= 2:
                    break
                if fb not in b_sights:
                    b_sights.append(fb)

            # Shuffle buckets slightly to reduce identical ordering
            random.shuffle(b_acts)
            random.shuffle(b_foods)
            random.shuffle(b_sights)

            day_obj = {
                "date": None,
                "activities": [
                    pick_unique(b_acts, used_acts, f"Explore {destination}"),
                    pick_unique(b_acts, used_acts, "City walk"),
                    pick_unique(b_acts, used_acts, "Relax"),
                ],
                "food": [
                    pick_unique(b_foods, used_foods, "Local breakfast"),
                    pick_unique(b_foods, used_foods, "Popular lunch spot"),
                    pick_unique(b_foods, used_foods, "Street food dinner"),
                ],
                "sights": [
                    pick_unique(b_sights, used_sights, "Top landmark"),
                    pick_unique(b_sights, used_sights, "Neighborhood walk"),
                ],
            }
            days_out.append(day_obj)

        return {"days": days_out, "notes": "Personalized itinerary"}
    except Exception:
        # If generation not available, use curated/rule-based plan
        rb = _rule_based_itinerary(destination, days)
        if rb:
            return rb
        return _template_itinerary(destination, days, preferences)