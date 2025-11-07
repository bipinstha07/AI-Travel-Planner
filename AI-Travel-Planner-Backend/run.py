import os
from dotenv import load_dotenv
import uvicorn


def _env_bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "y"}


if __name__ == "__main__":
    load_dotenv()

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    reload = _env_bool("RELOAD", True)

    # Uvicorn reload mode only supports a single worker
    workers_env = os.getenv("WORKERS")
    workers = int(workers_env) if workers_env else 1
    if reload:
        workers = 1

    # Run the FastAPI app defined in app/main.py
    uvicorn.run("app.main:app", host=host, port=port, reload=reload, workers=workers)