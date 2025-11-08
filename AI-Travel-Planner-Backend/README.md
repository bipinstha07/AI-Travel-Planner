# AI Travel Planner Backend (FastAPI)

This is the FastAPI backend for the AI Travel Planner. It provides endpoints for:

- `GET /health` – simple health check
- `POST /api/recommendations/classify-intent` – classify user travel intent (labels + confidence)
- `POST /api/itinerary/generate` – generate a simple itinerary (templated fallback if ML libs unavailable)

## Setup

1. Create and activate a virtual environment (Windows PowerShell):

```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```
pip install -r requirements.txt
```

3. (Optional) Set Hugging Face token and model overrides via environment variables or `.env` file:

```
HF_API_TOKEN=your_token_here
RECOMMENDER_MODEL=facebook/bart-large-mnli
ITINERARY_MODEL=distilgpt2

# Enable POI provider (one of: generic, rapidapi_tripadvisor)
POI_PROVIDER=rapidapi_tripadvisor
POI_ENABLED=true
POI_API_KEY=your_rapidapi_key
RAPIDAPI_TRIPADVISOR_HOST=travel-advisor.p.rapidapi.com
```

> If you plan to use local transformers pipelines, install the appropriate frameworks (e.g., `torch`).

## Run

Start the dev server:

```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Notes

- The recommender uses zero-shot classification when available; otherwise falls back to simple keyword heuristics.
- The itinerary endpoint returns a structured template now; parsing real text-generation output is a later milestone.
- CORS is enabled for local development.