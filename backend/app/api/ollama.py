import os
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/status")
async def ollama_status(base_url: str | None = None) -> dict[str, Any]:
    try:
        import httpx  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=501, detail="httpx not installed") from exc

    url = (base_url or os.environ.get("VERTA_OLLAMA_URL") or "http://localhost:11434").rstrip("/")
    try:
        async with httpx.AsyncClient(base_url=url, timeout=5.0) as client:
            r = await client.get("/api/tags")
            r.raise_for_status()
            data = r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Ollama not reachable at {url}") from exc

    models = []
    if isinstance(data, dict):
        items = data.get("models") or []
        for item in items:
            if isinstance(item, dict) and item.get("name"):
                models.append(str(item["name"]))
    return {"ok": True, "baseUrl": url, "models": models}
