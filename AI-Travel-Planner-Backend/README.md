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

3. (Optional) Set tokens and model overrides via environment variables or `.env` file:

```
HF_API_TOKEN=your_token_here
RECOMMENDER_MODEL=facebook/bart-large-mnli
ITINERARY_MODEL=distilgpt2

# Enable POI provider (one of: generic, rapidapi_tripadvisor)
POI_PROVIDER=rapidapi_tripadvisor
POI_ENABLED=true
POI_API_KEY=your_rapidapi_key
RAPIDAPI_TRIPADVISOR_HOST=travel-advisor.p.rapidapi.com

# Chat & itinerary providers (choose one; or set CHAT_PROVIDER to force)

# Provider selection (optional): chutes | groq | local_openai
CHAT_PROVIDER=local_openai

# Chutes.ai (OpenAI-compatible)
CHUTES_API_KEY=cpk_...
CHUTES_API_BASE=https://api.chutes.ai/v1
CHUTES_MODEL=openai/gpt-oss-20b

# Groq
GROQ_API_KEY=...
GROQ_MODEL=llama3-8b-8192

# Local OpenAI-compatible server (vLLM / Transformers serve)
LOCAL_OPENAI_BASE=http://localhost:8010
LOCAL_OPENAI_API_KEY=EMPTY
LOCAL_OPENAI_MODEL=openai/gpt-oss-20b
```

> If you plan to use local transformers pipelines, install the appropriate frameworks (e.g., `torch`).

> To use a local server, start vLLM or Transformers serve on a different port from this FastAPI app (e.g., `8010`), set `LOCAL_OPENAI_BASE`, and restart the backend.

### Run a local server

Serve `gpt-oss` locally without external API keys:

```
# vLLM (example)
pip install --pre vllm==0.10.1+gptoss --extra-index-url https://wheels.vllm.ai/gpt-oss/ --extra-index-url https://download.pytorch.org/whl/nightly/cu128 --index-strategy unsafe-best-match
vllm serve openai/gpt-oss-20b --port 8010

# Transformers serve (example)
pip install -U transformers kernels torch
transformers serve --port 8010
```

Then set `LOCAL_OPENAI_BASE=http://localhost:8010` in `.env` and restart the backend.

## Run

Start the dev server:

```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Notes

- The recommender uses zero-shot classification when available; otherwise falls back to simple keyword heuristics.
- The itinerary endpoint returns a structured template now; parsing real text-generation output is a later milestone.
- CORS is enabled for local development.