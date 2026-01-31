from fastapi.testclient import TestClient

from app.main import app


def test_context_build_with_cursor_respects_limits():
    client = TestClient(app)
    src = "\\section{Intro}\n" + ("x" * 2000) + "\n\\label{sec:intro}\n"
    resp = client.post(
        "/api/context/build",
        json={"sourceLatex": src, "cursorIndex": 20, "maxContextChars": 200, "maxContextTokens": 60},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "context" in data
    assert len(data["context"]) <= 200
    assert data["metadata"]["mode"] == "cursor"


def test_context_build_with_selection_includes_selection_snippet():
    client = TestClient(app)
    src = "AAA BBB CCC DDD"
    resp = client.post(
        "/api/context/build",
        json={"sourceLatex": src, "selectionStart": 4, "selectionEnd": 11, "maxContextChars": 200, "maxContextTokens": 60},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "BBB CCC" in data["metadata"]["selection"]

