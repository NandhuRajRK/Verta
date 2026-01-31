from fastapi.testclient import TestClient

from app.main import app


def test_openai_missing_api_key_returns_501():
    client = TestClient(app)
    resp = client.post(
        "/api/model/completion",
        json={
            "modelConfig": {"type": "api", "provider": "openai", "id": "gpt-4.1-mini", "settings": {}},
            "context": "c",
            "prompt": "p",
            "options": {"maxTokens": 5, "timeoutS": 1.0},
        },
    )
    assert resp.status_code == 501


def test_hf_missing_endpoint_returns_501():
    client = TestClient(app)
    resp = client.post(
        "/api/model/completion",
        json={
            "modelConfig": {"type": "api", "provider": "hf", "id": "tgi", "settings": {}},
            "context": "c",
            "prompt": "p",
            "options": {"maxTokens": 5, "timeoutS": 1.0},
        },
    )
    assert resp.status_code == 501


def test_llamacpp_missing_model_path_returns_501():
    client = TestClient(app)
    resp = client.post(
        "/api/model/completion",
        json={
            "modelConfig": {"type": "local", "provider": "llamacpp", "id": "local", "settings": {}},
            "context": "c",
            "prompt": "p",
            "options": {"maxTokens": 5, "timeoutS": 1.0},
        },
    )
    assert resp.status_code == 404
