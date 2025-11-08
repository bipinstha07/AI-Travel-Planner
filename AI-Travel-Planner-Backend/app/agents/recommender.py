from typing import List, Dict

from ..config import settings


def classify_intent(text: str, candidate_labels: List[str]) -> Dict:
    # Prefer local transformers pipeline; if unavailable, use Hugging Face Inference API.
    try:
        from transformers import pipeline
        model_name = settings.recommender_model
        clf = pipeline("zero-shot-classification", model=model_name)
        res = clf(text, candidate_labels=candidate_labels)
        labels = res.get("labels", [])
        scores_list = res.get("scores", [])
    except Exception:
        import requests
        model_name = settings.recommender_model
        headers = {}
        if settings.hf_api_token:
            headers["Authorization"] = f"Bearer {settings.hf_api_token}"
        payload = {
            "inputs": text,
            "parameters": {"candidate_labels": candidate_labels},
        }
        r = requests.post(
            f"https://api-inference.huggingface.co/models/{model_name}",
            headers=headers,
            json=payload,
            timeout=30,
        )
        r.raise_for_status()
        res = r.json()
        # API may return dict or list with a dict at index 0
        if isinstance(res, list) and res:
            res = res[0]
        labels = res.get("labels", [])
        scores_list = res.get("scores", [])

    scores = {label: float(score) for label, score in zip(labels, scores_list)}
    top_label = labels[0] if labels else "unknown"
    top_score = float(scores_list[0]) if scores_list else 0.0
    return {"label": top_label, "confidence": top_score, "scores": scores}