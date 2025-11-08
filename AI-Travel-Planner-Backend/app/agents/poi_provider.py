from __future__ import annotations

from typing import List, Optional
import requests
from pathlib import Path
import json
from functools import lru_cache

from ..config import settings


def _load_curated_places() -> dict:
    path = Path(__file__).parent.parent / "data" / "places.json"
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


DEFAULT_POIS: dict[str, List[str]] = {
    "Kyoto": [
        "Kiyomizu-dera",
        "Fushimi Inari Taisha",
        "Gion District",
        "Kinkaku-ji",
        "Arashiyama Bamboo Grove",
    ],
}


@lru_cache(maxsize=128)
def get_pois(destination: str, category: Optional[str] = None, limit: int = 10) -> List[str]:
    """
    Return points of interest for a destination.

    Order of sources:
    1) External API if enabled via config (POI_API_BASE, POI_API_KEY)
    2) Curated places.json (sights/activities/food combined depending on category)
    3) Small built-in defaults for known cities
    """
    dest = (destination or "").strip()
    cat = (category or "").strip().lower()

    # Try external API if enabled
    items: List[str] = []
    if settings.poi_enabled:
        try:
            if settings.poi_provider.strip().lower() == "rapidapi_tripadvisor":
                # Call TripAdvisor via RapidAPI: locations/search
                host = settings.rapidapi_tripadvisor_host
                url = f"https://{host}/locations/search"
                params = {
                    "query": dest,
                    # Keep remote result set modest to reduce latency
                    "limit": str(min(max(limit * 2, 12), 24)),
                    "lang": "en_US",
                }
                headers = {
                    "X-RapidAPI-Key": settings.poi_api_key or "",
                    "X-RapidAPI-Host": host,
                }
                r = requests.get(url, params=params, headers=headers, timeout=6)
                r.raise_for_status()
                data = r.json()
                # Expected shape: { data: [ { result_type, result_object: { name, category } } ] }
                arr = []
                if isinstance(data, dict):
                    arr = data.get("data", []) or data.get("results", [])
                elif isinstance(data, list):
                    arr = data
                for it in arr:
                    try:
                        rt = str(it.get("result_type", "") or "").lower()
                        ro = it.get("result_object") or {}
                        name = ro.get("name") if isinstance(ro, dict) else None
                        if not isinstance(name, str):
                            name = it.get("name") if isinstance(it.get("name"), str) else None
                        if not name:
                            continue
                        # Filter by category preference
                        if cat == "food" and rt != "restaurants":
                            continue
                        if cat in ("culture", "city") and rt != "attractions" and rt != "geos":
                            continue
                        items.append(name)
                    except Exception:
                        continue
            elif settings.poi_api_base:
                # Generic provider: GET {base}/pois?destination=&category=
                url = f"{settings.poi_api_base.rstrip('/')}/pois"
                params = {"destination": dest}
                if cat:
                    params["category"] = cat
                headers = {}
                if settings.poi_api_key:
                    headers["Authorization"] = f"Bearer {settings.poi_api_key}"
                r = requests.get(url, params=params, headers=headers, timeout=6)
                r.raise_for_status()
                data = r.json()
                # Expect list of dicts or strings; normalize to string names
                if isinstance(data, list):
                    for it in data:
                        if isinstance(it, str):
                            items.append(it)
                        elif isinstance(it, dict):
                            name = it.get("name") or it.get("title")
                            if isinstance(name, str):
                                items.append(name)
                elif isinstance(data, dict):
                    arr = data.get("items") or data.get("pois") or []
                    if isinstance(arr, list):
                        for it in arr:
                            if isinstance(it, str):
                                items.append(it)
                            elif isinstance(it, dict):
                                name = it.get("name") or it.get("title")
                                if isinstance(name, str):
                                    items.append(name)
        except Exception:
            items = []

    # Fallback to curated places.json
    if not items:
        curated = _load_curated_places().get(dest) or {}
        if isinstance(curated, dict):
            sights: List[str] = curated.get("sights", []) or []
            acts: List[str] = curated.get("activities", []) or []
            foods: List[str] = curated.get("food", []) or []
            pool: List[str] = []
            if cat == "food":
                pool = foods
            elif cat == "culture" or cat == "city":
                pool = sights + acts
            else:
                pool = sights + acts + foods
            items = [x for x in pool if isinstance(x, str) and x.strip()]

    # Last resort: built-in defaults
    if not items:
        items = DEFAULT_POIS.get(dest, [])

    # Dedup and limit
    seen = set()
    out: List[str] = []
    for x in items:
        k = x.strip()
        if k and k.lower() not in seen:
            seen.add(k.lower())
            out.append(k)
        if len(out) >= limit:
            break
    return out