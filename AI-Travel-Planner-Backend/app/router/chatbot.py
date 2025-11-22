from fastapi import APIRouter, Request
from app.agents.chat_agent import ChatAgent
from app.agents.state import ConversationState
from app.agents.itinerary_agent2 import ItineraryAgent2

router = APIRouter()

# Initialize global agents and state
chat_agent = ChatAgent()
itinerary_agent2 = ItineraryAgent2()
state = ConversationState()


@router.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_message = data.get("user_message", "").strip()

    if not user_message:
        return {"error": "No message provided."}

    # --- Step 1: ChatAgent processes message and extracts variables
    result = chat_agent.chat_and_extract(user_message, state)

    # Debug logs
    print("🗣️ User Message:", user_message)
    print("🔍 Extracted:", result["extracted"])
    print("🧠 State before update:", state.to_dict())

    # --- Step 2: Store conversation history
    state.context.append(f"User: {user_message}")
    state.context.append(f"Assistant: {result['reply']}")

    # --- Step 3: Update state values (allow update if value found)
    for key, value in result["extracted"].items():
        if value:  # ✅ Allow overwrite if new valid info found
            setattr(state, key, value)

    print("🧩 State after update:", state.to_dict())

    # --- Step 4: Check if all required trip details collected
    if state.is_complete():
        summary = f"""
        All details collected ✅ Here's your trip details for {state.destination}:

        • Destination: {state.destination}
        • Start Date: {state.start_date}
        • Number of Days: {state.num_days}
        • Budget: {state.budget}
        • Departure City: {state.departure_city}
        • Trip Type: {state.trip_type}
         suggestions: Create new plan\n\n
        """
        
        return {
            "reply": summary,
            "variables": state.to_dict(),
            "done": True
        }

    # --- Step 5: Continue conversation if not complete
    
    return {
        "reply": result["reply"],
        "variables": state.to_dict(),
        "done": False
    }


@router.post("/reset_chat")
async def reset(request: Request):
    """Reset conversation memory."""
    chat_agent.reset(state)
    state.reset()
    return {"message": "Conversation memory cleared."}


@router.get("/generate_itinerary")
async def generate_itinerary2():
    """Generate full itinerary once details are collected."""
    destination = state.destination
    start_date = state.start_date
    num_days = state.num_days
    budget = state.budget
    departure_city = state.departure_city
    trip_type = state.trip_type

    print(
        "🧭 Itinerary Inputs:",
        destination, start_date, num_days, budget, departure_city, trip_type
    )

    itinerary = itinerary_agent2.generate_itinerary(
        destination,
        start_date,
        num_days,
        budget,
        departure_city,
        trip_type
    )

    return {"itinerary": itinerary}
