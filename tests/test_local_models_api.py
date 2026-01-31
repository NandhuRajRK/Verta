from fastapi.testclient import TestClient

from app.main import app
from app.persistence.local_models import LocalModelStore
from app.wiring import get_local_model_store


def test_local_models_crud(tmp_path):
    store = LocalModelStore(db_path=tmp_path / "t.sqlite3")
    app.dependency_overrides[get_local_model_store] = lambda: store
    try:
        client = TestClient(app)

        created = client.post(
            "/api/local-models",
            json={
                "id": "m1",
                "runtime": "llamacpp",
                "fileName": "m1.gguf",
                "sha256": None,
                "sourceUrl": None,
                "settings": {"a": 1},
            },
        )
        assert created.status_code == 200
        assert created.json()["id"] == "m1"

        listed = client.get("/api/local-models")
        assert listed.status_code == 200
        assert len(listed.json()) == 1

        got = client.get("/api/local-models/m1")
        assert got.status_code == 200
        assert got.json()["fileName"].endswith(".gguf")

        deleted = client.delete("/api/local-models/m1")
        assert deleted.status_code == 204

        missing = client.get("/api/local-models/m1")
        assert missing.status_code == 404
    finally:
        app.dependency_overrides.clear()
