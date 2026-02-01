import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

let doc: any = null;
let models: any = { models: [] };
let localModels: any[] = [];
let comments: any[] = [];
let logs: any[] = [];
let shares: Record<string, string> = {};
let users: any[] = [];
let sessions: Record<string, string> = {};
let presence: any[] = [];

export function resetDb() {
  doc = null;
  models = {
    models: [
      { type: "local", provider: "ollama", id: "llama3", settings: {} },
      { type: "api", provider: "openai", id: "gpt-4.1-mini", settings: {} },
    ],
  };
  localModels = [
    {
      id: "m1",
      runtime: "llamacpp",
      fileName: "m1.gguf",
      sha256: "0".repeat(64),
      sourceUrl: "https://example.invalid/m1.gguf",
      settings: {},
    },
  ];
  comments = [];
  logs = [];
  shares = {};
  users = [];
  sessions = {};
  presence = [];
}

resetDb();

export const server = setupServer(
  http.post("/api/doc", async ({ request }) => {
    const body = await request.json();
    doc = {
      id: body.id ?? "doc-1",
      title: body.title ?? null,
      content: body.content ?? "",
      settings: body.settings ?? {},
    };
    logs.unshift({ id: "log-1", doc_id: doc.id, body: "Created doc", created_at: new Date().toISOString() });
    return HttpResponse.json(doc);
  }),
  http.get("/api/doc", async () => {
    if (!doc) {
      doc = {
        id: "doc-1",
        title: "workspace",
        content: JSON.stringify({
          active: "main.tex",
          entries: { "main.tex": { type: "file", content: "" } },
        }),
        settings: {},
      };
    }
    return HttpResponse.json([{ id: doc.id, title: doc.title }]);
  }),
  http.get("/api/doc/:id", ({ params }) => {
    if (!doc) {
      doc = {
        id: String(params.id ?? "doc-1"),
        title: "workspace",
        content: JSON.stringify({
          active: "main.tex",
          entries: { "main.tex": { type: "file", content: "" } },
        }),
        settings: {},
      };
    }
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json(doc);
  }),
  http.put("/api/doc/:id", async ({ params, request }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    const body = await request.json();
    doc = { ...doc, ...body };
    return HttpResponse.json(doc);
  }),
  http.post("/api/doc/:id/share", ({ params }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    const token = `share-${params.id}`;
    shares[token] = String(params.id);
    logs.unshift({ id: "log-share", doc_id: doc.id, body: "Shared project", created_at: new Date().toISOString() });
    return HttpResponse.json({ url: `/share/${token}` });
  }),
  http.get("/share/:token", ({ params }) => {
    const docId = shares[String(params.token)];
    if (!doc || doc.id !== docId) {
      return HttpResponse.json(
        { error: { status: 404, message: "Share not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ doc_id: doc.id, title: doc.title, content: doc.content });
  }),
  http.get("/api/doc/:id/search", ({ request, params }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    if (!q) return HttpResponse.json({ results: [] });
    return HttpResponse.json({ results: [{ path: "main.tex", snippet: "mock" }] });
  }),
  http.get("/api/search", ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    if (!q) return HttpResponse.json({ results: [] });
    return HttpResponse.json({ results: [{ doc_id: "doc-1", path: "main.tex", snippet: "mock" }] });
  }),
  http.get("/api/doc/:id/comments", ({ params }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json(comments);
  }),
  http.post("/api/doc/:id/comments", async ({ params, request }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    const body = await request.json();
    const created = {
      id: `c-${comments.length + 1}`,
      doc_id: doc.id,
      body: body.body ?? "",
      created_at: new Date().toISOString(),
    };
    comments.push(created);
    return HttpResponse.json(created);
  }),
  http.get("/api/doc/:id/logs", ({ params }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json(logs);
  }),
  http.post("/api/doc/:id/logs", async ({ params, request }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    const body = await request.json();
    const created = {
      id: `l-${logs.length + 1}`,
      doc_id: doc.id,
      body: body.body ?? "",
      created_at: new Date().toISOString(),
    };
    logs.unshift(created);
    return HttpResponse.json(created);
  }),
  http.get("/api/doc/:id/revisions", ({ params }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json([{ id: "rev-1", doc_id: doc.id, created_at: new Date().toISOString() }]);
  }),
  http.get("/api/doc/:id/revisions/:revId", ({ params }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ id: params.revId, doc_id: doc.id, content: doc.content, created_at: new Date().toISOString() });
  }),
  http.post("/api/doc/:id/revisions/:revId/restore", ({ params }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json(doc);
  }),
  http.get("/api/doc/:id/models", ({ params }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    return HttpResponse.json(models);
  }),
  http.put("/api/doc/:id/models", async ({ params, request }) => {
    if (!doc || doc.id !== params.id) {
      return HttpResponse.json(
        { error: { status: 404, message: "Document not found" } },
        { status: 404 },
      );
    }
    models = await request.json();
    return HttpResponse.json(models);
  }),
  http.post("/api/model/completion", async ({ request }) => {
    const body = await request.json();
    const json = {
      file: "main.tex",
      patch: "@@ -1,0 +1,1 @@\n+Suggested change",
      message: `Edit: ${String(body.prompt ?? "").slice(0, 40)}`,
    };
    return HttpResponse.json({ text: JSON.stringify(json), metadata: { mocked: true } });
  }),
  http.get("/api/ollama/status", async () => {
    return HttpResponse.json({ ok: true, baseUrl: "http://localhost:11434", models: ["llama3"] });
  }),
  http.post("/api/latex/compile", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
    return new HttpResponse(pdf, {
      status: 200,
      headers: { "content-type": "application/pdf" },
    });
  }),
  http.post("/api/latex/validate", async ({ request }) => {
    const body = await request.json();
    const src = String(body.sourceLatex ?? "");
    if (src.includes("{") && !src.includes("}")) {
      return HttpResponse.json({ ok: false, errors: ["Unbalanced brace count"] });
    }
    return HttpResponse.json({ ok: true, errors: [] });
  }),
  http.post("/api/latex/extract-image", async () => {
    return HttpResponse.json({ latex: "\\alpha + \\beta", metadata: { mocked: true } });
  }),
  http.post("/api/context/build", async ({ request }) => {
    const body = await request.json();
    const src = String(body.sourceLatex ?? "");
    return HttpResponse.json({ context: src.slice(0, 100), metadata: { mode: "cursor" } });
  }),
  http.get("/api/local-models", async () => {
    return HttpResponse.json(localModels);
  }),
  http.post("/api/local-models", async ({ request }) => {
    const body = await request.json();
    const idx = localModels.findIndex((m) => m.id === body.id);
    if (idx >= 0) localModels[idx] = body;
    else localModels.push(body);
    return HttpResponse.json(body);
  }),
  http.post("/api/local-models/:id/verify", async ({ params }) => {
    return HttpResponse.json({ ok: true, exists: true, path: `/models/${params.id}`, sha256Matches: true });
  }),
  http.post("/api/local-models/:id/download", async ({ params }) => {
    return HttpResponse.json({ ok: true, exists: true, path: `/models/${params.id}`, sha256Matches: true });
  }),
  http.delete("/api/local-models/:id", async ({ params }) => {
    localModels = localModels.filter((m) => m.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
  http.post("/api/zotero/connect", async () => {
    return HttpResponse.json({ status: "connected" });
  }),
  http.post("/api/auth/register", async ({ request }) => {
    const body = await request.json();
    const user = { id: `u-${users.length + 1}`, username: body.username };
    users.push(user);
    const token = `t-${user.id}`;
    sessions[token] = user.id;
    return HttpResponse.json({ token, user });
  }),
  http.post("/api/auth/login", async ({ request }) => {
    const body = await request.json();
    const user = users.find((u) => u.username === body.username) ?? { id: "u-1", username: body.username };
    if (!users.find((u) => u.username === body.username)) users.push(user);
    const token = `t-${user.id}`;
    sessions[token] = user.id;
    return HttpResponse.json({ token, user });
  }),
  http.post("/api/auth/logout", () => {
    return HttpResponse.json({ ok: true });
  }),
  http.get("/api/auth/me", ({ request }) => {
    const auth = request.headers.get("authorization");
    if (!auth) return HttpResponse.json({ error: { status: 401, message: "Not authenticated" } }, { status: 401 });
    const token = auth.split(" ")[1];
    const userId = sessions[token];
    if (!userId) return HttpResponse.json({ error: { status: 401, message: "Not authenticated" } }, { status: 401 });
    const user = users.find((u) => u.id === userId) ?? { id: userId, username: "user" };
    return HttpResponse.json(user);
  }),
  http.post("/api/presence/heartbeat", async ({ request }) => {
    const body = await request.json();
    const row = { id: `${body.doc_id}:${body.user_id}`, ...body, last_seen: new Date().toISOString() };
    presence = presence.filter((p) => p.id !== row.id).concat(row);
    return HttpResponse.json(row);
  }),
  http.get("/api/presence/list", ({ request }) => {
    const url = new URL(request.url);
    const docId = url.searchParams.get("doc_id");
    return HttpResponse.json(presence.filter((p) => p.doc_id === docId));
  }),
);
