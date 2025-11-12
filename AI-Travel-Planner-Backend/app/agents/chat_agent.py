import os
import json
from huggingface_hub import InferenceClient
from dotenv import load_dotenv
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

date_today = datetime.now().strftime("%Y-%m-%d")

class ChatAgent:
    def __init__(self, model_name="openai/gpt-oss-120b"):
        hf_token = os.getenv("HF_TOKEN")

        try:
            print(f"☁️ Using Hugging Face Inference API for {model_name}")
            self.client = InferenceClient(model=model_name, token=hf_token)
            print("✅ Connected to Hugging Face Cloud Model.")
        except Exception as e:
            print(f"⚠️ Could not connect to {model_name}: {e}")
            print("➡️ Falling back to distilgpt2 (public cloud).")
            self.client = InferenceClient(model="distilgpt2")

    def chat_and_extract(self, message, state):
        """
        Conversational AI travel assistant that gathers:
        destination, start_date, num_days, budget, departure_city, trip_type.
        - Re-asks only missing info naturally
        - Avoids robotic repetition
        - Updates fields if user changes info
        """

        # Initialize conversation memory
        if not hasattr(state, "extracted"):
            state.extracted = {
                "destination": "",
                "start_date": "",
                "num_days": "",
                "budget": "",
                "departure_city": "",
                "trip_type": ""
            }
        if not hasattr(state, "last_asked_field"):
            state.last_asked_field = None

        # Date normalization
        msg_lower = message.lower().strip()
        if "tomorrow" in msg_lower:
            state.extracted["start_date"] = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        elif "next week" in msg_lower:
            state.extracted["start_date"] = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

        # Identify missing fields
        missing_fields = [k for k, v in state.extracted.items() if not v]
        next_field = missing_fields[0] if missing_fields else None

        # Build prompt
        prompt = f"""
You are a friendly AI travel planner.
We are gathering: destination, start_date, num_days, budget, departure_city, trip_type.

Current known info: {state.extracted}
User just said: "{message}"

Rules:
- Ask only ONE missing detail at a time.
- Never repeat the same question twice in a row.
- Respond in 1–2 natural sentences, not robotic.
- If user provides a detail, acknowledge briefly and move to the next one.
- If all details are filled, summarize clearly.

Return JSON ONLY in this format:
{{
  "reply": "Your natural response to the user.",
  "field_updates": {{}}
}}
        """

        try:
            # Call model
            response = self.client.chat.completions.create(
                model="meta-llama/Meta-Llama-3-8B-Instruct",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=250
            )

            content = response.choices[0].message["content"].strip()
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            json_str = content[json_start:json_end]
            data = json.loads(json_str)

        except Exception as e:
            print(f"⚠️ Error during chat: {e}")
            return {"reply": "Sorry, I didn’t catch that properly.", "extracted": state.extracted}

        # Update provided fields
        for k, v in data.get("field_updates", {}).items():
            if v:
                state.extracted[k] = v.strip()

        # Recalculate missing fields after update
        missing_fields = [k for k, v in state.extracted.items() if not v]

        # ✅ All details filled → final summary
        if not missing_fields:
            reply = (
                f"All details collected ✅ Here's your trip summary:\n"
                f"\n Destination: {state.extracted['destination']}\n"
                f"\n Start Date: {state.extracted['start_date']}\n"
                f"\n Duration: {state.extracted['num_days']} days\n"
                f"\n Budget: {state.extracted['budget']}\n"
                f"\n Departure City: {state.extracted['departure_city']}\n"
                f"\n Trip Type: {state.extracted['trip_type']}\n"
                f"\n To Create New Itinerary Press the New Plan Above\n"
            )
            state.last_asked_field = None
        else:
            # Ask next missing field (avoid repeat)
            next_field = missing_fields[0]
            if state.last_asked_field != next_field:
                reply = f"{data['reply']} Could you please provide your {next_field.replace('_', ' ')}?"
                state.last_asked_field = next_field
            else:
                reply = f"{data['reply']}"

        return {"reply": reply, "extracted": state.extracted}

    def reset(self, state):
        """Resets conversation and memory."""
        state.context = []
        state.extracted = {
            "destination": "",
            "start_date": "",
            "num_days": "",
            "budget": "",
            "departure_city": "",
            "trip_type": ""
        }
        state.last_asked_field = None
        print("🧹 Conversation memory cleared.")
