import hashlib

from fastapi.testclient import TestClient

from app.main import app
from app.local_models.manager import ModelManager
from app.persistence.local_models import LocalModelStore
from app.wiring import get_local_model_store, get_model_manager


def _sha256(data: bytes) -> str:
    h = hashlib.sha256()
    h.update(data)
    return h.hexdigest()


def test_local_model_verify_detects_missing_file(tmp_path):
    store = LocalModelStore(db_path=tmp_path / "t.sqlite3")
    app.dependency_overrides[get_local_model_store] = lambda: store
    app.dependency_overrides[get_model_manager] = lambda: ModelManager(models_dir=tmp_path / "models")
    try:
        client = TestClient(app)
        client.post(
            "/api/local-models",
            json={
                "id": "m1",
                "runtime": "llamacpp",
                "fileName": "m1.gguf",
                "sha256": "0" * 64,
                "sourceUrl": "https://example.invalid/m1.gguf",
                "settings": {},
            },
        )
        resp = client.post("/api/local-models/m1/verify")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is False
        assert data["exists"] is False
    finally:
        app.dependency_overrides.clear()


def test_local_model_download_then_verify_ok(tmp_path):
    data = b"fake-model-bytes"
    expected = _sha256(data)

    import httpx

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "GET"
        return httpx.Response(200, content=data)

    store = LocalModelStore(db_path=tmp_path / "t.sqlite3")
    app.dependency_overrides[get_local_model_store] = lambda: store
    app.dependency_overrides[get_model_manager] = lambda: ModelManager(
        models_dir=tmp_path / "models", transport=httpx.MockTransport(handler)
    )
    try:
        client = TestClient(app)
        client.post(
            "/api/local-models",
            json={
                "id": "m1",
                "runtime": "llamacpp",
                "fileName": "m1.gguf",
                "sha256": expected,
                "sourceUrl": "https://example.invalid/m1.gguf",
                "settings": {},
            },
        )
        resp = client.post("/api/local-models/m1/download")
        assert resp.status_code == 200
        out = resp.json()
        assert out["ok"] is True
        assert out["exists"] is True
        assert out["sha256Matches"] is True
    finally:
        app.dependency_overrides.clear()
