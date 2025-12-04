from fastapi import FastAPI
from app.router import chatbot
from fastapi.middleware.cors import CORSMiddleware
from app.router import test

app = FastAPI(title="AI Travel Planner")


# ✅ Allow CORS for your frontend
origins = [
    "http://localhost:5173",  # your React dev server
    "http://127.0.0.1:5173",
    "https://ai-travel-planner-delta-seven.vercel.app"  # production domain (optional)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,         # URLs allowed to access your API
    allow_credentials=True,
    allow_methods=["*"],           # allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],           # allow all headers
)

app.include_router(chatbot.router, prefix="/api", tags=["Chatbot"])
app.include_router(test.router, prefix="/api", tags=["Test"])

@app.get("/")
def home():
    return {"message": "AI Travel Planner Backend running ✅"}

