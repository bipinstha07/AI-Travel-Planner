from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from serpapi import GoogleSearch
from dotenv import load_dotenv
import os

# --- Load environment variables ---
load_dotenv()
SERP_API_KEY = os.getenv("Serp_API")

# --- Maps Class ---
class Maps:
    def get_location(self, query: str):
        params = {
            "engine": "google_maps",
            "q": query,
            "type": "search",
            "api_key": SERP_API_KEY
        }
        search = GoogleSearch(params)
        return search.get_dict()


def get_location(q: str):
    """
    Endpoint to fetch map places and center coordinates for a given query.
    Example: /api/map?q=paris
    """
    maps = Maps(api_key=SERP_API_KEY)
    results = maps.get_location(q)

    local_results = results.get("local_results", [])
    locations = []

    for loc in local_results:
        gps = loc.get("gps_coordinates", {})
        if gps:  # ensure coordinates exist
            locations.append({
                "name": loc.get("title"),
                "address": loc.get("address"),
                "lat": gps.get("latitude"),
                "lng": gps.get("longitude"),
                "rating": loc.get("rating"),
            })

    # fallback center (use first result or default Paris)
    if locations:
        center = {"lat": locations[0]["lat"], "lng": locations[0]["lng"]}
    else:
        center = {"lat": 48.8566, "lng": 2.3522}  # Paris default

    return {
        "query": q,
        "center": center,
        "places": locations,
        "count": len(locations)
    }
