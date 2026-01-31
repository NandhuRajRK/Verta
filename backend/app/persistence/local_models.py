from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class LocalModel:
    id: str
    runtime: str
    file_name: str
    sha256: str | None
    source_url: str | None
    settings: dict


class LocalModelStore:
    def __init__(self, db_path: Path):
        self._db_path = db_path
        self._init()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init(self) -> None:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS local_models (
                  id TEXT PRIMARY KEY,
                  runtime TEXT NOT NULL,
                  file_name TEXT NOT NULL,
                  sha256 TEXT,
                  source_url TEXT,
                  settings_json TEXT NOT NULL
                )
                """
            )
            self._ensure_columns(conn)
            conn.commit()

    def _ensure_columns(self, conn: sqlite3.Connection) -> None:
        cols = {r["name"] for r in conn.execute("PRAGMA table_info(local_models)").fetchall()}
        if "file_name" not in cols:
            conn.execute("ALTER TABLE local_models ADD COLUMN file_name TEXT NOT NULL DEFAULT ''")
        if "sha256" not in cols:
            conn.execute("ALTER TABLE local_models ADD COLUMN sha256 TEXT")
        if "source_url" not in cols:
            conn.execute("ALTER TABLE local_models ADD COLUMN source_url TEXT")
        if "model_path" in cols and "file_name" in cols:
            # Best-effort migration from older schema; ignore errors if column doesn't exist.
            try:
                conn.execute("UPDATE local_models SET file_name = model_path WHERE file_name = ''")
            except sqlite3.Error:
                pass

    def upsert(
        self,
        id: str,
        runtime: str,
        file_name: str,
        sha256: str | None,
        source_url: str | None,
        settings: dict[str, Any],
    ) -> LocalModel:
        settings_json = json.dumps(settings or {})
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO local_models (id, runtime, file_name, sha256, source_url, settings_json) VALUES (?, ?, ?, ?, ?, ?)",
                (id, runtime, file_name, sha256, source_url, settings_json),
            )
            conn.commit()
        return self.get(id)

    def get(self, id: str) -> LocalModel | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM local_models WHERE id = ?", (id,)).fetchone()
            if row is None:
                return None
            return LocalModel(
                id=row["id"],
                runtime=row["runtime"],
                file_name=row["file_name"],
                sha256=row["sha256"],
                source_url=row["source_url"],
                settings=json.loads(row["settings_json"] or "{}"),
            )

    def list(self) -> list[LocalModel]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM local_models ORDER BY id ASC").fetchall()
            return [
                LocalModel(
                    id=row["id"],
                    runtime=row["runtime"],
                    file_name=row["file_name"],
                    sha256=row["sha256"],
                    source_url=row["source_url"],
                    settings=json.loads(row["settings_json"] or "{}"),
                )
                for row in rows
            ]

    def delete(self, id: str) -> bool:
        with self._connect() as conn:
            cur = conn.execute("DELETE FROM local_models WHERE id = ?", (id,))
            conn.commit()
            return cur.rowcount > 0
