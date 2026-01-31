from fastapi.testclient import TestClient

from app.main import app
from app.persistence.store import DocStore
from app.wiring import get_doc_store


def test_doc_models_save_and_load(tmp_path):
    store = DocStore(db_path=tmp_path / "t.sqlite3")
    app.dependency_overrides[get_doc_store] = lambda: store
    try:
        client = TestClient(app)
        created = client.post("/api/doc", json={"title": "t", "content": "x"}).json()
        doc_id = created["id"]

        put = client.put(
            f"/api/doc/{doc_id}/models",
            json={
                "models": [
                    {"type": "local", "provider": "ollama", "id": "llama3", "settings": {}},
                    {"type": "api", "provider": "openai", "id": "gpt-4.1-mini", "settings": {}},
                ]
            },
        )
        assert put.status_code == 200
        assert len(put.json()["models"]) == 2

        get = client.get(f"/api/doc/{doc_id}/models")
        assert get.status_code == 200
        assert get.json()["models"][0]["provider"] == "ollama"
    finally:
        app.dependency_overrides.clear()


def test_doc_models_missing_doc_returns_404(tmp_path):
    store = DocStore(db_path=tmp_path / "t.sqlite3")
    app.dependency_overrides[get_doc_store] = lambda: store
    try:
        client = TestClient(app)
        resp = client.get("/api/doc/nope/models")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.clear()

