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
            "sights": ["Top landmark", "Neighborhood walk", "Scenic viewpoint"],
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
def _get_text_generator():
    """Return a callable that generates text using a configured provider.

    Priority:
    1) HuggingFace Inference if `HF_API_TOKEN` and `HF_MODEL` are set.
    2) Chutes.ai (OpenAI-compatible) if `CHUTES_API_KEY` is set.
    3) Groq if configured.
    4) Local OpenAI-compatible server (vLLM/Transformers serve) if set.
    """
    # Allow explicit override via CHAT_PROVIDER for uniformity
    provider_pref = getattr(settings, "chat_provider", "")

    # HuggingFace Inference provider
    hf_token = getattr(settings, "hf_api_token", None)
    hf_model = getattr(settings, "hf_model", None)
    if (provider_pref in ("", "hf_inference")) and hf_token and hf_model:
        import requests
        api_url = f"https://api-inference.huggingface.co/models/{hf_model}"

        def _gen(prompt: str) -> str:
            try:
                resp = requests.post(
                    api_url,
                    headers={
                        "Authorization": f"Bearer {hf_token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "inputs": prompt,
                        "parameters": {
                            "max_new_tokens": 512,
                            "temperature": 0.6,
                            "do_sample": True,
                        },
                    },
                    timeout=15,
                )
                if resp.status_code != 200:
                    return ""
                data = resp.json()
                if isinstance(data, list) and data:
                    first = data[0]
                    if isinstance(first, dict):
                        content = (first.get("generated_text") or "").strip()
                        return content
                if isinstance(data, str):
                    return data.strip()
                return ""
            except Exception:
                return ""

        return _gen

    chutes_key = getattr(settings, "chutes_api_key", None)
    if (provider_pref in ("", "chutes")) and chutes_key:
        import requests
        base = getattr(settings, "chutes_api_base", "https://api.chutes.ai/v1")
        model_name = getattr(settings, "chutes_model", "openai/gpt-oss-20b")

        def _gen(prompt: str) -> str:
            try:
                resp = requests.post(
                    f"{base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {chutes_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model_name,
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "You are a travel itinerary phrase generator. "
                                    "When asked for phrases for a city/day, output ONLY a comma-separated list. "
                                    "Favor specific named sights, neighborhoods, and local dishes of that city. "
                                    "No explanations, bullets, or sentences; use concise travel phrases."
                                ),
                            },
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.6,
                        "top_p": 0.9,
                        "max_tokens": 512,
                    },
                    timeout=12,
                )
                if resp.status_code != 200:
                    return ""
                data = resp.json()
                choices = data.get("choices") or []
                if not choices:
                    return ""
                msg = choices[0].get("message") or {}
                content = msg.get("content") or ""
                return content
            except Exception:
                return ""

        return _gen

    # Fallback to Groq if available
    groq_key = getattr(settings, "groq_api_key", None)
    if (provider_pref in ("", "groq")) and groq_key:
        from groq import Groq
        model_name = getattr(settings, "groq_model", "llama3-8b-8192")
        client = Groq(api_key=groq_key)

        def _gen(prompt: str) -> str:
            try:
                resp = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a travel itinerary phrase generator. "
                                "When asked for phrases for a city/day, output ONLY a comma-separated list. "
                                "Favor specific named sights, neighborhoods, and local dishes of that city. "
                                "No explanations, bullets, or sentences; use concise travel phrases."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.6,
                    top_p=0.9,
                    max_tokens=512,
                )
                choice = resp.choices[0]
                content = getattr(choice.message, "content", "")
                return content or ""
            except Exception:
                return ""

        return _gen

    # Local OpenAI-compatible provider (vLLM / Transformers serve)
    local_base = getattr(settings, "local_openai_base", None)
    if (provider_pref in ("", "local_openai")) and local_base:
        import requests
        base = str(local_base).rstrip("/")
        model_name = getattr(settings, "local_openai_model", "openai/gpt-oss-20b")
        api_key = getattr(settings, "local_openai_api_key", None)

        def _gen(prompt: str) -> str:
            try:
                headers = {"Content-Type": "application/json"}
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"
                resp = requests.post(
                    f"{base}/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": model_name,
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "You are a travel itinerary phrase generator. "
                                    "When asked for phrases for a city/day, output ONLY a comma-separated list. "
                                    "Favor specific named sights, neighborhoods, and local dishes of that city. "
                                    "No explanations, bullets, or sentences; use concise travel phrases."
                                ),
                            },
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.6,
                        "top_p": 0.9,
                        "max_tokens": 512,
                    },
                    timeout=12,
                )
                if resp.status_code != 200:
                    return ""
                data = resp.json()
                choices = data.get("choices") or []
                if not choices:
                    return ""
                msg = choices[0].get("message") or {}
                content = msg.get("content") or ""
                return content
            except Exception:
                return ""

        return _gen

    raise RuntimeError(
        "No text generation provider configured. Set CHUTES_API_KEY, GROQ_API_KEY, or LOCAL_OPENAI_BASE."
    )


def generate_itinerary(destination: str, days: int, preferences: List[str]) -> Dict:
    # Use LLM (Chutes.ai/Groq) phrase generation; curated lists disabled per request
    try:
        gen_text = _get_text_generator()

        food_kw = {
            # common dining and cuisine terms
            "restaurant","street food","bistro","brasserie","eatery","dining","cafe","café",
            "breakfast","lunch","dinner","coffee","bar","wine","champagne","bakery","patisserie","pâtisserie",
            "pastry","macaron","croissant","baguette","crepe","crêpe","seafood","grill","cheese","fromage",
            "charcuterie","market","boulangerie"
        }
        sights_kw = {
            # common sights/landmark terms, including French/European variants
            "museum","musée","basilica","basilique","cathedral","tower","park","market","beach","mountain",
            "landmark","palace","garden","bridge","old town","church","monument","castle","district","quartier",
            "stupa","shrine","durbar","bazaar","square","gate","opera","opéra","arc","avenue"
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
            # Allow longer proper-noun phrases; only reject if excessively long
            return len(s.split()) > 18

        def is_travel_phrase(p: str) -> bool:
            s = p.lower()
            if _too_meta(s):
                return False
            if len(s) < 3:
                return False
            # Accept 1-14 words; prefer travel-related or proper nouns
            if len(p.split()) < 1 or len(p.split()) > 14:
                return False
            travel_nouns = r"\b(tour|market|square|stupa|temple|shrine|museum|park|walk|food|cafe|restaurant|street|view|hike|bazaar|durbar|gate|palace|garden|district)\b"
            return (
                any(k in s for k in food_kw) or
                any(k in s for k in sights_kw) or
                any(k in s for k in act_kw) or
                bool(re.search(r"\b[A-Z][a-z]+\b", p)) or
                re.search(travel_nouns, s) is not None
            )

        def classify_phrase(p: str) -> str:
            s = p.lower()
            if any(k in s for k in food_kw):
                return "food"
            # Treat common temple/shrine/landmark keywords as sights
            if re.search(r"\b(dera|ji|jinja|do|dō|dou|stupa|durbar|bazaar|square|gate)\b", s):
                return "sights"
            if any(k in s for k in sights_kw):
                return "sights"
            if any(k in s for k in act_kw):
                return "activities"
            # Heuristic: if phrase contains multiple capitalized words, treat as sight
            if len(re.findall(r"\b[A-Z][a-z]+\b", p)) >= 2:
                return "sights"
            return "activities"

        used_acts: List[str] = []
        used_foods: List[str] = []
        used_sights: List[str] = []
        recent_window = 3

        def pick_unique(bucket: List[str], used: List[str], fallback: str) -> str:
            # Prefer items not used at all across previous days
            for idx, item in enumerate(bucket):
                if item and item not in used:
                    used.append(item)
                    # Remove the chosen item so it isn't selected again in the same day
                    del bucket[idx]
                    return item
            # If all items have been used at least once, avoid recent repeats
            for idx, item in enumerate(bucket):
                if item and item not in used[-recent_window:]:
                    used.append(item)
                    del bucket[idx]
                    return item
            # As a last resort, pick the first available item or fallback
            if bucket:
                item = bucket.pop(0)
                used.append(item)
                return item
            used.append(fallback)
            return fallback

        days_out: List[Dict] = []
        # Fetch POIs once and pass into prompts to act as content anchors
        primary_pref = preferences[0] if preferences else None
        poi_list = get_pois(destination, primary_pref, limit=12)
        poi_str = ", ".join(poi_list) if poi_list else ""

        # Generate one larger phrase set via LLM to reduce latency
        total_phrases = max(days * 24, 36)
        prompt = (
            f"Create {total_phrases} concise travel phrases for {destination}. "
            f"Use destination-specific proper nouns: real sights, neighborhoods, and local dishes. Use POIs if relevant: {poi_str}. "
            f"Mix activities, sights, and food aligned to preferences: {', '.join(preferences) if preferences else 'general'}. "
            "Avoid generic phrases (e.g., 'city walk', 'photo walk', 'iconic landmark'). "
            "If the destination is a country, focus on notable cities/regions within it. "
            "At least 70% of items must be named entities; do not invent non-existent places or foods. "
            "Each item 2-8 words, no sentences, no commentary. Return ONLY a comma-separated list."
        )
        text = gen_text(prompt)
        parts = re.split(r"[\n\r\.;,]+", text)
        phrases = [p.strip() for p in parts if p.strip()]
        phrases = [p for p in phrases if not _too_meta(p.lower())]
        phrases = [p for p in phrases if not re.search(r"\b(day|suggest|provide|return only)\b", p, re.IGNORECASE)]
        phrases = [p for p in phrases if is_travel_phrase(p)]

        # Bucketize from generated phrases and POIs
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

        # If buckets are too small to fill all requested days, top them up via LLM
        acts_needed = days * 3
        foods_needed = days * 3
        sights_needed = days * 3

        def _gen_category_phrases(category: str, n: int, poi_hint: str) -> List[str]:
            prompts = {
                "activities": (
                    f"Return EXACTLY {n} concise activity phrases for {destination}, comma-separated. "
                    f"Prefer named experiences, tours, districts, and outdoor actions. Use POIs if relevant: {poi_hint}. "
                    "Each item 2-8 words; no sentences or commentary."
                ),
                "food": (
                    f"Return EXACTLY {n} concise local food/dining phrases for {destination}, comma-separated. "
                    f"Prefer named dishes, markets, eateries, and specialties. Use POIs if relevant: {poi_hint}. "
                    "Each item 2-8 words; no sentences or commentary."
                ),
                "sights": (
                    f"Return EXACTLY {n} concise landmark/sight phrases for {destination}, comma-separated. "
                    f"Prefer named museums, temples, districts, viewpoints. Use POIs if relevant: {poi_hint}. "
                    "Each item 2-8 words; no sentences or commentary."
                ),
            }

            def _attempt(prompt: str) -> List[str]:
                txt = gen_text(prompt)
                parts_ex = re.split(r"[\n\r\.;,]+", txt)
                ph_ex = [p.strip() for p in parts_ex if p.strip()]
                # Loosen filters for category-first: remove strict travel checks, keep only meta rejection
                ph_ex = [p for p in ph_ex if not _too_meta(p.lower())]
                return ph_ex

            # Try up to 3 attempts with increasingly explicit instructions
            attempt_prompts = [
                prompts.get(category, prompts["activities"]),
                prompts.get(category, prompts["activities"]) + " Only output the list, no extra text.",
                prompts.get(category, prompts["activities"]) + " Do not include generic words; use named entities.",
            ]
            collected: List[str] = []
            for ap in attempt_prompts:
                if len(collected) >= n:
                    break
                items = _attempt(ap)
                for p in items:
                    if p and p not in collected:
                        collected.append(p)
                        if len(collected) >= n:
                            break

            # If we still have fewer than n, lightly pad with POIs relevant to the category
            if len(collected) < n and poi_hint:
                poi_candidates = [x.strip() for x in poi_hint.split(",") if x.strip()]
                for p in poi_candidates:
                    if p and p not in collected:
                        collected.append(p)
                        if len(collected) >= n:
                            break

            # Trim to n
            return collected[:n]

        # Category-first generation: request fixed counts directly from the LLM.
        # This ensures exactly 3 items per category per day without relying on classification.
        b_acts = _gen_category_phrases("activities", acts_needed, poi_str)
        b_foods = _gen_category_phrases("food", foods_needed, poi_str)
        b_sights = _gen_category_phrases("sights", sights_needed, poi_str)

        # Deduplicate again after top-up
        b_acts = unique_preserve(b_acts)
        b_foods = unique_preserve(b_foods)
        b_sights = unique_preserve(b_sights)

        # Final safety net: if food bucket is still short, relax and accept
        # remaining travel phrases (and POIs) that look food-related.
        def looks_like_food(p: str) -> bool:
            s = p.lower()
            if _too_meta(s) or len(s) < 3:
                return False
            foodish = r"\b(cafe|café|restaurant|brasserie|bistro|bistrot|market|bakery|boulangerie|patisserie|pâtisserie|wine|champagne|bar|cheese|fromage|charcuterie|pastry|macaron|croissant|baguette|crepe|crêpe|chocolat|dessert)\b"
            return any(k in s for k in food_kw) or re.search(foodish, s) is not None

        if len(b_foods) < foods_needed:
            relaxed_pool: List[str] = []
            for ph in phrases:
                if ph and ph not in b_foods and looks_like_food(ph):
                    relaxed_pool.append(ph)
            for poi in poi_list:
                if poi and poi not in b_foods and looks_like_food(poi):
                    relaxed_pool.append(poi)
            # As a last resort, allow any remaining travel phrase to ensure counts
            if len(b_foods) + len(relaxed_pool) < foods_needed:
                for ph in phrases:
                    if ph and ph not in b_foods and ph not in relaxed_pool:
                        relaxed_pool.append(ph)
                        if len(b_foods) + len(relaxed_pool) >= foods_needed:
                            break
            for x in relaxed_pool:
                if x not in b_foods:
                    b_foods.append(x)

        # Deduplicate once more after relaxed fill
        b_foods = unique_preserve(b_foods)

        # Shuffle so selections vary across days
        random.shuffle(b_acts)
        random.shuffle(b_foods)
        random.shuffle(b_sights)

        def take_unique(options: List[str], used: List[str], count: int) -> List[str]:
            out: List[str] = []
            # Pass 1: prefer items not used and not recently used
            while len(out) < count:
                picked = False
                for idx, opt in enumerate(options):
                    if opt and opt not in used and opt not in used[-recent_window:]:
                        used.append(opt)
                        del options[idx]
                        out.append(opt)
                        picked = True
                        break
                if not picked:
                    break
            # Pass 2: allow items not used at all
            while len(out) < count:
                picked = False
                for idx, opt in enumerate(options):
                    if opt and opt not in used:
                        used.append(opt)
                        del options[idx]
                        out.append(opt)
                        picked = True
                        break
                if not picked:
                    break
            # Pass 3: reuse items to ensure full counts
            while len(out) < count:
                if options:
                    opt = options.pop(0)
                    used.append(opt)
                    out.append(opt)
                elif used:
                    # pick any item not in very recent window, else last used
                    pick = None
                    for u in used:
                        if u not in used[-recent_window:]:
                            pick = u
                            break
                    if pick is None and used:
                        pick = used[-1]
                    if pick:
                        out.append(pick)
                        used.append(pick)
                else:
                    break
            return out

        for _ in range(days):
            day_obj = {
                "date": None,
                "activities": take_unique(b_acts, used_acts, 3),
                "food": take_unique(b_foods, used_foods, 3),
                "sights": take_unique(b_sights, used_sights, 3),
            }
            days_out.append(day_obj)

        return {"days": days_out, "notes": "Personalized itinerary"}
    except Exception as e:
        # Surface errors so caller can handle (no template fallbacks)
        raise e