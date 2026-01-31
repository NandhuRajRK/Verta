from functools import lru_cache
import os
from pathlib import Path

from app.modeling.backends import ApiEchoBackend, HuggingFaceEndpointBackend, LlamaCppBackend, LocalEchoBackend, OllamaBackend, OpenAIHttpBackend
from app.modeling.router import ModelRouter
from app.latex.compile import AutoCompiler, LatexCompiler, LatexMkCompiler, PdfLatexCompiler, TectonicCompiler
from app.latex.extract_image import LatexImageExtractor, create_latex_image_extractor
from app.persistence.store import DocStore
from app.persistence.local_models import LocalModelStore
from app.local_models.manager import ModelManager


def _backend_root() -> Path:
    # Stable paths regardless of current working directory.
    return Path(__file__).resolve().parents[1]


@lru_cache
def get_model_router() -> ModelRouter:
    return ModelRouter(
        local_echo_backend=LocalEchoBackend(),
        local_ollama_backend=OllamaBackend(),
        local_llamacpp_backend=LlamaCppBackend(),
        api_echo_backend=ApiEchoBackend(),
        openai_backend=OpenAIHttpBackend(),
        hf_backend=HuggingFaceEndpointBackend(),
    )


@lru_cache
def get_doc_store() -> DocStore:
    db_path = _backend_root() / ".data" / "verta.sqlite3"
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
    db_path = _backend_root() / ".data" / "verta.sqlite3"
    return LocalModelStore(db_path=db_path)


@lru_cache
def get_model_manager() -> ModelManager:
    root = os.environ.get("VERTA_MODELS_DIR")
    models_dir = Path(root) if root else (_backend_root() / ".models")
    return ModelManager(models_dir=models_dir)


@lru_cache
def get_latex_image_extractor() -> LatexImageExtractor:
    return create_latex_image_extractor()
