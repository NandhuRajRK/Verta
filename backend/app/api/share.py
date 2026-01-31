from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.persistence.store import DocStore
from app.wiring import get_doc_store

router = APIRouter()


class ShareDocResponse(BaseModel):
    doc_id: str
    title: str | None = None
    content: str


@router.get("/{token}", response_model=ShareDocResponse)
def get_shared_doc(token: str, store: DocStore = Depends(get_doc_store)) -> ShareDocResponse:
    share = store.get_share(token)
    if share is None:
        raise HTTPException(status_code=404, detail="Share not found")
    doc = store.get(share["doc_id"])
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return ShareDocResponse(doc_id=doc.id, title=doc.title, content=doc.content)
