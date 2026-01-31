import asyncio
import os
from abc import ABC, abstractmethod

from app.modeling.models import CompletionRequest, CompletionResponse


class ModelBackend(ABC):
    @abstractmethod
    async def completion(self, req: CompletionRequest) -> CompletionResponse: ...


class LocalEchoBackend(ModelBackend):
    """
    Deterministic echo backend for local provider='echo'. Used in tests and as a safe fallback.
    """

    def __init__(self, runtime: str = "echo"):
        self.runtime = runtime

    async def completion(self, req: CompletionRequest) -> CompletionResponse:
        text = f"[local:{self.runtime}] {req.context or ''} {req.prompt or ''}".strip()
        return CompletionResponse(text=text, metadata={"backend": "local", "provider": "echo"})


class ApiEchoBackend(ModelBackend):
    """
    Deterministic echo backend for api provider='echo'. Useful for tests/offline.
    """

    def __init__(self, provider: str = "echo"):
        self.provider = provider

    async def completion(self, req: CompletionRequest) -> CompletionResponse:
        text = f"[api:{self.provider}] {req.context or ''} {req.prompt or ''}".strip()
        return CompletionResponse(text=text, metadata={"backend": "api", "provider": self.provider})


class SlowBackend(ModelBackend):
    def __init__(self, delay_s: float):
        self._delay_s = delay_s

    async def completion(self, req: CompletionRequest) -> CompletionResponse:
        await asyncio.sleep(self._delay_s)
        return CompletionResponse(text="slow", metadata={"backend": "slow"})


class OpenAIHttpBackend(ModelBackend):
    """
    OpenAI API integration using HTTP (no SDK dependency).

    Expects an API key and uses the Responses API.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://api.openai.com",
        transport=None,
    ):
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._transport = transport

    async def completion(self, req: CompletionRequest) -> CompletionResponse:
        api_key = (
            self._api_key
            or str(req.modelConfig.settings.get("apiKey") or "")
            or os.environ.get("OPENAI_API_KEY")
        )
        if not api_key:
            raise RuntimeError("OpenAI backend not configured (missing OPENAI_API_KEY)")
        model = req.modelConfig.id
        content = (req.context + "\n\n" + req.prompt).strip()
        try:
            import httpx  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("httpx not installed") from exc

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {"model": model, "input": content, "max_output_tokens": req.options.maxTokens}
        async with httpx.AsyncClient(
            base_url=self._base_url, timeout=req.options.timeoutS, transport=self._transport
        ) as client:
            r = await client.post("/v1/responses", headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()

        text = str(data.get("output_text") or "")
        return CompletionResponse(
            text=text, metadata={"backend": "api", "provider": "openai", "model": model}
        )


class HuggingFaceEndpointBackend(ModelBackend):
    """
    Scaffolding for Hugging Face Inference Endpoints (or compatible endpoint).

    Expects settings to include endpoint URL and optional bearer token.
    """

    def __init__(
        self,
        endpoint_url: str | None = None,
        bearer_token: str | None = None,
        transport=None,
    ):
        self._endpoint_url = endpoint_url
        self._bearer_token = bearer_token
        self._transport = transport

    async def completion(self, req: CompletionRequest) -> CompletionResponse:
        try:
            import httpx  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("httpx not installed") from exc

        endpoint_url = (
            self._endpoint_url
            or str(req.modelConfig.settings.get("endpointUrl") or "")
            or os.environ.get("HF_ENDPOINT_URL")
        )
        if not endpoint_url:
            raise RuntimeError("HF backend not configured (missing endpointUrl/HF_ENDPOINT_URL)")

        token = (
            self._bearer_token
            or str(req.modelConfig.settings.get("token") or "")
            or os.environ.get("HF_TOKEN")
        )

        headers: dict[str, str] = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        payload = {
            "inputs": (req.context + "\n\n" + req.prompt).strip(),
            "parameters": {"max_new_tokens": req.options.maxTokens},
        }
        async with httpx.AsyncClient(
            timeout=req.options.timeoutS, transport=self._transport
        ) as client:
            r = await client.post(endpoint_url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()

        text = ""
        if isinstance(data, list) and data and isinstance(data[0], dict):
            text = str(data[0].get("generated_text", ""))
        elif isinstance(data, dict):
            text = str(data.get("generated_text") or data.get("text") or "")
        else:
            text = str(data)

        return CompletionResponse(text=text, metadata={"backend": "api", "provider": "hf", "model": req.modelConfig.id})


class OllamaBackend(ModelBackend):
    """
    Local inference via Ollama's HTTP API (default http://localhost:11434).

    Uses /api/generate with stream disabled.
    """

    def __init__(self, base_url: str = "http://localhost:11434", transport=None):
        self._base_url = base_url.rstrip("/")
        self._transport = transport

    async def completion(self, req: CompletionRequest) -> CompletionResponse:
        try:
            import httpx  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("httpx not installed") from exc

        base_url = str(req.modelConfig.settings.get("baseUrl") or self._base_url).rstrip("/")
        model = req.modelConfig.id
        prompt = (req.context + "\n\n" + req.prompt).strip()
        payload = {"model": model, "prompt": prompt, "stream": False}
        async with httpx.AsyncClient(
            base_url=base_url, timeout=req.options.timeoutS, transport=self._transport
        ) as client:
            r = await client.post("/api/generate", json=payload)
            r.raise_for_status()
            data = r.json()

        text = str(data.get("response") or "")
        return CompletionResponse(
            text=text, metadata={"backend": "local", "provider": "ollama", "model": model}
        )


class LlamaCppBackend(ModelBackend):
    """
    Scaffolding for local inference via llama-cpp-python.

    Expects settings to include `model_path`.
    """

    def __init__(self, model_path: str | None = None):
        self._model_path = model_path
        self._llm = None

    def _get_llm(self):
        if self._llm is not None:
            return self._llm
        if not self._model_path:
            raise RuntimeError("llama.cpp backend not configured (missing model_path)")
        try:
            from llama_cpp import Llama  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("llama-cpp-python not installed") from exc
        self._llm = Llama(model_path=self._model_path)
        return self._llm

    async def completion(self, req: CompletionRequest) -> CompletionResponse:
        if not self._model_path:
            self._model_path = str(req.modelConfig.settings.get("modelPath") or "")
        llm = self._get_llm()
        prompt = (req.context + "\n\n" + req.prompt).strip()
        result = llm(prompt, max_tokens=req.options.maxTokens)
        text = ""
        if isinstance(result, dict):
            choices = result.get("choices") or []
            if choices and isinstance(choices[0], dict):
                text = str(choices[0].get("text", ""))
        return CompletionResponse(text=text, metadata={"backend": "local", "provider": "llamacpp", "model": req.modelConfig.id})
