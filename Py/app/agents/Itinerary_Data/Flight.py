# Flight.py
from serpapi import GoogleSearch
from dotenv import load_dotenv
import os

load_dotenv()
SERP_API_KEY = os.getenv("Serp_API")


def get_flights(
    departure_id: str,
    arrival_id: str,
    outbound_date: str,
    return_date: str,
    currency: str = "USD"
):
    """
    Fetches flight options between two airports using SerpAPI Google Flights.
    Returns the complete SerpAPI response + a summarized section for convenience.
    """

    params = {
        "engine": "google_flights",
        "departure_id": departure_id,
        "arrival_id": arrival_id,
        "outbound_date": outbound_date,
        "return_date": return_date,
        "currency": currency,
        "hl": "en",
        "api_key": SERP_API_KEY
    }

    try:
        search = GoogleSearch(params)
        results = search.get_dict()   # entire response from SerpAPI

        # --- summary extraction (optional convenience) ---
        best_flights = results.get("best_flights", [])
        other_flights = results.get("other_flights", [])
        all_flights = (best_flights + other_flights)[:3]

        flights_summary = []
        for i, option in enumerate(all_flights, start=1):
            flight_legs = option.get("flights", [])
            total_duration = option.get("total_duration", "N/A")
            price = option.get("price", "N/A")
            airline_logo = option.get("airline_logo")
            flight_type = option.get("type", "N/A")

            if flight_legs:
                src_name = flight_legs[0]["departure_airport"]["name"]
                src_code = flight_legs[0]["departure_airport"]["id"]
                dest_name = flight_legs[-1]["arrival_airport"]["name"]
                dest_code = flight_legs[-1]["arrival_airport"]["id"]
            else:
                src_name, src_code, dest_name, dest_code = (
                    "Unknown", departure_id, "Unknown", arrival_id
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

        # ✅ include both: full SerpAPI raw data + readable summary
        full_response = {
            "search_metadata": results.get("search_metadata", {}),
            "search_parameters": results.get("search_parameters", {}),
            "price_insights": results.get("price_insights", {}),
            "airports": results.get("airports", []),
            "best_flights": results.get("best_flights", []),
            "other_flights": results.get("other_flights", []),
            "summary": {
                "route": f"{departure_id} → {arrival_id}",
                "flights_found": len(all_flights),
                "flights": flights_summary
            }
        }

        return full_response

    except Exception as e:
        return {"error": f"Error fetching flights: {str(e)}"}


# Example usage
if __name__ == "__main__":
    response = get_flights("PEK", "AUS", "2025-11-12", "2025-11-18")
    from pprint import pprint
    pprint(response)
