import os
from gradio_client import Client
from dotenv import load_dotenv

# Load environment variables (optional, if you use a private HF token)
load_dotenv()

class ItineraryAgent:
    def __init__(self, space_id="PMGUYAT/travel-itinerary-agent"):
        """
        Connects to the Hugging Face Gradio Space for itinerary generation.
        """
        hf_token = os.getenv("HF_TOKEN")
        try:
            print(f"🌍 Connecting to Gradio Space: {space_id}")
            self.client = Client(space_id, hf_token)
            print("✅ Connected successfully.")
        except Exception as e:
            print(f"⚠️ Could not connect to Gradio Space: {e}")
            self.client = None

    def generate_itinerary(self, state):
        """
        Generate a travel itinerary using ConversationState values.

        Expected ConversationState fields:
          destination (str, required)
          start_date (str, required)
          num_days (float, default 3)
          budget ('Budget' | 'Mid-range' | 'Luxury', default 'Budget')
          departure_city (str, required)
          trip_type ('Leisure' | 'Adventure' | 'Spiritual' | 'Beach' | 'Heritage', default 'Leisure')
        """
        try:
            # ✅ Validate that all required fields exist
            required_fields = ["destination", "start_date", "num_days", "budget", "departure_city", "trip_type"]
            missing = [f for f in required_fields if getattr(state, f, None) in (None, "")]
            if missing:
                raise ValueError(f"Missing required fields: {', '.join(missing)}")

            print("🧾 Generating itinerary with:", state.to_dict())

            # ✅ Call Gradio Space endpoint
            result = self.client.predict(
                destination=state.destination,
                start_date=state.start_date,
                num_days=float(state.num_days or 3),
                budget=state.budget or "Budget",
                departure_city=state.departure_city or "",
                trip_type=state.trip_type or "Leisure",
                api_name="/generate_itinerary"
            )

            return {"itinerary": result}

        except Exception as e:
            print(f"⚠️ Error generating itinerary: {e}")
            return {
                "error": f"{e}",
                "destination": getattr(state, "destination", "unknown")
            }
