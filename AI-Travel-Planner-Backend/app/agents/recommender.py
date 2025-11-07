from typing import List, Dict

from ..config import settings


def _keyword_fallback(text: str, labels: List[str]) -> Dict:
    t = text.lower()
    ranking = []
    for label in labels:
        score = 0.0
        if label in t:
            score = 0.9
        elif label == "beach" and any(k in t for k in ["sand", "sea", "coast", "island"]):
            score = 0.6
        elif label == "mountains" and any(k in t for k in ["hike", "trek", "peak", "alps"]):
            score = 0.6
        elif label == "city" and any(k in t for k in ["museum", "nightlife", "downtown", "shopping"]):
            score = 0.6
        elif label == "food" and any(k in t for k in ["cuisine", "eat", "restaurant", "street food"]):
            score = 0.6
        elif label == "culture" and any(k in t for k in ["history", "art", "heritage", "festival"]):
            score = 0.6
        ranking.append((label, score))
    ranking.sort(key=lambda x: x[1], reverse=True)
    top_label, top_score = ranking[0] if ranking else ("unknown", 0.0)
    return {
        "label": top_label,
        "confidence": top_score,
        "scores": {l: s for l, s in ranking},
    }


def classify_intent(text: str, candidate_labels: List[str]) -> Dict:
    # Prefer transformers zero-shot classification if available
    try:
        from transformers import pipeline
        model_name = settings.recommender_model
        clf = pipeline("zero-shot-classification", model=model_name)
        res = clf(text, candidate_labels=candidate_labels)
        scores = {label: float(score) for label, score in zip(res["labels"], res["scores"])}
        top_label = res["labels"][0]
        top_score = float(res["scores"][0])
        return {"label": top_label, "confidence": top_score, "scores": scores}
    except Exception:
        # Try Hugging Face Inference API via huggingface_hub
        try:
            from huggingface_hub import InferenceClient
            client = InferenceClient(token=settings.hf_api_token)
            # Use text-classification with NLI; emulate zero-shot by concatenation
            # If API client doesn't support zero-shot directly, fall back to keyword logic
            return _keyword_fallback(text, candidate_labels)
        except Exception:
            return _keyword_fallback(text, candidate_labels)