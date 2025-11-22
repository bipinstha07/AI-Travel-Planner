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
            print(f"⚠️ Could not connect to model {model_name}: {e}")
            print("➡️ Falling back to distilgpt2 (public cloud).")
            self.client = InferenceClient(model="distilgpt2")

    def chat_and_extract(self, message, state):

        # ---------------------------------------------------------------
        # INITIALIZE STATE
        # ---------------------------------------------------------------
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

        # ---------------------------------------------------------------
        # PRE-PROCESS DATE INPUT (MESSAGE LEVEL)
        # ---------------------------------------------------------------
        msg_lower = message.lower().strip()

        # tomorrow
        if "tomorrow" in msg_lower:
            state.extracted["start_date"] = (
                datetime.now() + timedelta(days=1)
            ).strftime("%Y-%m-%d")

        # next weekend
        elif "next weekend" in msg_lower:
            today = datetime.now()
            days_until_sat = (5 - today.weekday()) % 7
            next_sat = today + timedelta(days=days_until_sat)
            state.extracted["start_date"] = next_sat.strftime("%Y-%m-%d")

        # next week
        elif "next week" in msg_lower:
            state.extracted["start_date"] = (
                datetime.now() + timedelta(days=7)
            ).strftime("%Y-%m-%d")

        # next month
        elif "next month" in msg_lower:
            today = datetime.now()
            if today.month == 12:
                base = datetime(today.year + 1, 1, 1)
            else:
                base = datetime(today.year, today.month + 1, 1)

            if "early" in msg_lower or "beginning" in msg_lower:
                chosen = base
            elif "mid" in msg_lower:
                chosen = base + timedelta(days=14)
            elif "late" in msg_lower or "end" in msg_lower:
                chosen = base.replace(day=28)
            else:
                chosen = base

            state.extracted["start_date"] = chosen.strftime("%Y-%m-%d")

        # ---------------------------------------------------------------
        # MISSING FIELDS (WITH DATE LOCK FIX)
        # ---------------------------------------------------------------
        missing_fields = [k for k, v in state.extracted.items() if not v]

        # ❗ Fix: NEVER ask for start_date again if pre-parsed already filled it
        if state.extracted["start_date"]:
            if "start_date" in missing_fields:
                missing_fields.remove("start_date")

        # ---------------------------------------------------------------
        # BUILD PROMPT (with new rules)
        # ---------------------------------------------------------------
        prompt = f"""
You are a friendly AI travel planner.

We are gathering: destination, start_date, num_days, budget, departure_city, trip_type.
Current known info: {state.extracted}
User said: "{message}"

GENERAL RULES:
- Keep responses short, friendly, and warm.
- Ask only ONE missing detail at a time.
- Never ask for a field that is already filled.
- Never modify an existing field unless user explicitly says to change it.

DATE RULE FIX:
- If start_date has been set by system-level rules (tomorrow, next weekend, next week, next month),
  the model MUST treat it as final.
  - Today is {date_today}. - Natural options allowed: "tomorrow", "next week", "next weekend", "next month". 
  - DO NOT output ISO dates unless user explicitly asks. 
  - All dates must be future dates.
- The model MUST NOT ask again for start_date.
- Always move to the next missing field directly.

DESTINATION RULES:
- Accept real cities (Tokyo), countries (Japan), regions (Swiss Alps), named places (Banff).
- Reject generic nature words (mountain, forest, rainforest, island, desert, etc.)
- If user gives generic place → ask “Which specific place?” and suggest 3–5  examples of places like kathmandu, Sydney, Bali.

SUGGESTION RULES:
- Suggestions MUST relate to the next missing field.
- suggest 3–5  places like kathmandu, Sydney, Bali on the destination field.
- MAX 4 suggestions.
- Example budgets: "$1000-$2000", "$2000-$4000", "luxury", "no limit".

RESET RULES:
- If user says "reset", "start over", "new plan", "new trip", "new journey", reset everything.

DATE VALIDATION:
- If user provides a date, validate it’s a valid future date.
- If user provides a date in the past, reject it.
- If user provides a date in the future, accept it.
- If user provides a date in the past, reject it.
- if user provides date like "next month", "next week", "next weekend", "tomorrow", convert it to ISO date year-month-day.

RETURN JSON ONLY:
{{
  "reply": "text",
  "field_updates": {{}},
  "suggestions": ["one", "two"]
}}
"""

        # ---------------------------------------------------------------
        # CALL MODEL
        # ---------------------------------------------------------------
        try:
            response = self.client.chat.completions.create(
                model="meta-llama/Meta-Llama-3-8B-Instruct",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=380,
            )

            content = response.choices[0].message["content"].strip()
            json_start = content.find("{")
            json_end = content.rfind("}") + 1
            json_str = content[json_start:json_end]

            data = json.loads(json_str)

        except Exception as e:
            print(f"⚠️ JSON Error: {e}")
            return {
                "reply": "Sorry, I didn’t understand that. Try again.",
                "extracted": state.extracted,
                "suggestions": []
            }

        # ---------------------------------------------------------------
        # UPDATE FIELDS
        # ---------------------------------------------------------------
        for k, v in data.get("field_updates", {}).items():
            if v is None:
                continue

            value = str(v).strip().lower()

            # NUM DAYS NORMALIZATION
            if k == "num_days":
                cleaned = value.replace("days", "").replace("day", "")
                cleaned = cleaned.replace("to", "-").replace("–", "-").replace("—", "-")

                if "-" in cleaned:
                    try:
                        p = cleaned.split("-")
                        nums = [int(x.strip()) for x in p if x.strip().isdigit()]
                        if len(nums) == 2:
                            mid = (nums[0] + nums[1]) // 2
                            value = str(mid)
                    except:
                        pass
                else:
                    try:
                        value = str(int(cleaned.strip()))
                    except:
                        pass

            # Save value
            state.extracted[k] = value

        # ---------------------------------------------------------------
        # RECHECK MISSING (AFTER FIX)
        # ---------------------------------------------------------------
        missing_fields = [k for k, v in state.extracted.items() if not v]

        # Again remove start_date if already locked in
        if state.extracted["start_date"]:
            missing_fields = [f for f in missing_fields if f != "start_date"]

        # ---------------------------------------------------------------
        # FULLY COMPLETED
        # ---------------------------------------------------------------
        if not missing_fields:
            summary = (
                "All details collected! 🎉 Here’s your trip summary:\n\n"
                f"• Destination: {state.extracted['destination']}\n"
                f"• Start Date: {state.extracted['start_date']}\n"
                f"• Duration: {state.extracted['num_days']} days\n"
                f"• Budget: {state.extracted['budget']}\n"
                f"• Departure City: {state.extracted['departure_city']}\n"
                f"• Trip Type: {state.extracted['trip_type']}\n\n"
                "You can now generate your itinerary!"
            )

            return {
                "reply": summary,
                "extracted": state.extracted,
                "suggestions": []
            }

        # ---------------------------------------------------------------
        # NEXT QUESTION
        # ---------------------------------------------------------------
        next_field = missing_fields[0]

        if state.last_asked_field != next_field:
            reply = f"{data['reply']} Could you please provide your {next_field.replace('_', ' ')}?"
            state.last_asked_field = next_field
        else:
            reply = data["reply"]

        # Suggestions
        suggestions = data.get("suggestions", [])
        if suggestions:
            reply += " suggestions: " + ", ".join(suggestions)

        return {
            "reply": reply,
            "extracted": state.extracted,
            "suggestions": suggestions
        }

    def reset(self, state):
        state.extracted = {
            "destination": "",
            "start_date": "",
            "num_days": "",
            "budget": "",
            "departure_city": "",
            "trip_type": ""
        }
        state.last_asked_field = None
        print("🧹 Conversation reset.")
