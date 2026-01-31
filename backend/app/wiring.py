from functools import lru_cache
import os
from pathlib import Path

from app.modeling.backends import HuggingFaceEndpointBackend, LlamaCppBackend, OllamaBackend, OpenAIHttpBackend
from app.modeling.router import ModelRouter
from app.latex.compile import AutoCompiler, LatexCompiler, LatexMkCompiler, PdfLatexCompiler, TectonicCompiler
from app.latex.extract_image import LatexImageExtractor, create_latex_image_extractor
from app.persistence.store import DocStore
from app.persistence.local_models import LocalModelStore
from app.local_models.manager import ModelManager


@lru_cache
def get_model_router() -> ModelRouter:
    return ModelRouter(
        local_ollama_backend=OllamaBackend(),
        local_llamacpp_backend=LlamaCppBackend(),
        openai_backend=OpenAIHttpBackend(),
        hf_backend=HuggingFaceEndpointBackend(),
    )


@lru_cache
def get_doc_store() -> DocStore:
    db_path = Path("backend/.data/verta.sqlite3")
    return DocStore(db_path=db_path)


@lru_cache
def get_latex_compiler() -> LatexCompiler:
    pref = os.environ.get("VERTA_LATEX_COMPILER", "auto").lower().strip()
    if pref == "tectonic":
        return TectonicCompiler()
    if pref == "latexmk":
        return LatexMkCompiler()
    if pref == "pdflatex":
        return PdfLatexCompiler()
    return AutoCompiler()


@lru_cache
def get_local_model_store() -> LocalModelStore:
    db_path = Path("backend/.data/verta.sqlite3")
    return LocalModelStore(db_path=db_path)


@lru_cache
def get_model_manager() -> ModelManager:
    root = os.environ.get("VERTA_MODELS_DIR") or "backend/.models"
    return ModelManager(models_dir=Path(root))


@lru_cache
def get_latex_image_extractor() -> LatexImageExtractor:
    return create_latex_image_extractor()
