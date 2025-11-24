from fastapi import APIRouter, Request

from app.agents.itinerary_agent2 import ItineraryAgent2

router = APIRouter()
itinerary_agent2 = ItineraryAgent2()

@router.post("/generate_itinerary")
async def generate_itinerary2(request: Request):
    data = await request.json()
    print(data)
    print("--------------------------------")
    print("--------------------------------")
    print(data.get("destination"))
    print("--------------------------------")
    print(data.get("start_date"))
    print("--------------------------------")
    print(data.get("num_days"))
    print("--------------------------------")
    print(data.get("budget"))
    print("--------------------------------")
    print(data.get("departure_city"))
    print("--------------------------------")
    print(data.get("trip_type"))
    print("--------------------------------")
    destination = data.get("destination")
    start_date = data.get("start_date")
    num_days = data.get("num_days")
    budget = data.get("budget")
    departure_city = data.get("departure_city")
    trip_type = data.get("trip_type")
    """Generate full itinerary once details are collected."""

    print(
        "🧭 Itinerary Inputs:",
        destination, start_date, num_days, budget, departure_city, trip_type
    )

    # Clean up num_days to extract just the number
    if isinstance(num_days, str):
        # Extract number from strings like "5 days" or "8 days"
        import re
        match = re.search(r'\d+', num_days)
        if match:
            num_days = int(match.group())
        else:
            num_days = 5  # default fallback
    elif not isinstance(num_days, int):
        num_days = 5  # default fallback

    # Clean up and validate start_date format
    if isinstance(start_date, str):
        start_date = start_date.strip()
        # Check if it's already in YYYY-MM-DD format
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', start_date):
            try:
                # Try to parse various date formats and convert to YYYY-MM-DD
                from datetime import datetime, date, timedelta
                
                # Check if it's just a number (like "20" for 20 days from now)
                if re.match(r'^\d+$', start_date):
                    days_from_now = int(start_date)
                    # Add 5 days buffer to the specified number of days
                    future_date = date.today() + timedelta(days=days_from_now + 5)
                    start_date = future_date.strftime("%Y-%m-%d")
                    print(f"📅 Parsed '{data.get('start_date')}' as {days_from_now} days + 5 buffer = {start_date}")
                else:
                    # Common date formats to try
                    date_formats = [
                        "%d %B %Y",      # "20 December 2024"
                        "%d %b %Y",      # "20 Dec 2024"
                        "%B %d %Y",      # "December 20 2024"
                        "%b %d %Y",      # "Dec 20 2024"
                        "%d/%m/%Y",      # "20/12/2024"
                        "%m/%d/%Y",      # "12/20/2024"
                        "%d-%m-%Y",      # "20-12-2024"
                        "%m-%d-%Y",      # "12-20-2024"
                    ]
                    
                    parsed_date = None
                    for fmt in date_formats:
                        try:
                            parsed_date = datetime.strptime(start_date, fmt)
                            break
                        except ValueError:
                            continue
                    
                    if parsed_date:
                        start_date = parsed_date.strftime("%Y-%m-%d")
                    else:
                        # Last chance: use future dates in ISO format (5 days from today)
                        fallback_date = date.today() + timedelta(days=5)
                        start_date = fallback_date.isoformat()  # ISO format YYYY-MM-DD
                        print(f"⚠️ Could not parse date '{data.get('start_date')}', using future ISO date: {start_date}")
                    
            except Exception as e:
                # Final fallback: use future dates in ISO format (5 days from today)
                from datetime import date, timedelta
                fallback_date = date.today() + timedelta(days=5)
                start_date = fallback_date.isoformat()  # ISO format YYYY-MM-DD
                print(f"⚠️ Date parsing error: {e}, using future ISO date: {start_date}")
    else:
        # If start_date is not a string, use future ISO format as last resort
        from datetime import date, timedelta
        fallback_date = date.today() + timedelta(days=5)
        start_date = fallback_date.isoformat()
        print(f"⚠️ start_date was not a string, using future ISO date: {start_date}")

        
    print("--------------------------------")

    itinerary = itinerary_agent2.generate_itinerary(
        destination,
        start_date,
        num_days,
        budget,
        departure_city,
        trip_type
    )

    return {"itinerary": itinerary}
