from fastapi.testclient import TestClient

from app.main import app
from app.modeling.backends import SlowBackend
from app.modeling.router import ModelRouter
from app.wiring import get_model_router


def test_model_completion_timeout_returns_504():
    app.dependency_overrides[get_model_router] = lambda: ModelRouter(
        local_echo_backend=SlowBackend(delay_s=0.2),
        local_ollama_backend=SlowBackend(delay_s=0.2),
        local_llamacpp_backend=SlowBackend(delay_s=0.2),
        openai_backend=SlowBackend(delay_s=0.2),
        hf_backend=SlowBackend(delay_s=0.2),
    )
    try:
        client = TestClient(app)
        resp = client.post(
            "/api/model/completion",
            json={
                "modelConfig": {"type": "local", "id": "slow", "settings": {}},
                "context": "",
                "prompt": "x",
                "options": {"maxTokens": 10, "timeoutS": 0.01},
            },
        )
        assert resp.status_code == 504
    finally:
        app.dependency_overrides.clear()
