import httpx
from fastapi.testclient import TestClient

from app.main import app


def test_zotero_connect_success(monkeypatch):
    class DummyClient:
        def fetch_top_item(self, user_id: str, api_key: str):
            return {"title": "Example Item"}

    monkeypatch.setattr("app.api.zotero.ZoteroClient", lambda base_url=None: DummyClient())
    client = TestClient(app)
    resp = client.post("/api/zotero/connect", json={"userId": "123", "apiKey": "key"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "connected"
    assert data["userId"] == "123"
    assert data["sample"]["title"] == "Example Item"


def test_zotero_connect_handles_http_error(monkeypatch):
    response = httpx.Response(401)
    error = httpx.HTTPStatusError("unauthorized", request=httpx.Request("GET", "https://api.zotero.org"), response=response)

    class DummyClient:
        def fetch_top_item(self, user_id: str, api_key: str):
            raise error

    monkeypatch.setattr("app.api.zotero.ZoteroClient", lambda base_url=None: DummyClient())
    client = TestClient(app)
    resp = client.post("/api/zotero/connect", json={"userId": "123", "apiKey": "key"})
    assert resp.status_code == 401


def test_zotero_connect_requires_fields():
    client = TestClient(app)
    resp = client.post("/api/zotero/connect", json={})
    assert resp.status_code == 422
