from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()


class Settings(BaseModel):
    hf_api_token: str | None = os.getenv("HF_API_TOKEN")
    # Default to a robust zero-shot NLI model for intent classification
    recommender_model: str = os.getenv("RECOMMENDER_MODEL", "facebook/bart-large-mnli")
    # Default itinerary generator model
    itinerary_model: str = os.getenv("ITINERARY_MODEL", "distilgpt2")
    # Optional external POI API integration
    poi_api_base: str | None = os.getenv("POI_API_BASE")
    poi_api_key: str | None = os.getenv("POI_API_KEY")
    poi_enabled: bool = os.getenv("POI_ENABLED", "false").strip().lower() in ("1", "true", "yes")
    # Provider selection: 'generic' or 'rapidapi_tripadvisor'
    poi_provider: str = os.getenv("POI_PROVIDER", "generic")
    # RapidAPI TripAdvisor host, e.g., travel-advisor.p.rapidapi.com
    rapidapi_tripadvisor_host: str = os.getenv("RAPIDAPI_TRIPADVISOR_HOST", "travel-advisor.p.rapidapi.com")


settings = Settings()