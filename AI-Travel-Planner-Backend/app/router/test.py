from fastapi import APIRouter
from app.agents.Itinerary_Data.Flight import get_flights
from fastapi import Request
import os

router = APIRouter()



@router.post("/flight")
async def get_flight(request: Request):
    data = await request.json()
    departure_id = data.get("departure_id")
    arrival_id = data.get("arrival_id")
    outbound_date = data.get("outbound_date")
    return_date = data.get("return_date")
    currency = data.get("currency")
   
    result = get_flights(departure_id, arrival_id, outbound_date, return_date, currency)
    return result
