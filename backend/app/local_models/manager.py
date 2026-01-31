import hashlib
from pathlib import Path


class ModelManager:
    def __init__(self, models_dir: Path, transport=None):
        self._models_dir = models_dir
        self._transport = transport
        self._models_dir.mkdir(parents=True, exist_ok=True)

    @property
    def models_dir(self) -> Path:
        return self._models_dir

    def resolve_path(self, file_name: str) -> Path:
        if not file_name:
            raise ValueError("fileName required")
        p = (self._models_dir / file_name).resolve()
        root = self._models_dir.resolve()
        if root not in p.parents and p != root:
            raise ValueError("fileName must stay within models dir")
        return p

    def sha256_file(self, path: Path) -> str:
        h = hashlib.sha256()
        with path.open("rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                h.update(chunk)
        return h.hexdigest()

    def verify(self, file_name: str, expected_sha256: str | None) -> dict:
        path = self.resolve_path(file_name)
        if not path.exists():
            return {"exists": False, "path": str(path), "sizeBytes": 0, "sha256": None, "sha256Matches": False}
        actual = self.sha256_file(path)
        size = path.stat().st_size
        matches = (expected_sha256 is None) or (actual.lower() == expected_sha256.lower())
        return {"exists": True, "path": str(path), "sizeBytes": size, "sha256": actual, "sha256Matches": matches}

    async def download(self, source_url: str, file_name: str) -> Path:
        if not source_url:
            raise ValueError("sourceUrl required")
        path = self.resolve_path(file_name)
        tmp_path = path.with_suffix(path.suffix + ".part")

        try:
            import httpx  # type: ignore
        except Exception as exc:  # pragma: no cover
            raise RuntimeError("httpx not installed") from exc

        async with httpx.AsyncClient(timeout=120.0, transport=self._transport) as client:
            async with client.stream("GET", source_url) as r:
                r.raise_for_status()
                with tmp_path.open("wb") as f:
                    async for chunk in r.aiter_bytes():
                        f.write(chunk)

        tmp_path.replace(path)
        return path

