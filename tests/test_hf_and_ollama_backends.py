from fastapi.testclient import TestClient

from app.main import app
from app.modeling.backends import HuggingFaceEndpointBackend, LocalEchoBackend, OllamaBackend, OpenAIHttpBackend
from app.modeling.router import ModelRouter
from app.wiring import get_model_router


def test_hf_backend_parses_generated_text_from_list_response():
    import httpx

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        return httpx.Response(200, json=[{"generated_text": "hf-ok"}])

    app.dependency_overrides[get_model_router] = lambda: ModelRouter(
        local_echo_backend=LocalEchoBackend(runtime="echo"),
        local_ollama_backend=LocalEchoBackend(runtime="ollama-echo"),
        local_llamacpp_backend=LocalEchoBackend(runtime="llamacpp-echo"),
        openai_backend=OpenAIHttpBackend(transport=httpx.MockTransport(lambda r: httpx.Response(200, json={"output_text": "x"}))),
        hf_backend=HuggingFaceEndpointBackend(transport=httpx.MockTransport(handler)),
    )
    try:
        client = TestClient(app)
        resp = client.post(
            "/api/model/completion",
            json={
                "modelConfig": {
                    "type": "api",
                    "provider": "hf",
                    "id": "tgi",
                    "settings": {"endpointUrl": "https://example.invalid/infer", "token": "t"},
                },
                "context": "c",
                "prompt": "p",
                "options": {"maxTokens": 5, "timeoutS": 1.0},
            },
        )
        assert resp.status_code == 200
        assert resp.json()["text"] == "hf-ok"
        assert resp.json()["metadata"]["provider"] == "hf"
    finally:
        app.dependency_overrides.clear()


def test_ollama_backend_parses_response_field():
    import httpx

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/generate"
        return httpx.Response(200, json={"response": "ollama-ok"})

    app.dependency_overrides[get_model_router] = lambda: ModelRouter(
        local_echo_backend=LocalEchoBackend(runtime="echo"),
        local_ollama_backend=OllamaBackend(transport=httpx.MockTransport(handler)),
        local_llamacpp_backend=LocalEchoBackend(runtime="llamacpp-echo"),
        openai_backend=OpenAIHttpBackend(transport=httpx.MockTransport(lambda r: httpx.Response(200, json={"output_text": "x"}))),
        hf_backend=LocalEchoBackend(runtime="hf-echo"),
    )
    try:
        client = TestClient(app)
        resp = client.post(
            "/api/model/completion",
            json={
                "modelConfig": {"type": "local", "provider": "ollama", "id": "llama3", "settings": {}},
                "context": "c",
                "prompt": "p",
                "options": {"maxTokens": 5, "timeoutS": 1.0},
            },
        )
        assert resp.status_code == 200
        assert resp.json()["text"] == "ollama-ok"
        assert resp.json()["metadata"]["provider"] == "ollama"
    finally:
        app.dependency_overrides.clear()

