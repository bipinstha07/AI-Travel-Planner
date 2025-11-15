from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from serpapi import GoogleSearch
from haversine import haversine, Unit
from dotenv import load_dotenv
import requests
import os
import re

# Load env variables
load_dotenv()
SERP_API_KEY = os.getenv("Serp_API")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------
# 1. Load INTERNATIONAL airports (large + medium w/ IATA)
# ---------------------------------------------------

AIRPORTS_URL = "https://ourairports.com/data/airports.csv"

def load_airports():
    airports = []
    print("Loading international airports...")

    raw = requests.get(AIRPORTS_URL).text.splitlines()

    for line in raw[1:]:  # skip header
        parts = line.split(",")

        try:
            airport_type = parts[2].strip('"')     # large_airport, medium_airport, small_airport
            iata = parts[13].strip('"')           # IATA code
            lat = parts[4].strip('"')
            lon = parts[5].strip('"')

            # Must have real IATA
            if not iata or iata == "\\N":
                continue

            # Include large + medium airports (Pokhara PKR is medium)
            if airport_type not in ["large_airport", "medium_airport"]:
                continue

            airports.append({
                "name": parts[3].strip('"'),
                "city": parts[10].strip('"'),
                "country": parts[8].strip('"'),
                "iata": iata,
                "lat": float(lat),
                "lon": float(lon)
            })

        except:
            continue

    print(f"Loaded {len(airports)} international airports.")
    return airports

AIRPORTS = load_airports()


# ---------------------------------------------------
# 2. UNIVERSAL COORDINATE EXTRACTION (BEST POSSIBLE)
# ---------------------------------------------------

def extract_gps(data):
    """Try many fields to find gps coordinates."""
    fields = [
        ("place_results", "gps_coordinates"),
        ("knowledge_graph", "gps_coordinates"),
    ]

    # 1. place_results + knowledge_graph
    for parent, key in fields:
        gps = data.get(parent, {}).get(key)
        if gps:
            return gps["latitude"], gps["longitude"]

    # 2. local_results list
    for loc in data.get("local_results", []):
        gps = loc.get("gps_coordinates")
        if gps:
            return gps["latitude"], gps["longitude"]

    # 3. inline_map
    inline_map = data.get("inline_map")
    if inline_map and "gps_coordinates" in inline_map:
        gps = inline_map["gps_coordinates"]
        return gps["latitude"], gps["longitude"]

    # 4. thumbnail → parse @lat,lon
    thumb = data.get("thumbnail")
    if thumb and "@" in str(thumb):
        m = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", str(thumb))
        if m:
            return float(m.group(1)), float(m.group(2))

    # Not found
    return None


def get_coordinates(query: str):

    q = query.lower()

    # ---- Query 1: type=place ----
    params1 = {
        "engine": "google_maps",
        "q": q,
        "type": "place",
        "api_key": SERP_API_KEY
    }
    r1 = GoogleSearch(params1).get_dict()
    gps = extract_gps(r1)
    if gps:
        return gps

    # ---- Query 2: type=search ----
    params2 = {
        "engine": "google_maps",
        "q": q,
        "type": "search",
        "api_key": SERP_API_KEY
    }
    r2 = GoogleSearch(params2).get_dict()
    gps = extract_gps(r2)
    if gps:
        return gps

    # ---- Query 3: fallback "place, country" auto-correction ----
    possible_countries = ["nepal", "india", "usa", "uk", "china", "japan"]

    for country in possible_countries:
        q2 = f"{q}, {country}"
        params3 = {
            "engine": "google_maps",
            "q": q2,
            "type": "search",
            "api_key": SERP_API_KEY
        }
        r3 = GoogleSearch(params3).get_dict()
        gps = extract_gps(r3)
        if gps:
            return gps

    return None


# ---------------------------------------------------
# 3. Country → Capital
# ---------------------------------------------------

def get_capital_if_country(query: str):
    try:
        res = requests.get(f"https://restcountries.com/v3.1/name/{query}").json()
        if isinstance(res, list):
            capitals = res[0].get("capital", [])
            if capitals:
                return capitals[0]
    except:
        return None
    return None


# ---------------------------------------------------
# 4. NEAREST INTERNATIONAL AIRPORT
# ---------------------------------------------------

def nearest_international_airport(lat, lon):
    closest = None
    min_dist = float("inf")

    for ap in AIRPORTS:
        dist = haversine((lat, lon), (ap["lat"], ap["lon"]), unit=Unit.KILOMETERS)
        if dist < min_dist:
            min_dist = dist
            closest = ap

    return closest, round(min_dist, 2)


# ---------------------------------------------------
# 5. API ENDPOINT
# ---------------------------------------------------
def resolve_airport_code(place: str):
    # Country → capital
    capital = get_capital_if_country(place)
    if capital:
        place = capital

    coords = get_coordinates(place)

    if not coords:
        return {"error": f"Could not find coordinates for '{place}'"}

    lat, lon = coords

    airport, distance = nearest_international_airport(lat, lon)

    return {
        "place": place,
        "place_coordinates": {"lat": lat, "lon": lon},
        "nearest_international_airport": airport["name"],
        "airport_code": airport["iata"],
        "airport_coordinates": {
            "lat": airport["lat"],
            "lon": airport["lon"]
        },
        "distance_km": distance
    }
