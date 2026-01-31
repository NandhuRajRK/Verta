from app.context.extract import build_context, build_context_with_limits, estimate_tokens, parse_latex_to_ast


def test_parse_latex_into_valid_ast():
    src = r"""
    \section{Intro}
    \label{sec:intro}
    \begin{equation}
    E = mc^2
    \end{equation}
    """
    ast = parse_latex_to_ast(src)
    assert "Intro" in ast.sections
    assert "sec:intro" in ast.labels
    assert any("E = mc^2" in eq for eq in ast.equations)


def test_build_context_respects_limit():
    src = "\\section{A}\n" + ("x" * 500)
    ctx = build_context(src, max_chars=120)
    assert len(ctx) <= 120


def test_build_context_respects_token_limit():
    src = "\\section{A}\n" + ("x" * 2000)
    ctx = build_context_with_limits(src, max_chars=4000, max_tokens=50)
    assert estimate_tokens(ctx) <= 50
