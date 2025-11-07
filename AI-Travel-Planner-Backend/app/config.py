from pydantic import BaseModel
import os


class Settings(BaseModel):
    hf_api_token: str | None = os.getenv("HF_API_TOKEN")
    # Default to a DistilBERT MNLI model for zero-shot classification
    recommender_model: str = os.getenv("RECOMMENDER_MODEL", "typeform/distilbert-base-uncased-mnli")
    itinerary_model: str = os.getenv("ITINERARY_MODEL", "distilgpt2")


settings = Settings()