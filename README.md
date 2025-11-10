# 🌍 AI Travel Planner

AI Travel Planner is a full-stack project combining a **React + TypeScript (Yarn)** frontend and a **Python FastAPI** backend powered by **Hugging Face models (DistilBERT + DistilGPT-2)** to classify travel intent and generate personalized itineraries.

## 🚀 Setup

```bash
cd AI-Travel-Planner-Frontend
yarn install
yarn dev

Backend
cd AI-Travel-Planner-Backend
python -m venv .venv
source .venv/bin/activate  # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
uvicorn app.main:app --reload

Features

AI chat interface for travel planning

Intent classification via DistilBERT

Itinerary generation via DistilGPT-2

Responsive UI with TailwindCSS

FastAPI endpoints for chat and itinerary

🌐 Environment

Create .env in backend:
HF_TOKEN=your_huggingface_api_token
