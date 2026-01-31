from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.persistence.models import DocCreateRequest, DocResponse, DocUpdateRequest
from app.persistence.store import DocStore
from app.wiring import get_doc_store
from app.modeling.models import ModelConfig

router = APIRouter()


@router.get("", response_model=list[DocResponse])
def list_docs(store: DocStore = Depends(get_doc_store)) -> list[DocResponse]:
    return store.list()


@router.get("/{doc_id}", response_model=DocResponse)
def get_doc(doc_id: str, store: DocStore = Depends(get_doc_store)) -> DocResponse:
    doc = store.get(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.post("", response_model=DocResponse)
def create_doc(
    req: DocCreateRequest, store: DocStore = Depends(get_doc_store)
) -> DocResponse:
    return store.create(req)


@router.put("/{doc_id}", response_model=DocResponse)
def update_doc(
    doc_id: str, req: DocUpdateRequest, store: DocStore = Depends(get_doc_store)
) -> DocResponse:
    updated = store.update(doc_id, title=req.title, content=req.content, settings=req.settings)
    if updated is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return updated


class DocModelsEnvelopeRequest(BaseModel):
    models: list[ModelConfig]


class DocModelsEnvelopeResponse(BaseModel):
    models: list[ModelConfig]


@router.get("/{doc_id}/models", response_model=DocModelsEnvelopeResponse)
def get_doc_models(doc_id: str, store: DocStore = Depends(get_doc_store)) -> DocModelsEnvelopeResponse:
    models = store.get_models(doc_id)
    if models is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocModelsEnvelopeResponse(models=[ModelConfig.model_validate(m) for m in models])


@router.put("/{doc_id}/models", response_model=DocModelsEnvelopeResponse)
def put_doc_models(
    doc_id: str, req: DocModelsEnvelopeRequest, store: DocStore = Depends(get_doc_store)
) -> DocModelsEnvelopeResponse:
    saved = store.set_models(doc_id, [m.model_dump() for m in req.models])
    if saved is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocModelsEnvelopeResponse(models=[ModelConfig.model_validate(m) for m in saved])


class ShareResponse(BaseModel):
    url: str


@router.post("/{doc_id}/share", response_model=ShareResponse)
def share_doc(doc_id: str, store: DocStore = Depends(get_doc_store)) -> ShareResponse:
    token = store.create_share(doc_id)
    if token is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return ShareResponse(url=f"/share/{token}")


class SearchHit(BaseModel):
    path: str
    snippet: str | None = None


class SearchResponse(BaseModel):
    results: list[SearchHit]


@router.get("/{doc_id}/search", response_model=SearchResponse)
def search_doc(
    doc_id: str,
    q: str = Query(default=""),
    store: DocStore = Depends(get_doc_store),
) -> SearchResponse:
    doc = store.get(doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    query = (q or "").strip().lower()
    if not query:
        return SearchResponse(results=[])
    rows = store.search(doc_id, query)
    return SearchResponse(results=[SearchHit(path=r["path"], snippet=r.get("snippet")) for r in rows])


class CommentRequest(BaseModel):
    body: str = Field(default="", min_length=1)
    path: str | None = None
    selection_start: int | None = None
    selection_end: int | None = None


class CommentResponse(BaseModel):
    id: str
    doc_id: str
    body: str
    path: str | None = None
    selection_start: int | None = None
    selection_end: int | None = None
    created_at: str


@router.get("/{doc_id}/comments", response_model=list[CommentResponse])
def list_comments(doc_id: str, store: DocStore = Depends(get_doc_store)) -> list[CommentResponse]:
    rows = store.list_comments(doc_id)
    if rows is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return [CommentResponse(**row) for row in rows]


@router.post("/{doc_id}/comments", response_model=CommentResponse)
def add_comment(
    doc_id: str, req: CommentRequest, store: DocStore = Depends(get_doc_store)
) -> CommentResponse:
    row = store.add_comment(doc_id, req.body, req.path, req.selection_start, req.selection_end)
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return CommentResponse(**row)


class LogRequest(BaseModel):
    body: str = Field(default="", min_length=1)


class LogResponse(BaseModel):
    id: str
    doc_id: str
    body: str
    created_at: str


@router.get("/{doc_id}/logs", response_model=list[LogResponse])
def list_logs(doc_id: str, store: DocStore = Depends(get_doc_store)) -> list[LogResponse]:
    rows = store.list_logs(doc_id)
    if rows is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return [LogResponse(**row) for row in rows]


@router.post("/{doc_id}/logs", response_model=LogResponse)
def add_log(doc_id: str, req: LogRequest, store: DocStore = Depends(get_doc_store)) -> LogResponse:
    row = store.add_log(doc_id, req.body)
    if row is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return LogResponse(**row)


class RevisionResponse(BaseModel):
    id: str
    doc_id: str
    created_at: str


class RevisionDetailResponse(BaseModel):
    id: str
    doc_id: str
    content: str
    created_at: str


@router.get("/{doc_id}/revisions", response_model=list[RevisionResponse])
def list_revisions(doc_id: str, store: DocStore = Depends(get_doc_store)) -> list[RevisionResponse]:
    rows = store.list_revisions(doc_id)
    if rows is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return [RevisionResponse(**r) for r in rows]


@router.get("/{doc_id}/revisions/{rev_id}", response_model=RevisionDetailResponse)
def get_revision(doc_id: str, rev_id: str, store: DocStore = Depends(get_doc_store)) -> RevisionDetailResponse:
    row = store.get_revision(doc_id, rev_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Revision not found")
    return RevisionDetailResponse(**row)


@router.post("/{doc_id}/revisions/{rev_id}/restore", response_model=DocResponse)
def restore_revision(doc_id: str, rev_id: str, store: DocStore = Depends(get_doc_store)) -> DocResponse:
    doc = store.restore_revision(doc_id, rev_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Revision not found")
    return doc
