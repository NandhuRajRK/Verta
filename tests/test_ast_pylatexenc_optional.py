import pytest

from app.context.extract import parse_latex_to_ast


def test_pylatexenc_parser_handles_nested_braces_if_installed():
    pytest.importorskip("pylatexenc")
    src = r"\section{Intro {Nested}}\label{sec:intro}"
    ast = parse_latex_to_ast(src)
    assert any("Intro" in s for s in ast.sections)
    assert "sec:intro" in ast.labels

