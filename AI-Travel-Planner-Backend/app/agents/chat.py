from functools import lru_cache
from typing import Callable

from ..config import settings


@lru_cache(maxsize=1)
def _get_chat_generator() -> Callable[[str], str]:
    """Return a callable that generates assistant replies using configured provider.

    Priority (unless overridden by `CHAT_PROVIDER`):
    1) Chutes.ai (OpenAI-compatible) if `CHUTES_API_KEY` is set.
    2) Groq if configured.
    3) Local OpenAI-compatible server (e.g., vLLM/Transformers serve) if set.
    """

    # Provider override via env var
    provider_pref = getattr(settings, "chat_provider", "")

    # --- HuggingFace Inference provider ---
    hf_token = getattr(settings, "hf_api_token", None)
    hf_model = getattr(settings, "hf_model", None)
    if (provider_pref in ("", "hf_inference")) and hf_token and hf_model:
        import requests
        api_url = f"https://api-inference.huggingface.co/models/{hf_model}"

        def _gen(prompt: str) -> str:
            try:
                resp = requests.post(
                    api_url,
                    headers={
                        "Authorization": f"Bearer {hf_token}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    json={
                        "inputs": prompt,
                        "parameters": {
                            "max_new_tokens": 512,
                            "temperature": 0.7,
                            "do_sample": True,
                        },
                    },
                    timeout=30,
                )
                if resp.status_code != 200:
                    try:
                        print(f"[HF] HTTP {resp.status_code}: {resp.text}")
                    except Exception:
                        pass
                    return ""
                data = resp.json()
                # HF returns either a list of generated_text dicts or nested structures
                if isinstance(data, list) and data:
                    first = data[0]
                    if isinstance(first, dict):
                        content = (first.get("generated_text") or "").strip()
                        if content:
                            return content
                # Fallback: try raw text
                if isinstance(data, str):
                    return data.strip()
                return ""
            except Exception:
                return ""

        return _gen

    # --- Chutes provider ---
    chutes_key = getattr(settings, "chutes_api_key", None)
    if (provider_pref in ("", "chutes")) and chutes_key:
        import requests
        base = getattr(settings, "chutes_api_base", "https://api.chutes.ai/v1")
        model_name = getattr(settings, "chutes_model", "openai/gpt-oss-20b")

        def _gen(prompt: str) -> str:
            try:
                resp = requests.post(
                    f"{base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {chutes_key}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    json={
                        "model": model_name,
                        # Match proven working shape: only user message
                        "messages": [
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.7,
                        "max_tokens": 512,
                    },
                    timeout=30,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get("choices") or []
                    if choices:
                        first = choices[0] or {}
                        msg = first.get("message") or {}
                        # Prefer standard content, then reasoning_content for reasoning-capable models
                        content = (msg.get("content") or "").strip()
                        if not content:
                            content = (msg.get("reasoning_content") or "").strip()
                        if not content:
                            content = (first.get("text") or "").strip()
                        if not content:
                            delta = first.get("delta") or {}
                            content = (delta.get("content") or "").strip()
                        if content:
                            return content
                        # If provider responded but content is empty, return a friendly message
                        return "Sorry, I couldn’t generate a reply. Please try again."
                else:
                    # Surface errors in dev logs for troubleshooting and return friendly text
                    detail_msg = ""
                    try:
                        err = resp.text
                        print(f"[Chutes] HTTP {resp.status_code}: {err}")
                        # Try to extract a useful detail for the user
                        import json as _json
                        try:
                            j = _json.loads(err)
                            detail_msg = j.get("detail") or j.get("error") or ""
                        except Exception:
                            detail_msg = err[:200]
                    except Exception:
                        pass
                    base_msg = "Chat temporarily unavailable. Please try again later."
                    if detail_msg:
                        return f"{base_msg} ({detail_msg})"
                    return base_msg
            except Exception:
                return "Chat temporarily unavailable due to a provider error. Please try again."

        return _gen

    # --- Groq provider ---
    groq_key = getattr(settings, "groq_api_key", None)
    if (provider_pref in ("", "groq")) and groq_key:
        from groq import Groq
        model_name = getattr(settings, "groq_model", "llama3-8b-8192")
        client = Groq(api_key=groq_key)

        def _gen(prompt: str) -> str:
            try:
                resp = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a friendly travel chatbot.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.7,
                    top_p=0.9,
                    max_tokens=512,
                )
                choice = resp.choices[0]
                content = getattr(choice.message, "content", "")
                return (content or "").strip()
            except Exception:
                return ""

        return _gen

    # --- Local OpenAI-compatible provider (vLLM / Transformers serve) ---
    local_base = getattr(settings, "local_openai_base", None)
    if (provider_pref in ("", "local_openai")) and local_base:
        import requests
        base = str(local_base).rstrip("/")
        model_name = getattr(settings, "local_openai_model", "openai/gpt-oss-20b")
        api_key = getattr(settings, "local_openai_api_key", None)

        def _gen(prompt: str) -> str:
            try:
                headers = {"Content-Type": "application/json"}
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"
                resp = requests.post(
                    f"{base}/v1/chat/completions",
                    headers=headers,
                    json={
                        "model": model_name,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a friendly travel chatbot.",
                            },
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "max_tokens": 512,
                    },
                    timeout=20,
                )
                if resp.status_code != 200:
                    return ""
                data = resp.json()
                choices = data.get("choices") or []
                if not choices:
                    return ""
                first = choices[0] or {}
                msg = first.get("message") or {}
                content = (msg.get("content") or "").strip()
                if not content:
                    content = (first.get("text") or "").strip()
                if not content:
                    delta = first.get("delta") or {}
                    content = (delta.get("content") or "").strip()
                return content
            except Exception:
                return ""

        return _gen

    raise RuntimeError(
        "No text generation provider configured. Set CHUTES_API_KEY, GROQ_API_KEY, or LOCAL_OPENAI_BASE."
    )