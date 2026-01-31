import shutil
import subprocess
import tempfile
from pathlib import Path


class LatexCompileError(RuntimeError):
    pass


class LatexCompiler:
    def compile_pdf(self, source_latex: str) -> bytes: ...


class TectonicCompiler(LatexCompiler):
    def __init__(self, tectonic_bin: str = "tectonic"):
        self._tectonic_bin = tectonic_bin

    def compile_pdf(self, source_latex: str) -> bytes:
        if shutil.which(self._tectonic_bin) is None:
            raise RuntimeError("tectonic not installed")

        with tempfile.TemporaryDirectory() as td:
            workdir = Path(td)
            tex_path = workdir / "main.tex"
            tex_path.write_text(source_latex, encoding="utf-8")

            proc = subprocess.run(
                [self._tectonic_bin, "--synctex", "--keep-logs", str(tex_path.name)],
                cwd=str(workdir),
                capture_output=True,
                text=True,
            )
            if proc.returncode != 0:
                raise LatexCompileError(proc.stderr.strip() or proc.stdout.strip() or "compile failed")

            pdf_path = workdir / "main.pdf"
            if not pdf_path.exists():
                raise LatexCompileError("compile succeeded but PDF missing")
            return pdf_path.read_bytes()


class PdfLatexCompiler(LatexCompiler):
    def __init__(self, pdflatex_bin: str = "pdflatex"):
        self._pdflatex_bin = pdflatex_bin

    def compile_pdf(self, source_latex: str) -> bytes:
        if shutil.which(self._pdflatex_bin) is None:
            raise RuntimeError("pdflatex not installed")

        with tempfile.TemporaryDirectory() as td:
            workdir = Path(td)
            tex_path = workdir / "main.tex"
            tex_path.write_text(source_latex, encoding="utf-8")
            cmd = [
                self._pdflatex_bin,
                "-interaction=nonstopmode",
                "-halt-on-error",
                tex_path.name,
            ]
            proc = subprocess.run(cmd, cwd=str(workdir), capture_output=True, text=True)
            if proc.returncode != 0:
                raise LatexCompileError(proc.stderr.strip() or proc.stdout.strip() or "compile failed")
            pdf_path = workdir / "main.pdf"
            if not pdf_path.exists():
                raise LatexCompileError("compile succeeded but PDF missing")
            return pdf_path.read_bytes()


class LatexMkCompiler(LatexCompiler):
    def __init__(self, latexmk_bin: str = "latexmk"):
        self._latexmk_bin = latexmk_bin

    def compile_pdf(self, source_latex: str) -> bytes:
        if shutil.which(self._latexmk_bin) is None:
            raise RuntimeError("latexmk not installed")

        with tempfile.TemporaryDirectory() as td:
            workdir = Path(td)
            tex_path = workdir / "main.tex"
            tex_path.write_text(source_latex, encoding="utf-8")
            cmd = [
                self._latexmk_bin,
                "-pdf",
                "-interaction=nonstopmode",
                "-halt-on-error",
                tex_path.name,
            ]
            proc = subprocess.run(cmd, cwd=str(workdir), capture_output=True, text=True)
            if proc.returncode != 0:
                raise LatexCompileError(proc.stderr.strip() or proc.stdout.strip() or "compile failed")
            pdf_path = workdir / "main.pdf"
            if not pdf_path.exists():
                raise LatexCompileError("compile succeeded but PDF missing")
            return pdf_path.read_bytes()


class AutoCompiler(LatexCompiler):
    def __init__(self):
        self._candidates: list[LatexCompiler] = [
            TectonicCompiler(),
            LatexMkCompiler(),
            PdfLatexCompiler(),
        ]

    def compile_pdf(self, source_latex: str) -> bytes:
        errors: list[str] = []
        for compiler in self._candidates:
            try:
                return compiler.compile_pdf(source_latex)
            except RuntimeError as exc:
                errors.append(str(exc))
        raise RuntimeError(
            "No LaTeX compiler available. Install one of: tectonic, latexmk, or pdflatex. "
            f"Tried: {', '.join(errors)}"
        )
