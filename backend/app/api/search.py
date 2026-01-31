import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.persistence.store import DocStore
from app.wiring import get_doc_store

router = APIRouter()


class SearchHit(BaseModel):
    doc_id: str
    path: str
    snippet: str | None = None


class SearchResponse(BaseModel):
    results: list[SearchHit]


@router.get("", response_model=SearchResponse)
def search_all(q: str = Query(default=""), store: DocStore = Depends(get_doc_store)) -> SearchResponse:
    query = (q or "").strip().lower()
    if not query:
        return SearchResponse(results=[])
    rows = store.search(None, query)
    return SearchResponse(results=[SearchHit(**r) for r in rows])


class WebSearchHit(BaseModel):
    title: str
    url: str
    snippet: str | None = None
    source: str


class WebSearchResponse(BaseModel):
    query: str
    results: list[WebSearchHit]


@router.get("/web", response_model=WebSearchResponse)
async def search_web(q: str = Query(default=""), k: int = Query(default=5, ge=1, le=10)) -> WebSearchResponse:
    query = (q or "").strip()
    if not query:
        return WebSearchResponse(query="", results=[])

    provider = os.getenv("VERTA_WEB_SEARCH_PROVIDER", "").strip().lower()
    api_key = os.getenv("VERTA_WEB_SEARCH_API_KEY", "").strip()
    endpoint = os.getenv("VERTA_WEB_SEARCH_ENDPOINT", "").strip()

    if not provider:
        raise HTTPException(status_code=501, detail="Web search provider not configured")
    if not api_key:
        raise HTTPException(status_code=400, detail="Web search API key missing")

    timeout = httpx.Timeout(15.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        if provider == "brave":
            url = endpoint or "https://api.search.brave.com/res/v1/web/search"
            resp = await client.get(url, params={"q": query, "count": k}, headers={"X-Subscription-Token": api_key})
            resp.raise_for_status()
            data = resp.json()
            items = data.get("web", {}).get("results", []) or []
            results = [
                WebSearchHit(
                    title=str(item.get("title") or ""),
                    url=str(item.get("url") or ""),
                    snippet=item.get("description"),
                    source="brave",
                )
                for item in items[:k]
                if item.get("url")
            ]
            return WebSearchResponse(query=query, results=results)

        if provider == "serpapi":
            url = endpoint or "https://serpapi.com/search.json"
            resp = await client.get(url, params={"q": query, "engine": "google", "api_key": api_key})
            resp.raise_for_status()
            data = resp.json()
            items = data.get("organic_results", []) or []
            results = [
                WebSearchHit(
                    title=str(item.get("title") or ""),
                    url=str(item.get("link") or ""),
                    snippet=item.get("snippet"),
                    source="serpapi",
                )
                for item in items[:k]
                if item.get("link")
            ]
            return WebSearchResponse(query=query, results=results)

        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
