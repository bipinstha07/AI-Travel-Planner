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

        # ------------------- Tomorrow -------------------
        if "tomorrow" in msg_lower:
            state.extracted["start_date"] = (
                datetime.now() + timedelta(days=1)
            ).strftime("%Y-%m-%d")

        # ------------------- Next Weekend -------------------
        elif "next weekend" in msg_lower:
            today = datetime.now()
            days_until_sat = (5 - today.weekday()) % 7
            next_sat = today + timedelta(days=days_until_sat)
            state.extracted["start_date"] = next_sat.strftime("%Y-%m-%d")

        # ------------------- Next Week -------------------
        elif "next week" in msg_lower:
            state.extracted["start_date"] = (
                datetime.now() + timedelta(days=7)
            ).strftime("%Y-%m-%d")

        # ------------------- Next Month -------------------
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
        # MISSING FIELDS
        # ---------------------------------------------------------------
        missing_fields = [k for k, v in state.extracted.items() if not v]
        next_field = missing_fields[0] if missing_fields else None

        # ---------------------------------------------------------------
        # BUILD PROMPT
        # ---------------------------------------------------------------
        prompt = f"""
You are a friendly AI travel planner.

We are gathering: destination, start_date, num_days, budget, departure_city, trip_type.
Current known info: {state.extracted}
User said: "{message}"

GENERAL RULES:
- When the user greets you, greet them back and ask for their destination.
- Keep your answers short, warm, and easy to read.

DESTINATION RULES:
- Accept real destinations:
  cities (Paris, Tokyo), regions (Swiss Alps), named parks (Banff).
- Reject generic nature words:
  rainforest, forest, jungle, mountains, mountain range, beach, island, lake, desert, valley, canyon.
- If generic: ask "Which specific place?" and provide 3–5 real examples.

DATE RULES:
- Today is {date_today}.
- Natural options allowed: "tomorrow", "next week", "next weekend", "next month".
- DO NOT output ISO dates unless user explicitly asks.
- All dates must be future dates.

CONVERSATION RULES:
- Ask only one missing detail at a time.
- Do NOT repeat questions.
- If user says “more” → generate new suggestions.
- After user gives info → acknowledge and move to next field.

SUGGESTION RULES:
- Suggestions MUST relate to the *next missing field*.
- MAX 4 suggestions.
- Must be short (1–4 words).
- Never break numbers across lines.
- Budget examples: "$1000-$2000", "$2000-$4000", "luxury", "no limit".
- Always use single-hyphen numeric ranges: "$4000-$6000".

RETURN JSON ONLY:
{{
  "reply": "text",
  "field_updates": {{}},
  "suggestions": ["one", "two", "three"]
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
        # UPDATE FIELDS (WITH FULL NORMALIZATION)
        # ---------------------------------------------------------------
        for k, v in data.get("field_updates", {}).items():
            if v is None:
                continue

            value = str(v).strip().lower()

            # ==============================
            # START DATE NORMALIZATION
            # ==============================
            if k == "start_date":

                # tomorrow
                if "tomorrow" in value:
                    value = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

                # next weekend
                elif "next weekend" in value:
                    today = datetime.now()
                    days_until_sat = (5 - today.weekday()) % 7
                    next_sat = today + timedelta(days=days_until_sat)
                    value = next_sat.strftime("%Y-%m-%d")

                # next week
                elif "next week" in value:
                    value = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

                # next month + variants
                elif "next month" in value:
                    today = datetime.now()
                    if today.month == 12:
                        base = datetime(today.year + 1, 1, 1)
                    else:
                        base = datetime(today.year, today.month + 1, 1)

                    if "early" in value or "beginning" in value:
                        chosen = base
                    elif "mid" in value:
                        chosen = base + timedelta(days=14)
                    elif "late" in value or "end" in value:
                        chosen = base.replace(day=28)
                    else:
                        chosen = base

                    value = chosen.strftime("%Y-%m-%d")

            # ==============================
            # NUM DAYS NORMALIZATION
            # ==============================
            if k == "num_days":
                cleaned = value.replace("days", "").replace("day", "")
                cleaned = cleaned.replace("to", "-").replace("–", "-").replace("—", "-")

                if "-" in cleaned:
                    try:
                        p = cleaned.split("-")
                        nums = [int(x.strip()) for x in p if x.strip().isdigit()]
                        if len(nums) == 2:
                            mid = (nums[0] + nums[1]) // 2
                            value = str(mid)  # store middle value only
                    except:
                        pass
                else:
                    try:
                        value = str(int(cleaned.strip()))
                    except:
                        pass

            # Save normalized value
            state.extracted[k] = value

        # ---------------------------------------------------------------
        # RECHECK MISSING
        # ---------------------------------------------------------------
        missing_fields = [k for k, v in state.extracted.items() if not v]

        # ---------------------------------------------------------------
        # FINAL SUMMARY
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

        # ---------------------------------------------------------------
        # SUGGESTIONS
        # ---------------------------------------------------------------
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
