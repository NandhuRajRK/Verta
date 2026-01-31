import asyncio

from app.modeling.backends import ModelBackend
from app.modeling.models import CompletionRequest, CompletionResponse


class ModelRouter:
    def __init__(
        self,
        local_ollama_backend: ModelBackend,
        local_llamacpp_backend: ModelBackend,
        openai_backend: ModelBackend,
        hf_backend: ModelBackend,
    ):
        self._local_ollama_backend = local_ollama_backend
        self._local_llamacpp_backend = local_llamacpp_backend
        self._openai_backend = openai_backend
        self._hf_backend = hf_backend

    async def completion(self, req: CompletionRequest) -> CompletionResponse:
        backend = self._select_backend(req)
        try:
            return await asyncio.wait_for(
                backend.completion(req), timeout=req.options.timeoutS
            )
        except asyncio.TimeoutError as exc:
            raise TimeoutError("completion timed out") from exc

    def _select_backend(self, req: CompletionRequest) -> ModelBackend:
        if req.modelConfig.type == "local":
            provider = (req.modelConfig.provider or "").lower()
            if provider in ("ollama",):
                return self._local_ollama_backend
            if provider in ("llamacpp", "llama.cpp", "llama-cpp"):
                return self._local_llamacpp_backend
            raise ValueError("Local modelConfig.provider must be 'ollama' or 'llamacpp'")
        if req.modelConfig.type == "api":
            provider = (req.modelConfig.provider or "").lower()
            if provider in ("openai", "oai"):
                return self._openai_backend
            if provider in ("hf", "huggingface", "hugging-face"):
                return self._hf_backend
            raise ValueError("API modelConfig.provider must be 'openai' or 'hf'")
        raise ValueError("Unsupported model type")
