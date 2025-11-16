# Airport_helper.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from serpapi import GoogleSearch
from haversine import haversine, Unit
from dotenv import load_dotenv
import requests
import os
import re
import csv
from io import StringIO

# Load ENV
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
# PRIVATE AIRPORTS BLACKLIST (Business jet only)
# ---------------------------------------------------
PRIVATE_AIRPORT_BLACKLIST = {
    "LBG",   # Paris-Le Bourget
    "TNF",   # Toussus-le-Noble
    "JLN",   # example private
}

# ---------------------------------------------------
# 1. LOAD COMMERCIAL AIRPORTS
# ---------------------------------------------------

AIRPORTS_URL = "https://ourairports.com/data/airports.csv"


def load_airports():
    airports = []
    print("Loading commercial airports...")

    raw = requests.get(AIRPORTS_URL).text
    csv_file = csv.reader(StringIO(raw))
    header = next(csv_file)

    for row in csv_file:
        try:
            airport_type = row[2]       # large_airport, medium_airport, small_airport
            name = row[3]
            lat = row[4]
            lon = row[5]
            country = row[8]
            city = row[10]
            iata = row[13]
            scheduled = row[18]         # yes/no

            # Skip private airports
            if iata in PRIVATE_AIRPORT_BLACKLIST:
                continue

            # Must have valid 3-letter IATA
            if not iata or iata == "\\N" or len(iata) != 3:
                continue

            # Large & medium airports → always commercial
            if airport_type in ["large_airport", "medium_airport"]:
                pass

            # Small airports → require scheduled=yes
            elif airport_type == "small_airport":
                if not scheduled or scheduled.lower() not in ["yes", "true", "1"]:
                    continue
            else:
                continue

            airports.append({
                "name": name,
                "city": city,
                "country": country,
                "iata": iata,
                "lat": float(lat),
                "lon": float(lon),
                "type": airport_type,
            })

        except:
            continue

    print(f"Loaded {len(airports)} commercial airports.")
    return airports


# Load airports globally
AIRPORTS = load_airports()

# ---------------------------------------------------
# 2. GPS EXTRACTION FROM SERPAPI RESULTS
# ---------------------------------------------------

def extract_gps(data):

    # Primary fields
    fields = [
        ("place_results", "gps_coordinates"),
        ("knowledge_graph", "gps_coordinates"),
    ]

    for parent, key in fields:
        gps = data.get(parent, {}).get(key)
        if gps:
            return gps["latitude"], gps["longitude"]

    # Local results list
    for loc in data.get("local_results", []):
        gps = loc.get("gps_coordinates")
        if gps:
            return gps["latitude"], gps["longitude"]

    # Inline map
    inline_map = data.get("inline_map")
    if inline_map and "gps_coordinates" in inline_map:
        gps = inline_map["gps_coordinates"]
        return gps["latitude"], gps["longitude"]

    # Thumbnail fallback @lat,lon
    thumb = data.get("thumbnail")
    if thumb and "@" in str(thumb):
        m = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", str(thumb))
        if m:
            return float(m.group(1)), float(m.group(2))

    return None


def get_coordinates(query: str):
    q = query.lower()

    # 1. type=place
    r1 = GoogleSearch({
        "engine": "google_maps",
        "q": q,
        "type": "place",
        "api_key": SERP_API_KEY
    }).get_dict()

    gps = extract_gps(r1)
    if gps:
        return gps

    # 2. type=search
    r2 = GoogleSearch({
        "engine": "google_maps",
        "q": q,
        "type": "search",
        "api_key": SERP_API_KEY
    }).get_dict()

    gps = extract_gps(r2)
    if gps:
        return gps

    # 3. Fallback to append country names
    fallback_countries = ["nepal", "india", "usa", "uk", "china", "japan"]
    for country in fallback_countries:
        r3 = GoogleSearch({
            "engine": "google_maps",
            "q": f"{q}, {country}",
            "type": "search",
            "api_key": SERP_API_KEY
        }).get_dict()

        gps = extract_gps(r3)
        if gps:
            return gps

    return None

# ---------------------------------------------------
# 3. COUNTRY → CAPITAL LOOKUP
# ---------------------------------------------------

def get_capital_if_country(query: str):
    try:
        res = requests.get(f"https://restcountries.com/v3.1/name/{query}").json()
        if isinstance(res, list):
            capitals = res[0].get("capital", [])
            if capitals:
                return capitals[0]
    except:
        pass
    return None

# ---------------------------------------------------
# 4. NEAREST COMMERCIAL AIRPORT
# ---------------------------------------------------

def nearest_international_airport(lat, lon):
    closest = None
    min_dist = float("inf")

    for ap in AIRPORTS:
        dist = haversine((lat, lon), (ap["lat"], ap["lon"]), unit=Unit.KILOMETERS)
        if dist < min_dist:
            closest = ap
            min_dist = dist

    return closest, round(min_dist, 2)

# ---------------------------------------------------
# 5. MAIN RESOLVE FUNCTION (SAME RESPONSE FORMAT)
# ---------------------------------------------------

def resolve_airport_code(place: str):
    """
    Convert a place → its nearest commercial airport.
    Return structure is EXACTLY the same as your original.
    """

    # Convert country to capital automatically
    capital = get_capital_if_country(place)
    if capital:
        place = capital

    coords = get_coordinates(place)
    if not coords:
        return {"error": f"Could not find coordinates for '{place}'"}

    lat, lon = coords

    airport, distance = nearest_international_airport(lat, lon)

    if airport is None:
        return {"error": "No commercial airport found near this location"}

    # SAME RESPONSE FORMAT AS BEFORE
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
