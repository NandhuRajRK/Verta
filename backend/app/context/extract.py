import re
from dataclasses import dataclass


@dataclass(frozen=True)
class LatexAst:
    sections: list[str]
    labels: list[str]
    equations: list[str]


_SECTION_RE = re.compile(r"\\section\{([^}]*)\}")
_LABEL_RE = re.compile(r"\\label\{([^}]*)\}")
_EQUATION_RE = re.compile(
    r"\\begin\{equation\}(.*?)\\end\{equation\}", re.DOTALL | re.MULTILINE
)


def parse_latex_to_ast(source: str) -> LatexAst:
    try:
        return _parse_with_pylatexenc(source)
    except Exception:
        return LatexAst(
            sections=_SECTION_RE.findall(source),
            labels=_LABEL_RE.findall(source),
            equations=[eq.strip() for eq in _EQUATION_RE.findall(source)],
        )


def _parse_with_pylatexenc(source: str) -> LatexAst:
    # Optional dependency; if unavailable or parsing fails, caller falls back to regex parsing.
    from pylatexenc.latexwalker import LatexWalker  # type: ignore
    from pylatexenc.latexwalker import LatexMacroNode  # type: ignore
    from pylatexenc.latexwalker import LatexEnvironmentNode  # type: ignore

    walker = LatexWalker(source)
    nodes, _, _ = walker.get_latex_nodes(pos=0)

    sections: list[str] = []
    labels: list[str] = []
    equations: list[str] = []

    def walk(ns):
        for n in ns:
            if isinstance(n, LatexMacroNode):
                name = n.macroname
                if name == "section" and n.nodeargd and n.nodeargd.argnlist:
                    arg = n.nodeargd.argnlist[0]
                    sections.append(arg.latex_verbatim())
                if name == "label" and n.nodeargd and n.nodeargd.argnlist:
                    arg = n.nodeargd.argnlist[0]
                    labels.append(arg.latex_verbatim())
                if getattr(n, "nodelist", None):
                    walk(n.nodelist)
            elif isinstance(n, LatexEnvironmentNode):
                if n.environmentname == "equation":
                    equations.append((n.latex_verbatim() or "").strip())
                if getattr(n, "nodelist", None):
                    walk(n.nodelist)
            else:
                child = getattr(n, "nodelist", None)
                if child:
                    walk(child)

    walk(nodes)
    return LatexAst(sections=sections, labels=labels, equations=equations)


def extract_structured_context(
    source: str,
    *,
    center_index: int,
    window_chars: int = 2000,
) -> dict:
    """
    Best-effort extraction of "nearby" semantic items around a cursor index.

    Uses pylatexenc when available; otherwise falls back to regex heuristics.
    """
    start = max(0, center_index - window_chars)
    end = min(len(source), center_index + window_chars)
    window = source[start:end]

    try:
        return _extract_structured_with_pylatexenc(source, center_index=center_index, window=(start, end))
    except Exception:
        # Fallback: use regex within the window, and approximate "current section" as last section header in window.
        sections = _SECTION_RE.findall(window)
        current_section = sections[-1] if sections else None
        labels = _LABEL_RE.findall(window)
        equations = [eq.strip() for eq in _EQUATION_RE.findall(window)]
        citations = re.findall(r"\\cite[a-zA-Z]*\{([^}]*)\}", window)
        flat_cites: list[str] = []
        for c in citations:
            flat_cites.extend([x.strip() for x in c.split(",") if x.strip()])
        return {
            "currentSection": current_section,
            "labelsNear": labels[:50],
            "citationsNear": flat_cites[:50],
            "equationsNear": equations[:10],
            "window": {"start": start, "end": end},
        }


def _extract_structured_with_pylatexenc(source: str, *, center_index: int, window: tuple[int, int]) -> dict:
    from pylatexenc.latexwalker import LatexWalker  # type: ignore
    from pylatexenc.latexwalker import LatexEnvironmentNode  # type: ignore
    from pylatexenc.latexwalker import LatexMacroNode  # type: ignore

    start, end = window
    walker = LatexWalker(source)
    nodes, _, _ = walker.get_latex_nodes(pos=0)

    current_section: str | None = None
    labels: list[str] = []
    citations: list[str] = []
    equations: list[str] = []

    def within(n) -> bool:
        pos = getattr(n, "pos", None)
        length = getattr(n, "len", None)
        if pos is None or length is None:
            return False
        n_end = pos + length
        return not (n_end < start or pos > end)

    def before_center(n) -> bool:
        pos = getattr(n, "pos", None)
        return pos is not None and pos <= center_index

    def walk(ns):
        nonlocal current_section
        for n in ns:
            if isinstance(n, LatexMacroNode):
                name = n.macroname
                if name == "section" and before_center(n) and n.nodeargd and n.nodeargd.argnlist:
                    arg = n.nodeargd.argnlist[0]
                    current_section = arg.latex_verbatim()
                if within(n) and n.nodeargd and n.nodeargd.argnlist:
                    arg0 = n.nodeargd.argnlist[0]
                    if name == "label":
                        labels.append(arg0.latex_verbatim())
                    if name.startswith("cite"):
                        raw = arg0.latex_verbatim()
                        for item in raw.split(","):
                            item = item.strip()
                            if item:
                                citations.append(item)
                if getattr(n, "nodelist", None):
                    walk(n.nodelist)
            elif isinstance(n, LatexEnvironmentNode):
                if within(n) and n.environmentname == "equation":
                    equations.append((n.latex_verbatim() or "").strip())
                if getattr(n, "nodelist", None):
                    walk(n.nodelist)
            else:
                child = getattr(n, "nodelist", None)
                if child:
                    walk(child)

    walk(nodes)
    return {
        "currentSection": current_section,
        "labelsNear": labels[:50],
        "citationsNear": citations[:50],
        "equationsNear": equations[:10],
        "window": {"start": start, "end": end},
    }


def build_structured_context_with_limits(
    source: str,
    *,
    center_index: int,
    max_chars: int,
    max_tokens: int,
) -> tuple[str, dict]:
    meta = extract_structured_context(source, center_index=center_index)
    header_lines = [
        "Structured LaTeX Context",
        f"Current Section: {meta.get('currentSection') or ''}".rstrip(),
        f"Nearby Labels: {', '.join(meta.get('labelsNear') or [])}",
        f"Nearby Citations: {', '.join(meta.get('citationsNear') or [])}",
        f"Nearby Equations: {len(meta.get('equationsNear') or [])}",
        "---",
    ]
    header = "\n".join(header_lines) + "\n"

    w = meta["window"]
    snippet = source[w["start"] : w["end"]]
    combined = header + snippet
    ctx = build_context_with_limits(combined, max_chars=max_chars, max_tokens=max_tokens)
    return ctx, meta


def build_context(source: str, max_chars: int) -> str:
    if max_chars <= 0:
        return ""
    ast = parse_latex_to_ast(source)
    header = (
        "LaTeX Context\n"
        f"Sections: {', '.join(ast.sections[:10])}\n"
        f"Labels: {', '.join(ast.labels[:20])}\n"
        f"Equations: {len(ast.equations)}\n"
        "---\n"
    )
    body_budget = max(0, max_chars - len(header))
    return (header + source[:body_budget])[:max_chars]


def estimate_tokens(text: str) -> int:
    # Heuristic: ~4 chars per token for English-ish text.
    if not text:
        return 0
    return max(1, (len(text) + 3) // 4)


def build_context_with_limits(source: str, max_chars: int, max_tokens: int) -> str:
    if max_chars <= 0 or max_tokens <= 0:
        return ""
    ctx = build_context(source, max_chars=max_chars)
    while ctx and estimate_tokens(ctx) > max_tokens:
        ctx = ctx[: max(0, len(ctx) - 100)]
    return ctx
