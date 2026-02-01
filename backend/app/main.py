from fastapi import FastAPI, HTTPException

from app.errors import http_exception_handler

from app.api.context import router as context_router
from app.api.docs import router as docs_router
from app.api.latex import router as latex_router
from app.api.local_models import router as local_models_router
from app.api.model import router as model_router
from app.api.zotero import router as zotero_router
from app.api.search import router as search_router
from app.api.auth import router as auth_router
from app.api.presence import router as presence_router
from app.api.share import router as share_router
from app.api.ollama import router as ollama_router

app = FastAPI(title="Verta Backend", version="0.1.0")

app.add_exception_handler(HTTPException, http_exception_handler)

app.include_router(model_router, prefix="/api/model", tags=["model"])
app.include_router(docs_router, prefix="/api/doc", tags=["doc"])
app.include_router(latex_router, prefix="/api/latex", tags=["latex"])
app.include_router(context_router, prefix="/api/context", tags=["context"])
app.include_router(local_models_router, prefix="/api/local-models", tags=["local-models"])
app.include_router(zotero_router, prefix="/api/zotero", tags=["zotero"])
app.include_router(search_router, prefix="/api/search", tags=["search"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(presence_router, prefix="/api/presence", tags=["presence"])
app.include_router(share_router, prefix="/share", tags=["share"])
app.include_router(ollama_router, prefix="/api/ollama", tags=["ollama"])
