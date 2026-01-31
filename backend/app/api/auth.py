from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field

from app.persistence.store import DocStore
from app.wiring import get_doc_store

router = APIRouter()


class AuthRequest(BaseModel):
    username: str = Field(min_length=3)
    password: str = Field(min_length=6)


class AuthResponse(BaseModel):
    token: str
    user: dict


class MeResponse(BaseModel):
    id: str
    username: str


def get_user_from_header(
    authorization: str | None = Header(default=None),
    store: DocStore = Depends(get_doc_store),
) -> dict | None:
    if not authorization:
        return None
    if not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    return store.get_user_by_token(token)


@router.post("/register", response_model=AuthResponse)
def register(req: AuthRequest, store: DocStore = Depends(get_doc_store)) -> AuthResponse:
    if store.get_user_by_username(req.username):
        raise HTTPException(status_code=409, detail="Username already exists")
    user = store.create_user(req.username, req.password)
    token = store.create_session(user["id"])
    return AuthResponse(token=token, user=user)


@router.post("/login", response_model=AuthResponse)
def login(req: AuthRequest, store: DocStore = Depends(get_doc_store)) -> AuthResponse:
    user = store.verify_user(req.username, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = store.create_session(user["id"])
    return AuthResponse(token=token, user=user)


@router.post("/logout")
def logout(
    authorization: str | None = Header(default=None),
    store: DocStore = Depends(get_doc_store),
) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        return {"ok": True}
    token = authorization.split(" ", 1)[1].strip()
    store.delete_session(token)
    return {"ok": True}


@router.get("/me", response_model=MeResponse)
def me(user: dict | None = Depends(get_user_from_header)) -> MeResponse:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return MeResponse(id=user["id"], username=user["username"])
