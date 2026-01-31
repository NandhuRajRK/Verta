import re


_BEGIN_RE = re.compile(r"\\begin\{([^}]+)\}")
_END_RE = re.compile(r"\\end\{([^}]+)\}")


def validate_latex(source: str) -> list[str]:
    errors: list[str] = []

    if source.count("{") != source.count("}"):
        errors.append("Unbalanced brace count")

    stack: list[str] = []
    for m in re.finditer(r"\\begin\{([^}]+)\}|\\end\{([^}]+)\}", source):
        begin = m.group(1)
        end = m.group(2)
        if begin:
            stack.append(begin)
        elif end:
            if not stack:
                errors.append(f"Environment mismatch: unexpected end '{end}'")
            else:
                top = stack.pop()
                if top != end:
                    errors.append(f"Environment mismatch: began '{top}' ended '{end}'")

    for unclosed in reversed(stack):
        errors.append(f"Environment mismatch: unclosed '{unclosed}'")

    return errors

