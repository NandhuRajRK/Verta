export type ModelConfig = {
  type: "local" | "api";
  provider?: string | null;
  id: string;
  settings?: Record<string, unknown>;
};

export type Doc = {
  id: string;
  title?: string | null;
  content: string;
  settings: Record<string, unknown>;
};

export type DocCreateRequest = {
  id?: string;
  title?: string | null;
  content: string;
  settings?: Record<string, unknown>;
};

export type DocUpdateRequest = {
  title?: string | null;
  content: string;
  settings?: Record<string, unknown>;
};

export type DocModelsEnvelope = {
  models: ModelConfig[];
};

export type DocSummary = {
  id: string;
  title?: string | null;
};

export type ShareResponse = {
  url: string;
};

export type SharedDocResponse = {
  doc_id: string;
  title?: string | null;
  content: string;
};

export type SearchHit = {
  path: string;
  snippet?: string | null;
};

export type SearchResponse = {
  results: SearchHit[];
};

export type WebSearchHit = {
  title: string;
  url: string;
  snippet?: string | null;
  source: string;
};

export type WebSearchResponse = {
  query: string;
  results: WebSearchHit[];
};

export type Comment = {
  id: string;
  doc_id: string;
  body: string;
  path?: string | null;
  selection_start?: number | null;
  selection_end?: number | null;
  created_at: string;
};

export type LogEntry = {
  id: string;
  doc_id: string;
  body: string;
  created_at: string;
};

export type Presence = {
  id: string;
  doc_id: string;
  user_id: string;
  display_name: string;
  last_seen: string;
};

export type Revision = {
  id: string;
  doc_id: string;
  created_at: string;
};

export type CompletionRequest = {
  modelConfig: ModelConfig;
  context?: string;
  sourceLatex?: string;
  maxContextChars?: number;
  maxContextTokens?: number;
  prompt: string;
  options?: { maxTokens?: number; timeoutS?: number };
};

export type CompletionResponse = { text: string; metadata: Record<string, unknown> };

export type LatexValidateResponse = { ok: boolean; errors: string[] };

export type LatexExtractImageResponse = { latex: string; metadata?: Record<string, unknown> };

export type ContextBuildResponse = {
  context: string;
  metadata: Record<string, unknown>;
};

export type LocalModel = {
  id: string;
  runtime: string;
  fileName: string;
  sha256: string | null;
  sourceUrl: string | null;
  settings: Record<string, unknown>;
};

export type OllamaStatus = {
  ok: boolean;
  baseUrl: string;
  models: string[];
};
