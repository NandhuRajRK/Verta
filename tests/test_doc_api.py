from fastapi.testclient import TestClient

from app.main import app
from app.persistence.store import DocStore
from app.wiring import get_doc_store


def test_doc_save_and_read_roundtrip(tmp_path):
    store = DocStore(db_path=tmp_path / "t.sqlite3")
    app.dependency_overrides[get_doc_store] = lambda: store
    try:
        client = TestClient(app)
        create = client.post(
            "/api/doc",
            json={"title": "t", "content": "hello", "settings": {"model": "m1"}},
        )
        assert create.status_code == 200
        doc_id = create.json()["id"]

        read = client.get(f"/api/doc/{doc_id}")
        assert read.status_code == 200
        assert read.json()["content"] == "hello"
        assert read.json()["settings"]["model"] == "m1"
    finally:
        app.dependency_overrides.clear()


def test_doc_read_missing_returns_404(tmp_path):
    store = DocStore(db_path=tmp_path / "t.sqlite3")
    app.dependency_overrides[get_doc_store] = lambda: store
    try:
        client = TestClient(app)
        resp = client.get("/api/doc/does-not-exist")
        assert resp.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_doc_list_returns_created_docs(tmp_path):
    store = DocStore(db_path=tmp_path / "t.sqlite3")
    app.dependency_overrides[get_doc_store] = lambda: store
    try:
        client = TestClient(app)
        client.post("/api/doc", json={"title": "a", "content": "1"})
        client.post("/api/doc", json={"title": "b", "content": "2"})
        resp = client.get("/api/doc")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 2
    finally:
        app.dependency_overrides.clear()


def test_doc_update_roundtrip(tmp_path):
    store = DocStore(db_path=tmp_path / "t.sqlite3")
    app.dependency_overrides[get_doc_store] = lambda: store
    try:
        client = TestClient(app)
        created = client.post("/api/doc", json={"title": "t", "content": "old"}).json()
        doc_id = created["id"]

        updated = client.put(
            f"/api/doc/{doc_id}", json={"title": "t2", "content": "new", "settings": {"x": 1}}
        )
        assert updated.status_code == 200
        assert updated.json()["content"] == "new"

        read = client.get(f"/api/doc/{doc_id}")
        assert read.status_code == 200
        assert read.json()["title"] == "t2"
        assert read.json()["settings"]["x"] == 1
    finally:
        app.dependency_overrides.clear()
