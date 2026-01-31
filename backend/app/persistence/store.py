from __future__ import annotations

import json
import sqlite3
import uuid
import secrets
import hashlib
from datetime import datetime, timezone
from pathlib import Path

from app.persistence.models import DocCreateRequest, DocResponse


class DocStore:
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
                CREATE TABLE IF NOT EXISTS docs (
                  id TEXT PRIMARY KEY,
                  title TEXT,
                  content TEXT NOT NULL,
                  settings_json TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS doc_models (
                  doc_id TEXT PRIMARY KEY,
                  models_json TEXT NOT NULL,
                  FOREIGN KEY(doc_id) REFERENCES docs(id) ON DELETE CASCADE
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS doc_revisions (
                  id TEXT PRIMARY KEY,
                  doc_id TEXT NOT NULL,
                  content TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY(doc_id) REFERENCES docs(id) ON DELETE CASCADE
                )
                """
            )
            conn.execute(
                """
                CREATE VIRTUAL TABLE IF NOT EXISTS doc_files_fts
                USING fts5(doc_id, path, content)
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                  id TEXT PRIMARY KEY,
                  username TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL,
                  salt TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                  token TEXT PRIMARY KEY,
                  user_id TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS doc_shares (
                  token TEXT PRIMARY KEY,
                  doc_id TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY(doc_id) REFERENCES docs(id) ON DELETE CASCADE
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS doc_comments (
                  id TEXT PRIMARY KEY,
                  doc_id TEXT NOT NULL,
                  body TEXT NOT NULL,
                  path TEXT,
                  selection_start INTEGER,
                  selection_end INTEGER,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY(doc_id) REFERENCES docs(id) ON DELETE CASCADE
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS doc_logs (
                  id TEXT PRIMARY KEY,
                  doc_id TEXT NOT NULL,
                  body TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY(doc_id) REFERENCES docs(id) ON DELETE CASCADE
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS presence (
                  id TEXT PRIMARY KEY,
                  doc_id TEXT NOT NULL,
                  user_id TEXT NOT NULL,
                  display_name TEXT NOT NULL,
                  last_seen TEXT NOT NULL
                )
                """
            )
            conn.commit()

    def create(self, req: DocCreateRequest) -> DocResponse:
        doc_id = req.id or str(uuid.uuid4())
        settings_json = json.dumps(req.settings or {})
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO docs (id, title, content, settings_json) VALUES (?, ?, ?, ?)",
                (doc_id, req.title, req.content, settings_json),
            )
            conn.commit()
        self._update_index(doc_id, req.content)
        return DocResponse(id=doc_id, title=req.title, content=req.content, settings=req.settings)

    def get(self, doc_id: str) -> DocResponse | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM docs WHERE id = ?", (doc_id,)).fetchone()
            if row is None:
                return None
            return DocResponse(
                id=row["id"],
                title=row["title"],
                content=row["content"],
                settings=json.loads(row["settings_json"] or "{}"),
            )

    def list(self) -> list[DocResponse]:
        with self._connect() as conn:
            rows = conn.execute("SELECT * FROM docs ORDER BY rowid ASC").fetchall()
            return [
                DocResponse(
                    id=row["id"],
                    title=row["title"],
                    content=row["content"],
                    settings=json.loads(row["settings_json"] or "{}"),
                )
                for row in rows
            ]

    def update(self, doc_id: str, title: str | None, content: str, settings: dict) -> DocResponse | None:
        existing = self.get(doc_id)
        if existing is None:
            return None
        self._add_revision(doc_id, existing.content)
        settings_json = json.dumps(settings or {})
        with self._connect() as conn:
            conn.execute(
                "UPDATE docs SET title = ?, content = ?, settings_json = ? WHERE id = ?",
                (title, content, settings_json, doc_id),
            )
            conn.commit()
        self._update_index(doc_id, content)
        return self.get(doc_id)

    def get_models(self, doc_id: str) -> list[dict] | None:
        if self.get(doc_id) is None:
            return None
        with self._connect() as conn:
            row = conn.execute(
                "SELECT models_json FROM doc_models WHERE doc_id = ?", (doc_id,)
            ).fetchone()
            if row is None:
                return []
            return list(json.loads(row["models_json"] or "[]"))

    def set_models(self, doc_id: str, models: list[dict]) -> list[dict] | None:
        if self.get(doc_id) is None:
            return None
        models_json = json.dumps(models or [])
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO doc_models (doc_id, models_json) VALUES (?, ?)",
                (doc_id, models_json),
            )
            conn.commit()
        return self.get_models(doc_id)

    def _add_revision(self, doc_id: str, content: str) -> None:
        rev_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO doc_revisions (id, doc_id, content, created_at) VALUES (?, ?, ?, ?)",
                (rev_id, doc_id, content or "", created_at),
            )
            conn.commit()

    def list_revisions(self, doc_id: str) -> list[dict] | None:
        if self.get(doc_id) is None:
            return None
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, doc_id, created_at FROM doc_revisions WHERE doc_id = ? ORDER BY created_at DESC",
                (doc_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def get_revision(self, doc_id: str, rev_id: str) -> dict | None:
        if self.get(doc_id) is None:
            return None
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM doc_revisions WHERE id = ? AND doc_id = ?",
                (rev_id, doc_id),
            ).fetchone()
            return dict(row) if row else None

    def restore_revision(self, doc_id: str, rev_id: str) -> DocResponse | None:
        rev = self.get_revision(doc_id, rev_id)
        if rev is None:
            return None
        return self.update(doc_id, title=self.get(doc_id).title if self.get(doc_id) else None, content=rev["content"], settings=self.get(doc_id).settings if self.get(doc_id) else {})

    def _update_index(self, doc_id: str, content: str) -> None:
        try:
            data = json.loads(content or "{}")
            entries = data.get("entries", {})
        except Exception:
            entries = {}
        rows: list[tuple[str, str, str]] = []
        for path, entry in entries.items():
            if not isinstance(entry, dict):
                continue
            if entry.get("type") != "file":
                continue
            body = entry.get("content") or ""
            rows.append((doc_id, path, body))
        with self._connect() as conn:
            conn.execute("DELETE FROM doc_files_fts WHERE doc_id = ?", (doc_id,))
            if rows:
                conn.executemany(
                    "INSERT INTO doc_files_fts (doc_id, path, content) VALUES (?, ?, ?)",
                    rows,
                )
            conn.commit()

    def search(self, doc_id: str | None, query: str) -> list[dict]:
        if not query:
            return []
        with self._connect() as conn:
            if doc_id:
                rows = conn.execute(
                    "SELECT doc_id, path, snippet(doc_files_fts, 2, '[', ']', '...', 20) as snippet FROM doc_files_fts WHERE doc_id = ? AND doc_files_fts MATCH ?",
                    (doc_id, query),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT doc_id, path, snippet(doc_files_fts, 2, '[', ']', '...', 20) as snippet FROM doc_files_fts WHERE doc_files_fts MATCH ?",
                    (query,),
                ).fetchall()
            return [dict(row) for row in rows]

    def create_user(self, username: str, password: str) -> dict:
        user_id = str(uuid.uuid4())
        salt = secrets.token_hex(8)
        pwd_hash = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO users (id, username, password_hash, salt) VALUES (?, ?, ?, ?)",
                (user_id, username, pwd_hash, salt),
            )
            conn.commit()
        return {"id": user_id, "username": username}

    def get_user_by_username(self, username: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
            return dict(row) if row else None

    def verify_user(self, username: str, password: str) -> dict | None:
        user = self.get_user_by_username(username)
        if not user:
            return None
        pwd_hash = hashlib.sha256((user["salt"] + password).encode("utf-8")).hexdigest()
        if pwd_hash != user["password_hash"]:
            return None
        return {"id": user["id"], "username": user["username"]}

    def create_session(self, user_id: str) -> str:
        token = secrets.token_hex(16)
        created_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)",
                (token, user_id, created_at),
            )
            conn.commit()
        return token

    def get_user_by_token(self, token: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT u.id, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ?",
                (token,),
            ).fetchone()
            return dict(row) if row else None

    def delete_session(self, token: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
            conn.commit()

    def create_share(self, doc_id: str) -> str | None:
        if self.get(doc_id) is None:
            return None
        token = secrets.token_hex(12)
        created_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO doc_shares (token, doc_id, created_at) VALUES (?, ?, ?)",
                (token, doc_id, created_at),
            )
            conn.commit()
        return token

    def get_share(self, token: str) -> dict | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT token, doc_id FROM doc_shares WHERE token = ?",
                (token,),
            ).fetchone()
            return dict(row) if row else None

    def heartbeat_presence(self, doc_id: str, user_id: str, display_name: str) -> dict:
        pid = f"{doc_id}:{user_id}"
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO presence (id, doc_id, user_id, display_name, last_seen) VALUES (?, ?, ?, ?, ?)",
                (pid, doc_id, user_id, display_name, now),
            )
            conn.commit()
        return {"id": pid, "doc_id": doc_id, "user_id": user_id, "display_name": display_name, "last_seen": now}

    def list_presence(self, doc_id: str, since_seconds: int = 45) -> list[dict]:
        cutoff = datetime.now(timezone.utc).timestamp() - since_seconds
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM presence WHERE doc_id = ?",
                (doc_id,),
            ).fetchall()
            result = []
            for row in rows:
                try:
                    ts = datetime.fromisoformat(row["last_seen"]).timestamp()
                except Exception:
                    ts = 0
                if ts >= cutoff:
                    result.append(dict(row))
            return result

    def list_comments(self, doc_id: str) -> list[dict] | None:
        if self.get(doc_id) is None:
            return None
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM doc_comments WHERE doc_id = ? ORDER BY created_at ASC",
                (doc_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def add_comment(self, doc_id: str, body: str, path: str | None, selection_start: int | None, selection_end: int | None) -> dict | None:
        if self.get(doc_id) is None:
            return None
        comment_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO doc_comments (id, doc_id, body, path, selection_start, selection_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (comment_id, doc_id, body, path, selection_start, selection_end, created_at),
            )
            conn.commit()
        return {
            "id": comment_id,
            "doc_id": doc_id,
            "body": body,
            "path": path,
            "selection_start": selection_start,
            "selection_end": selection_end,
            "created_at": created_at,
        }

    def list_logs(self, doc_id: str) -> list[dict] | None:
        if self.get(doc_id) is None:
            return None
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT * FROM doc_logs WHERE doc_id = ? ORDER BY created_at DESC",
                (doc_id,),
            ).fetchall()
            return [dict(row) for row in rows]

    def add_log(self, doc_id: str, body: str) -> dict | None:
        if self.get(doc_id) is None:
            return None
        log_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO doc_logs (id, doc_id, body, created_at) VALUES (?, ?, ?, ?)",
                (log_id, doc_id, body, created_at),
            )
            conn.commit()
        return {"id": log_id, "doc_id": doc_id, "body": body, "created_at": created_at}
