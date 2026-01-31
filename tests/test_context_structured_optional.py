import pytest

from fastapi.testclient import TestClient

from app.main import app


def test_context_build_includes_structured_fields_if_pylatexenc_installed():
    pytest.importorskip("pylatexenc")
    client = TestClient(app)
    src = r"""
    \section{Intro}
    \label{sec:intro}
    As shown in \cite{smith2020}, we have:
    \begin{equation}
    E = mc^2
    \end{equation}
    """
    resp = client.post(
        "/api/context/build",
        json={"sourceLatex": src, "cursorIndex": 50, "maxContextChars": 500, "maxContextTokens": 200},
    )
    assert resp.status_code == 200
    meta = resp.json()["metadata"]
    assert "currentSection" in meta
    assert "labelsNear" in meta
    assert "citationsNear" in meta
    assert "equationsNear" in meta

