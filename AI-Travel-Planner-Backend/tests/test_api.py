from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_classify_intent_basic():
    r = client.post("/api/recommendations/classify-intent", json={
        "text": "I love beaches and warm islands",
        "candidate_labels": ["beach", "city", "mountains", "food", "culture"],
    })
    assert r.status_code == 200
    body = r.json()
    assert "label" in body and isinstance(body["label"], str)
    assert "scores" in body and isinstance(body["scores"], dict)


def test_generate_itinerary_template():
    r = client.post("/api/itinerary/generate", json={
        "destination": "Bali",
        "days": 3,
        "preferences": ["beach"],
    })
    assert r.status_code == 200
    body = r.json()
    assert "days" in body and isinstance(body["days"], list)
    assert len(body["days"]) == 3


def test_plan_orchestrator_flow():
    # Step 1: initial plan call
    r1 = client.post("/api/plan", json={
        "text": "I want a culture trip in Europe",
        "preferred_label": "culture",
    })
    assert r1.status_code == 200
    b1 = r1.json()
    assert "intent" in b1
    assert isinstance(b1.get("recommendations"), list) and len(b1["recommendations"]) > 0
    session_id = b1.get("session_id")

    # Step 2: choose a destination and provide days to generate itinerary
    dest = b1["recommendations"][0]
    r2 = client.post("/api/plan", json={
        "text": "Continue",
        "preferred_label": b1["intent"],
        "session_id": session_id,
        "destination": dest,
        "days": 2,
    })
    assert r2.status_code == 200
    b2 = r2.json()
    # Itinerary may be embedded when generation is available
    if b2.get("itinerary"):
        assert isinstance(b2["itinerary"].get("days"), list)
    else:
        # Otherwise expect next_questions to prompt for missing info
        assert isinstance(b2.get("next_questions"), list)