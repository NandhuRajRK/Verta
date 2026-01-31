from fastapi.testclient import TestClient

from app.main import app
from app.modeling.backends import ApiEchoBackend, LocalEchoBackend, ModelBackend
from app.modeling.models import CompletionRequest, CompletionResponse
from app.modeling.router import ModelRouter
from app.persistence.local_models import LocalModelStore
from app.wiring import get_local_model_store, get_model_router


class AssertHasModelPathBackend(ModelBackend):
    async def completion(self, req: CompletionRequest) -> CompletionResponse:
        assert req.modelConfig.settings.get("modelPath")
        return CompletionResponse(text="ok", metadata={"backend": "local", "provider": "llamacpp"})


def test_llamacpp_model_path_is_resolved_from_registry(tmp_path):
    store = LocalModelStore(db_path=tmp_path / "t.sqlite3")
    store.upsert(
        id="m1",
        runtime="llamacpp",
        file_name="m1.gguf",
        sha256=None,
        source_url=None,
        settings={},
    )

    app.dependency_overrides[get_local_model_store] = lambda: store
    app.dependency_overrides[get_model_router] = lambda: ModelRouter(
        local_echo_backend=LocalEchoBackend(runtime="echo"),
        local_ollama_backend=LocalEchoBackend(runtime="ollama-echo"),
        local_llamacpp_backend=AssertHasModelPathBackend(),
        openai_backend=ApiEchoBackend(provider="openai-echo"),
        hf_backend=ApiEchoBackend(provider="hf-echo"),
    )
    try:
        client = TestClient(app)
        resp = client.post(
            "/api/model/completion",
            json={
                "modelConfig": {"type": "local", "provider": "llamacpp", "id": "m1", "settings": {}},
                "context": "c",
                "prompt": "p",
                "options": {"maxTokens": 5, "timeoutS": 1.0},
            },
        )
        assert resp.status_code == 200
        assert resp.json()["text"] == "ok"
    finally:
        app.dependency_overrides.clear()
