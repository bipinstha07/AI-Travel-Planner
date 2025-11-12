from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()


class Settings(BaseModel):
    hf_api_token: str | None = os.getenv("HF_API_TOKEN")
    # HuggingFace inference model for chat/itinerary when using provider 'hf_inference'
    hf_model: str = os.getenv("HF_MODEL", "unsloth/gemma-3-4b-it")
    # Default to a robust zero-shot NLI model for intent classification
    recommender_model: str = os.getenv("RECOMMENDER_MODEL", "facebook/bart-large-mnli")
    # Default itinerary generator model
    itinerary_model: str = os.getenv("ITINERARY_MODEL", "distilgpt2")
    # Optional explicit chat provider selection: chutes | groq | local_openai
    chat_provider: str = os.getenv("CHAT_PROVIDER", "").strip().lower()
    # Groq API (used for itinerary generation when configured)
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    groq_model: str = os.getenv("GROQ_MODEL", "llama3-8b-8192")
    # Optional external POI API integration
    poi_api_base: str | None = os.getenv("POI_API_BASE")
    poi_api_key: str | None = os.getenv("POI_API_KEY")
    poi_enabled: bool = os.getenv("POI_ENABLED", "false").strip().lower() in ("1", "true", "yes")
    # Provider selection: 'generic' or 'rapidapi_tripadvisor'
    poi_provider: str = os.getenv("POI_PROVIDER", "generic")
    # RapidAPI TripAdvisor host, e.g., travel-advisor.p.rapidapi.com
    rapidapi_tripadvisor_host: str = os.getenv("RAPIDAPI_TRIPADVISOR_HOST", "travel-advisor.p.rapidapi.com")
    # Chutes.ai (OpenAI-compatible) API for chat/itinerary generation
    chutes_api_key: str | None = os.getenv("CHUTES_API_KEY")
    chutes_api_base: str = os.getenv("CHUTES_API_BASE", "https://api.chutes.ai/v1")
    # Explicit model for Chutes provider
    chutes_model: str = os.getenv("CHUTES_MODEL", "openai/gpt-oss-20b")
    # Local OpenAI-compatible server (e.g., vLLM or Transformers serve)
    local_openai_base: str | None = os.getenv("LOCAL_OPENAI_BASE")
    local_openai_api_key: str | None = os.getenv("LOCAL_OPENAI_API_KEY")
    local_openai_model: str = os.getenv("LOCAL_OPENAI_MODEL", "openai/gpt-oss-20b")


settings = Settings()