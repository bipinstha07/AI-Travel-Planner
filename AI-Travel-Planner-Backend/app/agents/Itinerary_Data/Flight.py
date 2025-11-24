# Flight.py
from serpapi import GoogleSearch
from dotenv import load_dotenv
from app.agents.Itinerary_Data.Airport_helper import resolve_airport_code, AIRPORTS
from haversine import haversine, Unit
import os

load_dotenv()
SERP_API_KEY = os.getenv("Serp_API")


def get_nearest_airports(lat, lon, limit=5):
    """Return the nearest `limit` commercial airports sorted by distance."""
    sorted_airports = sorted(
        AIRPORTS,
        key=lambda ap: haversine((lat, lon), (ap["lat"], ap["lon"]), unit=Unit.KILOMETERS)
    )
    return sorted_airports[:limit]


def try_flight(dep_code, arr_code, outbound_date, return_date, currency):
    """Try one flight search via SerpAPI."""
    params = {
        "engine": "google_flights",
        "departure_id": dep_code,
        "arrival_id": arr_code,
        "outbound_date": outbound_date,
        "return_date": return_date,
        "currency": currency,
        "hl": "en",
        "api_key": SERP_API_KEY
    }

    search = GoogleSearch(params)
    results = search.get_dict()

    if results.get("best_flights") or results.get("other_flights"):
        return results

    return None


def get_flights(
    departure_id: str,
    arrival_id: str,
    outbound_date: str,
    return_date: str,
    currency: str = "USD"
):
    """
    Fetch flight options.
    If no flights found → try next nearest airports until flights appear.
    """

    # -----------------------------------------
    # Resolve departure + arrival place + airport
    # -----------------------------------------
    dep_info = resolve_airport_code(departure_id)
    arr_info = resolve_airport_code(arrival_id)

    if "error" in dep_info or "error" in arr_info:
        return {"error": "Could not resolve airports."}

    dep_lat = dep_info["place_coordinates"]["lat"]
    dep_lon = dep_info["place_coordinates"]["lon"]

    arr_lat = arr_info["place_coordinates"]["lat"]
    arr_lon = arr_info["place_coordinates"]["lon"]

    # Find top 5 nearest airports to both locations
    dep_airports = get_nearest_airports(dep_lat, dep_lon)
    arr_airports = get_nearest_airports(arr_lat, arr_lon)

    final_results = None
    final_dep_code = None
    final_arr_code = None

    # -----------------------------------------
    # Try airport combinations (nearest first)
    # -----------------------------------------
    for dep_ap in dep_airports:
        for arr_ap in arr_airports:

            dep_code = dep_ap["iata"]
            arr_code = arr_ap["iata"]

            print(f"Trying {dep_code} → {arr_code}")

            result = try_flight(
                dep_code, arr_code,
                outbound_date, return_date, currency
            )

            if result:
                final_results = result
                final_dep_code = dep_code
                final_arr_code = arr_code
                break

        if final_results:
            break

    if not final_results:
        return {"error": "No flights found for any nearby airport combinations."}

    # -----------------------------------------
    # Build return structure
    # -----------------------------------------
    best_flights = final_results.get("best_flights", [])
    other_flights = final_results.get("other_flights", [])
    all_flights = (best_flights + other_flights)[:3]

    flights_summary = []

    for i, option in enumerate(all_flights, start=1):
        flight_legs = option.get("flights", [])
        total_duration = option.get("total_duration", "N/A")
        price = option.get("price", "N/A")
        airline_logo = option.get("airline_logo")
        flight_type = option.get("type", "N/A")

        # From → To
        if flight_legs:
            src_name = flight_legs[0]["departure_airport"]["name"]
            src_code = flight_legs[0]["departure_airport"]["id"]
            dest_name = flight_legs[-1]["arrival_airport"]["name"]
            dest_code = flight_legs[-1]["arrival_airport"]["id"]
        else:
            src_name, src_code, dest_name, dest_code = (
                "Unknown", final_dep_code, "Unknown", final_arr_code
            )

        layovers = [
            f"{l['name']} ({l['duration']} min)"
            for l in option.get("layovers", [])
        ] or ["None"]

        legs = []
        for leg in flight_legs:
            legs.append({
                "airline": leg.get("airline"),
                "flight_number": leg.get("flight_number"),
                "departure": leg["departure_airport"]["name"],
                "arrival": leg["arrival_airport"]["name"],
                "duration_min": leg.get("duration"),
                "airplane": leg.get("airplane"),
                "travel_class": leg.get("travel_class"),
                "legroom": leg.get("legroom"),
                "airline_logo": leg.get("airline_logo")
            })

        flights_summary.append({
            "rank": i,
            "route": f"{src_name} ({src_code}) → {dest_name} ({dest_code})",
            "type": flight_type,
            "price": f"{price} {currency}",
            "total_duration_min": total_duration,
            "layovers": layovers,
            "legs": legs,
            "airline_logo": airline_logo
        })

    # -----------------------------------------
    # FINAL RESPONSE (same structure as before)
    # -----------------------------------------

    
    final_response = {
        "search_metadata": final_results.get("search_metadata", {}),
        "search_parameters": final_results.get("search_parameters", {}),
        "price_insights": final_results.get("price_insights", {}),
        "airports": final_results.get("airports", []),
        "best_flights": final_results.get("best_flights", []),
        "other_flights": final_results.get("other_flights", []),
        "summary": {
            "route": f"{final_dep_code} → {final_arr_code}",
            "flights_found": len(all_flights),
            "flights": flights_summary
        }
    }

    # -----------------------------------------
    # ⭐ ADDING COORDINATES (YOUR REQUIREMENT)
    # -----------------------------------------
    final_response["coordinates"] = {
        "departure_place": dep_info.get("place_coordinates"),
        "departure_airport": dep_info.get("airport_coordinates"),
        "arrival_place": arr_info.get("place_coordinates"),
        "arrival_airport": arr_info.get("airport_coordinates")
    }

    

    return final_response
