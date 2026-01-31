import httpx

from fastapi import APIRouter, HTTPException
from fastapi import status as http_status
from pydantic import BaseModel, Field

from app.zotero.client import ZoteroClient

router = APIRouter()


class ZoteroConnectRequest(BaseModel):
    userId: str = Field(min_length=1)
    apiKey: str = Field(min_length=1)
    baseUrl: str | None = None


class ZoteroConnectResponse(BaseModel):
    status: str
    userId: str
    sample: dict[str, str] | None


@router.post("/connect", response_model=ZoteroConnectResponse)
def connect_zotero(req: ZoteroConnectRequest) -> ZoteroConnectResponse:
    client = ZoteroClient(base_url=req.baseUrl)
    try:
        sample = client.fetch_top_item(req.userId, req.apiKey)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code or http_status.HTTP_502_BAD_GATEWAY,
            detail="Zotero API error: " + str(exc),
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Failed to reach Zotero API: " + str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="Zotero client error: " + str(exc),
        ) from exc
    return ZoteroConnectResponse(status="connected", userId=req.userId, sample=sample)
