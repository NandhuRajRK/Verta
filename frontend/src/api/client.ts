import type {
  CompletionRequest,
  CompletionResponse,
  ContextBuildResponse,
  Doc,
  DocCreateRequest,
  DocModelsEnvelope,
  DocUpdateRequest,
  DocSummary,
  ShareResponse,
  SharedDocResponse,
  SearchResponse,
  Comment,
  LogEntry,
  Presence,
  Revision,
  LatexValidateResponse,
  LatexExtractImageResponse,
  LocalModel,
  OllamaStatus,
  WebSearchResponse,
} from "./types";

const API_BASE = "/api";

function authFetch(input: RequestInfo, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const token = localStorage.getItem("authToken");
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body?.error?.message ?? body?.detail ?? `${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function createDoc(req: DocCreateRequest): Promise<Doc> {
  const res = await authFetch(`${API_BASE}/doc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  return json<Doc>(res);
}

export async function listDocs(): Promise<DocSummary[]> {
  const res = await authFetch(`${API_BASE}/doc`);
  return json<DocSummary[]>(res);
}

export async function getDoc(id: string): Promise<Doc> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}`);
  return json<Doc>(res);
}

export async function updateDoc(id: string, req: DocUpdateRequest): Promise<Doc> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  return json<Doc>(res);
}

export async function getDocModels(id: string): Promise<DocModelsEnvelope> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}/models`);
  return json<DocModelsEnvelope>(res);
}

export async function putDocModels(
  id: string,
  req: DocModelsEnvelope,
): Promise<DocModelsEnvelope> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}/models`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  return json<DocModelsEnvelope>(res);
}

export async function shareDoc(id: string): Promise<ShareResponse> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}/share`, { method: "POST" });
  return json<ShareResponse>(res);
}

export async function getSharedDoc(token: string): Promise<SharedDocResponse> {
  const res = await fetch(`${API_BASE}/share/${encodeURIComponent(token)}`);
  return json<SharedDocResponse>(res);
}

export async function searchDoc(id: string, q: string): Promise<SearchResponse> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}/search?q=${encodeURIComponent(q)}`);
  return json<SearchResponse>(res);
}

export async function webSearch(q: string, k = 5): Promise<WebSearchResponse> {
  const res = await authFetch(
    `${API_BASE}/search/web?q=${encodeURIComponent(q)}&k=${encodeURIComponent(String(k))}`,
  );
  return json<WebSearchResponse>(res);
}

export async function listComments(id: string): Promise<Comment[]> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}/comments`);
  return json<Comment[]>(res);
}

export async function addComment(
  id: string,
  body: string,
  meta?: { path?: string | null; selection_start?: number | null; selection_end?: number | null },
): Promise<Comment> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}/comments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body, ...(meta ?? {}) }),
  });
  return json<Comment>(res);
}

export async function listLogs(id: string): Promise<LogEntry[]> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}/logs`);
  return json<LogEntry[]>(res);
}

export async function addLog(id: string, body: string): Promise<LogEntry> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}/logs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return json<LogEntry>(res);
}

export async function listRevisions(id: string): Promise<Revision[]> {
  const res = await authFetch(`${API_BASE}/doc/${encodeURIComponent(id)}/revisions`);
  return json<Revision[]>(res);
}

export async function restoreRevision(id: string, revId: string): Promise<Doc> {
  const res = await authFetch(
    `${API_BASE}/doc/${encodeURIComponent(id)}/revisions/${encodeURIComponent(revId)}/restore`,
    { method: "POST" },
  );
  return json<Doc>(res);
}

export async function completion(req: CompletionRequest): Promise<CompletionResponse> {
  const res = await authFetch(`${API_BASE}/model/completion`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  return json<CompletionResponse>(res);
}

export async function compileLatex(sourceLatex: string): Promise<Blob> {
  const res = await authFetch(`${API_BASE}/latex/compile`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceLatex }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body?.error?.message ?? body?.detail ?? `${res.status} ${res.statusText}`;
    throw new Error(message);
  }
  return await res.blob();
}

export async function validateLatex(sourceLatex: string): Promise<LatexValidateResponse> {
  const res = await authFetch(`${API_BASE}/latex/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceLatex }),
  });
  return json<LatexValidateResponse>(res);
}

export async function extractLatexFromImage(file: File): Promise<LatexExtractImageResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await authFetch(`${API_BASE}/latex/extract-image`, { method: "POST", body: form });
  return json<LatexExtractImageResponse>(res);
}

export async function buildContext(params: {
  sourceLatex: string;
  cursorIndex?: number;
  selectionStart?: number;
  selectionEnd?: number;
  maxContextChars?: number;
  maxContextTokens?: number;
}): Promise<ContextBuildResponse> {
  const res = await authFetch(`${API_BASE}/context/build`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params),
  });
  return json<ContextBuildResponse>(res);
}

export async function listLocalModels(): Promise<LocalModel[]> {
  const res = await authFetch(`${API_BASE}/local-models`);
  return json<LocalModel[]>(res);
}

export async function upsertLocalModel(model: LocalModel): Promise<LocalModel> {
  const res = await authFetch(`${API_BASE}/local-models`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(model),
  });
  return json<LocalModel>(res);
}

export async function verifyLocalModel(id: string): Promise<unknown> {
  const res = await authFetch(`${API_BASE}/local-models/${encodeURIComponent(id)}/verify`, { method: "POST" });
  return json(res);
}

export async function downloadLocalModel(id: string): Promise<unknown> {
  const res = await authFetch(`${API_BASE}/local-models/${encodeURIComponent(id)}/download`, { method: "POST" });
  return json(res);
}

export async function deleteLocalModel(id: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/local-models/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message =
      body?.error?.message ?? body?.detail ?? `${res.status} ${res.statusText}`;
    throw new Error(message);
  }
}

export async function connectZotero(): Promise<{ status: string }> {
  const res = await authFetch(`${API_BASE}/zotero/connect`, { method: "POST" });
  return json<{ status: string }>(res);
}

export async function register(username: string, password: string): Promise<{ token: string; user: { id: string; username: string } }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return json(res);
}

export async function login(username: string, password: string): Promise<{ token: string; user: { id: string; username: string } }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return json(res);
}

export async function logout(): Promise<{ ok: boolean }> {
  const res = await authFetch(`${API_BASE}/auth/logout`, { method: "POST" });
  return json(res);
}

export async function me(): Promise<{ id: string; username: string }> {
  const res = await authFetch(`${API_BASE}/auth/me`);
  return json(res);
}

export async function heartbeatPresence(doc_id: string, user_id: string, display_name: string): Promise<Presence> {
  const res = await authFetch(`${API_BASE}/presence/heartbeat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ doc_id, user_id, display_name }),
  });
  return json(res);
}

export async function listPresence(doc_id: string): Promise<Presence[]> {
  const res = await authFetch(`${API_BASE}/presence/list?doc_id=${encodeURIComponent(doc_id)}`);
  return json(res);
}

export async function getOllamaStatus(baseUrl?: string): Promise<OllamaStatus> {
  const qs = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : "";
  const res = await authFetch(`${API_BASE}/ollama/status${qs}`);
  return json(res);
}
