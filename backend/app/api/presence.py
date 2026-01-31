from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.persistence.store import DocStore
from app.wiring import get_doc_store

router = APIRouter()


class PresenceRequest(BaseModel):
    doc_id: str
    user_id: str
    display_name: str


class PresenceResponse(BaseModel):
    id: str
    doc_id: str
    user_id: str
    display_name: str
    last_seen: str


@router.post("/heartbeat", response_model=PresenceResponse)
def heartbeat(req: PresenceRequest, store: DocStore = Depends(get_doc_store)) -> PresenceResponse:
    row = store.heartbeat_presence(req.doc_id, req.user_id, req.display_name)
    return PresenceResponse(**row)


@router.get("/list", response_model=list[PresenceResponse])
def list_presence(doc_id: str, store: DocStore = Depends(get_doc_store)) -> list[PresenceResponse]:
    rows = store.list_presence(doc_id)
    return [PresenceResponse(**r) for r in rows]
