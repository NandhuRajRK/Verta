from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field

from app.persistence.local_models import LocalModel, LocalModelStore
from app.local_models.manager import ModelManager
from app.wiring import get_local_model_store, get_model_manager

router = APIRouter()


class LocalModelUpsertRequest(BaseModel):
    id: str = Field(min_length=1)
    runtime: str = Field(min_length=1)
    fileName: str = Field(min_length=1)
    sha256: str | None = None
    sourceUrl: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)


class LocalModelResponse(BaseModel):
    id: str
    runtime: str
    fileName: str
    sha256: str | None
    sourceUrl: str | None
    settings: dict[str, Any]

    @staticmethod
    def from_model(m: LocalModel) -> "LocalModelResponse":
        return LocalModelResponse(
            id=m.id,
            runtime=m.runtime,
            fileName=m.file_name,
            sha256=m.sha256,
            sourceUrl=m.source_url,
            settings=m.settings,
        )


@router.get("", response_model=list[LocalModelResponse])
def list_models(store: LocalModelStore = Depends(get_local_model_store)) -> list[LocalModelResponse]:
    return [LocalModelResponse.from_model(m) for m in store.list()]


@router.get("/{model_id}", response_model=LocalModelResponse)
def get_model(model_id: str, store: LocalModelStore = Depends(get_local_model_store)) -> LocalModelResponse:
    m = store.get(model_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Local model not found")
    return LocalModelResponse.from_model(m)


@router.post("", response_model=LocalModelResponse)
def upsert_model(
    req: LocalModelUpsertRequest, store: LocalModelStore = Depends(get_local_model_store)
) -> LocalModelResponse:
    m = store.upsert(
        id=req.id,
        runtime=req.runtime,
        file_name=req.fileName,
        sha256=req.sha256,
        source_url=req.sourceUrl,
        settings=req.settings,
    )
    return LocalModelResponse.from_model(m)


@router.delete("/{model_id}")
def delete_model(model_id: str, store: LocalModelStore = Depends(get_local_model_store)) -> Response:
    ok = store.delete(model_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Local model not found")
    return Response(status_code=204)


class LocalModelVerifyResponse(BaseModel):
    ok: bool
    exists: bool
    path: str
    sizeBytes: int
    sha256: str | None
    sha256Matches: bool


@router.post("/{model_id}/verify", response_model=LocalModelVerifyResponse)
def verify_model(
    model_id: str,
    store: LocalModelStore = Depends(get_local_model_store),
    mgr: ModelManager = Depends(get_model_manager),
) -> LocalModelVerifyResponse:
    m = store.get(model_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Local model not found")
    v = mgr.verify(m.file_name, expected_sha256=m.sha256)
    ok = bool(v["exists"] and v["sha256Matches"])
    return LocalModelVerifyResponse(ok=ok, **v)


@router.post("/{model_id}/download", response_model=LocalModelVerifyResponse)
async def download_model(
    model_id: str,
    store: LocalModelStore = Depends(get_local_model_store),
    mgr: ModelManager = Depends(get_model_manager),
) -> LocalModelVerifyResponse:
    m = store.get(model_id)
    if m is None:
        raise HTTPException(status_code=404, detail="Local model not found")
    if not m.source_url:
        raise HTTPException(status_code=400, detail="Local model has no sourceUrl")
    try:
        await mgr.download(m.source_url, m.file_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
    v = mgr.verify(m.file_name, expected_sha256=m.sha256)
    ok = bool(v["exists"] and v["sha256Matches"])
    return LocalModelVerifyResponse(ok=ok, **v)
