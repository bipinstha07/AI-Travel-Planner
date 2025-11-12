import os
import re
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from huggingface_hub import InferenceClient

# --- Import Maps data helper ---
from app.agents.Itinerary_Data.Maps import Maps
maps = Maps()

# --- Import hotel data helper ---
from app.agents.Itinerary_Data.Hotels import get_hotels
# --- Load environment variables ---
load_dotenv()
HF_TOKEN = os.getenv("HF_TOKEN")


class ItineraryAgent2:
    def __init__(self):
        """Initialize Hugging Face client."""
        self.client = InferenceClient(
            model="meta-llama/Meta-Llama-3-8B-Instruct",
            token=HF_TOKEN
        )

    

    # ======================================================
    # 🧠 Generate AI-enhanced itinerary (with hotel info + images)
    # ======================================================
    def generate_itinerary(self, destination, start_date, num_days, budget, departure_city, trip_type):
        try:
            # Convert start_date from string to datetime object if needed
            if isinstance(start_date, str):
                start_date = start_date.strip()
            # --- Format travel dates
            start = datetime.strptime(start_date, "%Y-%m-%d")
            end = start + timedelta(days=int(num_days) - 1)
            formatted_start = start.strftime("%d %b %Y")
            formatted_end = end.strftime("%d %b %Y")

            # --- Step 0: Fetch location data
            print("🌍 Fetching location data...")
            location = maps.get_location(destination)
            if isinstance(location, str):
                try:
                    location = json.loads(location)
                except:
                    location = {}


            # --- Step 1: Fetch hotel data
            print("🏨 Fetching hotel data...")
            hotels = get_hotels(destination, start_date, end.strftime("%Y-%m-%d"))
            if isinstance(hotels, str):
                try:
                    hotels = json.loads(hotels)
                except:
                    hotels = []

            # --- Step 2: Prepare hotel text summary for AI prompt
            hotel_context = (
                "\n".join([
                    f"{i+1}. {h['name']} — {h['price_per_night']} per night — {h['hotel_class']}★"
                    for i, h in enumerate(hotels[:5])
                ])
                if isinstance(hotels, list) else "No hotel data available."
            )

            # --- Step 3: Create structured prompt for AI
            prompt = f"""
You are an AI travel planner.

Generate a **{num_days}-day itinerary** for {destination}.
Trip Type: {trip_type}
Budget: {budget}
Departure City: {departure_city or 'Not specified'}
Dates: {formatted_start} to {formatted_end}

Top hotel options:
{hotel_context}

⚠️ STRICT FORMAT INSTRUCTIONS:
Each day MUST begin with a markdown header in this format:
## Day X: [Title of the day]

Follow this exact pattern for each day must follow strictly this format:
## Day 1: [Title]
- Morning: ...
- Afternoon: ...
- Evening: ...
Hotel Recommendation: ...
Restaurant Suggestion: ...
Travel Tip: ...

Repeat for all {num_days} days.
Do NOT merge all days into one section.

And at last give me a summary of the itinerary With the following information:
-Budget Breakdown: In percentage for each
-Total cost of the trip
-Note

"""

            # --- Step 4: Call Llama 3 API
            response = self.client.chat.completions.create(
                model="meta-llama/Meta-Llama-3-8B-Instruct",
                messages=[
                    {"role": "system", "content": "You are a helpful and structured travel itinerary planner."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1800
            )
            ai_output = response.choices[0].message["content"].strip()

            # --- Step 5: Split days robustly (handles multiple markdown formats)
            day_blocks = re.split(r"(?:##\s*Day\s*\d+:|Day\s*\d+:|\*\*Day\s*\d+:)", ai_output)
            headers = re.findall(r"(?:##\s*Day\s*\d+:|Day\s*\d+:|\*\*Day\s*\d+:)", ai_output)

            days_output = []
            for i, block in enumerate(day_blocks[1:]):  # Skip text before Day 1
                title = headers[i].replace("**", "").strip()
                days_output.append({
                    "day": title,
                    "description": block.strip()
                })

            


            # --- Step 6: Build clean structured response
            return {
                "destination": destination,
                "departure_city": departure_city,
                "trip_type": trip_type,
                "budget": budget,
                "dates": f"{formatted_start} - {formatted_end}",
                "hotels": [
                    {
                        "name": h.get("name"),
                        "description": h.get("description"),
                        "price_per_night": h.get("price_per_night"),
                        "hotel_class": h.get("hotel_class"),
                        "link": h.get("link"),
                        "images": h.get("images", [])[:3]  # Limit 3 images per hotel
                    }
                    for h in (hotels if isinstance(hotels, list) else [])
                ],
                "days": days_output,
                "location": location
            }

        except Exception as e:
            return {"error": str(e)}


# ======================================================
# 🧪 Example Run
# ======================================================
if __name__ == "__main__":
    agent = ItineraryAgent2()
    result = agent.generate_itinerary(
        destination="Paris, France",
        start_date="2025-12-10",
        num_days=5,
        budget="Mid-range",
        departure_city="Dallas",
        trip_type="Adventure"
    )
    print(json.dumps(result, indent=2))
