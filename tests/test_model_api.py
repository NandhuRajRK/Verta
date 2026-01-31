from fastapi.testclient import TestClient

from app.main import app
from app.modeling.backends import ApiEchoBackend, LocalEchoBackend, OpenAIHttpBackend
from app.modeling.router import ModelRouter
from app.wiring import get_model_router


def test_model_completion_local_returns_structured_output():
    client = TestClient(app)
    resp = client.post(
        "/api/model/completion",
        json={
            "modelConfig": {"type": "local", "id": "llama", "provider": "echo", "settings": {}},
            "context": "ctx",
            "prompt": "Write an abstract",
            "options": {"maxTokens": 10, "timeoutS": 1.0},
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) == {"text", "metadata"}
    assert "text" in data and isinstance(data["text"], str)
    assert data["metadata"]["backend"] == "local"
    assert "provider" in data["metadata"]


def test_model_completion_builds_context_from_source_latex_when_context_empty():
    client = TestClient(app)
    resp = client.post(
        "/api/model/completion",
        json={
            "modelConfig": {"type": "local", "id": "m", "provider": "echo", "settings": {}},
            "context": "",
            "sourceLatex": "\\section{Intro}\\label{sec:intro}\nHello",
            "maxContextChars": 200,
            "prompt": "Continue",
            "options": {"maxTokens": 10, "timeoutS": 1.0},
        },
    )
    assert resp.status_code == 200
    text = resp.json()["text"]
    assert "LaTeX Context" in text


def test_model_completion_api_returns_structured_output():
    import httpx

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/responses"
        return httpx.Response(200, json={"output_text": "ok"})

    app.dependency_overrides[get_model_router] = lambda: ModelRouter(
        local_echo_backend=LocalEchoBackend(runtime="echo"),
        local_ollama_backend=LocalEchoBackend(runtime="ollama-echo"),
        local_llamacpp_backend=LocalEchoBackend(runtime="llamacpp-echo"),
        openai_backend=OpenAIHttpBackend(transport=httpx.MockTransport(handler)),
        hf_backend=ApiEchoBackend(provider="hf-echo"),
    )
    try:
        client = TestClient(app)
        resp = client.post(
            "/api/model/completion",
            json={
                "modelConfig": {
                    "type": "api",
                    "provider": "openai",
                    "id": "gpt-x",
                    "settings": {"apiKey": "test"},
                },
                "context": "",
                "prompt": "Summarize",
                "options": {"maxTokens": 10, "timeoutS": 1.0},
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["metadata"]["backend"] == "api"
        assert data["metadata"]["provider"] == "openai"
        assert data["text"] == "ok"
    finally:
        app.dependency_overrides.clear()


def test_model_backend_switching_changes_prefix():
    client = TestClient(app)
    local = client.post(
        "/api/model/completion",
        json={
            "modelConfig": {"type": "local", "id": "m1", "provider": "echo", "settings": {}},
            "context": "",
            "prompt": "hi",
            "options": {"maxTokens": 10, "timeoutS": 1.0},
        },
    ).json()["text"]
    assert local.startswith("[local:")


def test_model_completion_api_missing_provider_returns_400():
    client = TestClient(app)
    resp = client.post(
        "/api/model/completion",
        json={
            "modelConfig": {"type": "api", "id": "m2", "settings": {}},
            "context": "",
            "prompt": "hi",
            "options": {"maxTokens": 10, "timeoutS": 1.0},
        },
    )
    assert resp.status_code == 400


def test_model_completion_invalid_type_returns_400():
    client = TestClient(app)
    resp = client.post(
        "/api/model/completion",
        json={
            "modelConfig": {"type": "weird", "id": "x", "settings": {}},
            "context": "",
            "prompt": "hi",
            "options": {"maxTokens": 10, "timeoutS": 1.0},
        },
    )
    assert resp.status_code == 422 or resp.status_code == 400
