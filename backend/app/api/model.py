from fastapi import APIRouter, Depends, HTTPException

from app.context.extract import build_structured_context_with_limits
from app.local_models.manager import ModelManager
from app.modeling.models import CompletionRequest, CompletionResponse
from app.modeling.router import ModelRouter
from app.persistence.local_models import LocalModelStore
from app.wiring import get_local_model_store, get_model_manager, get_model_router

router = APIRouter()


@router.post("/completion", response_model=CompletionResponse)
async def completion(
    req: CompletionRequest,
    model_router: ModelRouter = Depends(get_model_router),
    local_models: LocalModelStore = Depends(get_local_model_store),
    mgr: ModelManager = Depends(get_model_manager),
) -> CompletionResponse:
    if (not req.context) and req.sourceLatex:
        req.context, _meta = build_structured_context_with_limits(
            req.sourceLatex,
            center_index=len(req.sourceLatex),
            max_chars=req.maxContextChars,
            max_tokens=req.maxContextTokens,
        )
    if (
        req.modelConfig.type == "local"
        and (req.modelConfig.provider or "").lower() in ("llamacpp", "llama.cpp", "llama-cpp")
        and not req.modelConfig.settings.get("modelPath")
    ):
        entry = local_models.get(req.modelConfig.id)
        if entry is None:
            raise HTTPException(status_code=404, detail="Local model not found in registry")
        if entry.runtime.lower() not in ("llamacpp", "llama.cpp", "llama-cpp"):
            raise HTTPException(status_code=400, detail="Registry model runtime mismatch for llamacpp")
        req.modelConfig.settings["modelPath"] = str(mgr.resolve_path(entry.file_name))
    try:
        return await model_router.completion(req)
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Model completion timed out") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=501, detail=str(exc)) from exc
