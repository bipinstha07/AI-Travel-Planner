# app/chat.py

import os
from fastapi import APIRouter, HTTPException
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api", tags=["Chatbot"])

# Initialize Hugging Face client
MODEL_NAME = "meta-llama/Meta-Llama-3-8B-Instruct"  # you can replace with gemma-2b-it or mistral-7b-instruct
HF_TOKEN = os.getenv("HF_TOKEN")

client = InferenceClient(model=MODEL_NAME, token=HF_TOKEN)

@router.post("/chat")
async def chat_with_ai(request: dict):
    """
    Chat endpoint for AI Travel Planner.
    Expects: { "message": "string", "context": "optional string" }
    """
    try:
        user_message = request.get("message", "")
        context = request.get("context", "")

        if not user_message:
            raise HTTPException(status_code=400, detail="Message is required.")

        # Build prompt for Hugging Face model
        prompt = f"""
You are a helpful AI travel assistant. You answer naturally and return structured travel plans if needed.

Conversation so far:
{context}

User: {user_message}
Assistant:
"""

        # Send to Hugging Face model
        response = client.text_generation(
            prompt,
            max_new_tokens=300,
            temperature=0.7,
            repetition_penalty=1.1,
        )

        return {
            "reply": response.strip(),
            "context": f"{context}\nUser: {user_message}\nAssistant: {response.strip()}"
        }

    except Exception as e:
        print(f"⚠️ Chat Error: {e}")
        raise HTTPException(status_code=500, detail="AI model error.")
