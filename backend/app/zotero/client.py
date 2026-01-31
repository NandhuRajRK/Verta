from __future__ import annotations

from typing import Any

import httpx


class ZoteroClient:
    def __init__(self, base_url: str | None = None, timeout: float = 10.0):
        self._base_url = (base_url or "https://api.zotero.org").rstrip("/")
        self._timeout = timeout

    def fetch_top_item(self, user_id: str, api_key: str) -> dict[str, Any] | None:
        headers = {"Zotero-API-Key": api_key}
        params = {"limit": 1}
        url = f"{self._base_url}/users/{user_id}/items/top"
        with httpx.Client(timeout=self._timeout) as client:
            response = client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
        if isinstance(data, list) and data:
            return data[0]
        return None


def create_zotero_client(base_url: str | None = None) -> ZoteroClient:
    return ZoteroClient(base_url=base_url)
