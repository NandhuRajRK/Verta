import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import "./app.css";
import {
  compileLatex,
  completion,
  createDoc,
  extractLatexFromImage,
  getDoc,
  getDocModels,
  listDocs,
  shareDoc,
  getSharedDoc,
  searchDoc,
  listComments,
  addComment,
  listLogs,
  addLog,
  listRevisions,
  restoreRevision,
  heartbeatPresence,
  listPresence,
  register,
  login,
  logout,
  me,
  listLocalModels,
  putDocModels,
  updateDoc,
  verifyLocalModel,
  downloadLocalModel,
  deleteLocalModel,
  upsertLocalModel,
  connectZotero,
  getOllamaStatus,
  webSearch,
} from "./api/client";
import type { ModelConfig } from "./api/types";
import { CodeEditor } from "./components/CodeEditor";
import { Button, Dialog, Heading, IconButton, Menu, MenuItem, MenuTrigger, Modal, ModalOverlay, Popover, Tab, TabList, Tabs, TextField, Input } from "./components/Aria";

const DEFAULT_MODEL: ModelConfig = { type: "local", provider: "ollama", id: "llama3", settings: {} };

function SvgIcon({
  children,
  title,
  size = 16,
}: {
  children: ReactNode;
  title: string;
  size?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      focusable="false"
      role="img"
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function IconRefresh() {
  return (
    <SvgIcon title="Refresh">
      <path
        fill="currentColor"
        d="M12 6V3L8 7l4 4V8c2.76 0 5 2.24 5 5a5 5 0 0 1-9.9 1h-2.02A7 7 0 0 0 19 13c0-3.87-3.13-7-7-7Z"
      />
    </SvgIcon>
  );
}

function IconDownload() {
  return (
    <SvgIcon title="Download">
      <path
        fill="currentColor"
        d="M5 20h14v-2H5v2Zm7-18v10.17l3.59-3.58L17 10l-5 5-5-5 1.41-1.41L11 12.17V2h1Z"
      />
    </SvgIcon>
  );
}

function IconMore() {
  return (
    <SvgIcon title="More">
      <path
        fill="currentColor"
        d="M5 10a2 2 0 1 1 0 4a2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4a2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4a2 2 0 0 1 0-4Z"
      />
    </SvgIcon>
  );
}

function IconImage() {
  return (
    <SvgIcon title="Image">
      <path
        fill="currentColor"
        d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 11.5A2.5 2.5 0 1 0 8.5 6a2.5 2.5 0 0 0 0 5.5ZM5 19l4.5-6l3.5 4.5l2.5-3L19 19H5Z"
      />
    </SvgIcon>
  );
}

function IconPin() {
  return (
    <SvgIcon title="Pin">
      <path
        fill="currentColor"
        d="M14 2l-1 7 4 4v2h-5v7l-2-2v-5H5v-2l4-4-1-7h6Z"
      />
    </SvgIcon>
  );
}

function IconTrash() {
  return (
    <SvgIcon title="Clear">
      <path
        fill="currentColor"
        d="M6 7h12l-1 14H7L6 7Zm3-4h6l1 2H8l1-2Z"
      />
    </SvgIcon>
  );
}

function IconChevronLeft() {
  return (
    <SvgIcon title="Previous">
      <path fill="currentColor" d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </SvgIcon>
  );
}

function IconChevronRight() {
  return (
    <SvgIcon title="Next">
      <path fill="currentColor" d="m8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12z" />
    </SvgIcon>
  );
}

function IconUndo() {
  return (
    <SvgIcon title="Back">
      <path
        fill="currentColor"
        d="M12.5 8H8.83l1.58-1.59L9 5 5 9l4 4 1.41-1.41L8.83 10H12.5A5.5 5.5 0 1 1 7 15.5H5A7.5 7.5 0 1 0 12.5 8Z"
      />
    </SvgIcon>
  );
}

function IconRedo() {
  return (
    <SvgIcon title="Forward">
      <path
        fill="currentColor"
        d="M11.5 8h3.67l-1.58-1.59L15 5l4 4-4 4-1.41-1.41L15.17 10H11.5A5.5 5.5 0 1 0 17 15.5h2A7.5 7.5 0 1 1 11.5 8Z"
      />
    </SvgIcon>
  );
}

function IconSettings() {
  return (
    <SvgIcon title="Settings">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.06 7.06 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
      />
    </SvgIcon>
  );
}

function IconCollapse() {
  return (
    <SvgIcon title="Sidebar">
      <path
        fill="currentColor"
        d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm2 2v10h4V7H6Zm6 0v10h8V7h-8Z"
      />
    </SvgIcon>
  );
}

function IconSearch() {
  return (
    <SvgIcon title="Search">
      <path
        fill="currentColor"
        d="M10 4a6 6 0 1 0 3.87 10.54l4.3 4.3 1.41-1.41-4.3-4.3A6 6 0 0 0 10 4Zm0 2a4 4 0 1 1 0 8a4 4 0 0 1 0-8Z"
      />
    </SvgIcon>
  );
}

function IconPlus() {
  return (
    <SvgIcon title="Add">
      <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
    </SvgIcon>
  );
}

function IconFolder() {
  return (
    <SvgIcon title="Folder">
      <path
        fill="currentColor"
        d="M4 5h5l2 2h9a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
      />
    </SvgIcon>
  );
}

function IconEdit() {
  return (
    <SvgIcon title="Edit">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 2.33H5v-.92l9.06-9.06.92.92-9.06 9.06ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.62 1.62 3.75 3.75 1.62-1.62Z"
      />
    </SvgIcon>
  );
}

function IconGrid() {
  return (
    <SvgIcon title="Tools">
      <path
        fill="currentColor"
        d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z"
      />
    </SvgIcon>
  );
}

function IconChevronDown() {
  return (
    <SvgIcon title="Expand">
      <path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41Z" />
    </SvgIcon>
  );
}

type WorkspaceEntry =
  | { type: "file"; content: string }
  | { type: "folder" };

type Workspace = { active: string | null; entries: Record<string, WorkspaceEntry> };

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };
type ProposedChange = { file: string; note: string; added: number; removed: number };
type ChatThread = {
  id: string;
  title: string;
  file: string | null;
  draft: string;
  messages: ChatMessage[];
  lastSuggestion: string | null;
  proposedFile?: string | null;
  proposedPatch?: string | null;
  proposedText?: string | null;
  proposedOpen: boolean;
  proposed: ProposedChange[];
};

function emptyWorkspace(): Workspace {
  return { active: null, entries: {} };
}

function fileEntry(content: string): WorkspaceEntry {
  return { type: "file", content };
}

function folderEntry(): WorkspaceEntry {
  return { type: "folder" };
}

function serializeWorkspace(ws: Workspace): string {
  return JSON.stringify(ws);
}

function tryParseWorkspace(s: string): Workspace | null {
  try {
    const v = JSON.parse(s);
    if (!v || typeof v !== "object") return null;
    if (typeof v.active !== "string" && v.active !== null) return null;
    // New shape
    if (v.entries && typeof v.entries === "object") {
      return v as Workspace;
    }
    // Old shape migration: { files: { [name]: {name, content } } }
    if (v.files && typeof v.files === "object") {
      const ws: Workspace = { active: v.active, entries: {} };
      for (const [name, file] of Object.entries(v.files)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const f: any = file;
        ws.entries[name] = fileEntry(String(f?.content ?? ""));
      }
      return ws;
    }
    return null;
  } catch {
    return null;
  }
}

export default function App() {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const previewContainerRef = useRef<HTMLElement | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);

  const [docId, setDocId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [showAssistant, setShowAssistant] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<string[] | null>(null);
  const [projectMenuDocs, setProjectMenuDocs] = useState<{ id: string; title?: string | null }[]>([]);
  const [comments, setComments] = useState<{ id: string; doc_id: string; body: string; created_at: string; path?: string | null; selection_start?: number | null; selection_end?: number | null }[]>([]);
  const [logs, setLogs] = useState<{ id: string; doc_id: string; body: string; created_at: string }[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUser, setAuthUser] = useState<{ id: string; username: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authForm, setAuthForm] = useState({ username: "", password: "" });
  const [presenceUsers, setPresenceUsers] = useState<{ id: string; display_name: string }[]>([]);
  const [publicDoc, setPublicDoc] = useState<{ title?: string | null; content: string } | null>(null);
  const [sharedPreviewUrl, setSharedPreviewUrl] = useState<string | null>(null);
  const [sharedCompiling, setSharedCompiling] = useState(false);
  const [revisions, setRevisions] = useState<{ id: string; doc_id: string; created_at: string }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"files" | "chats">("files");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"editor" | "pdf" | "files" | "integrations">("editor");
  const [ignoreInput, setIgnoreInput] = useState("");
  const [ignorePatterns, setIgnorePatterns] = useState<string[]>([
    "*.aux",
    "*.log",
    "*.toc",
    "*.out",
    "*.fls",
    "*.fdb_latexmk",
    "*.synctex.gz",
    "*.gz",
    "*.dvi",
    "*.lof",
    "*.lot",
    "*.bit",
    "*.idx",
    "*.glo",
    "*.bbl",
    "*.blg",
    "*.ilg",
    "*.ind",
    "*.glg",
    "*.gls",
    "*.acr",
    "*.alg",
    "*.xdy",
    "*.xdv",
    "*.bak",
    "*.sav",
    "*.tmp",
    "*~",
    "*.swp",
    "*.swo",
    "*.snm",
    "*.nav",
    "*.vrb",
    "*.bcf",
    "*.run.xml",
    "*.spl",
    ".git",
    ".DS_Store",
    ".gitignore",
    "node_modules",
    ".next",
  ]);
  const [localModels, setLocalModels] = useState<Array<{ id: string; runtime: string; fileName: string }>>([]);
  const [localModelsStatus, setLocalModelsStatus] = useState<string | null>(null);
  const [modelsSaveStatus, setModelsSaveStatus] = useState<string | null>(null);
  const [sidebarStatus, setSidebarStatus] = useState<string | null>(null);
  const [newLocalModel, setNewLocalModel] = useState({ id: "", runtime: "llamacpp", fileName: "", sha256: "", sourceUrl: "" });
  const [ollamaStatus, setOllamaStatus] = useState<string | null>(null);
  const [ollamaUrl, setOllamaUrl] = useState("");
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [editorSettings, setEditorSettings] = useState({
    autoFormatting: true,
    realtimeCompile: true,
    vimMode: false,
    disableWordWrap: false,
    disableStickyScroll: false,
  });
  const [pdfSettings, setPdfSettings] = useState({
    darkMode: false,
    zoomShortcuts: true,
  });
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  const [assistantCollapsed, setAssistantCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [pinToBottom, setPinToBottom] = useState(true);
  const [rightPaneMode, setRightPaneMode] = useState<"preview" | "tools">("preview");
  const [toolsTab, setToolsTab] = useState<"project" | "comments" | "logs">("project");
  const [previewCompiling, setPreviewCompiling] = useState(false);

  const splitterPx = 6;
  const minSidebarPx = 240;
  const maxSidebarPx = 520;
  const minPanePx = 280;

  const [sidebarWidthPx, setSidebarWidthPx] = useState(320);
  const [editorWidthPx, setEditorWidthPx] = useState(640);
  const [assistantWidthPx, setAssistantWidthPx] = useState(420);
  const [rightWidthPx, setRightWidthPx] = useState(520);

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  function startSidebarResize(e: ReactPointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidthPx;
    const onMove = (ev: PointerEvent) => {
      const next = clamp(startW + (ev.clientX - startX), minSidebarPx, maxSidebarPx);
      setSidebarWidthPx(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function startLayoutResize(e: ReactPointerEvent, which: "editor-assistant" | "assistant-right") {
    e.preventDefault();
    const startX = e.clientX;
    const startEditor = editorWidthPx;
    const startAssistant = assistantWidthPx;
    const startRight = rightWidthPx;

    const host = layoutRef.current;
    const hostW = host ? host.getBoundingClientRect().width : startEditor + startAssistant + startRight + splitterPx * 2;
    const usable = Math.max(minPanePx * 3, hostW - splitterPx * 2);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (which === "editor-assistant") {
        const editor = clamp(startEditor + dx, minPanePx, usable - minPanePx - minPanePx);
        const assistant = clamp(startAssistant - dx, minPanePx, usable - editor - minPanePx);
        const right = clamp(usable - editor - assistant, minPanePx, usable);
        setEditorWidthPx(editor);
        setAssistantWidthPx(assistant);
        setRightWidthPx(right);
      } else {
        const assistant = clamp(startAssistant + dx, minPanePx, usable - minPanePx - minPanePx);
        const right = clamp(startRight - dx, minPanePx, usable - startEditor - minPanePx);
        const editor = clamp(usable - assistant - right, minPanePx, usable);
        setEditorWidthPx(editor);
        setAssistantWidthPx(assistant);
        setRightWidthPx(right);
      }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1200px)");
    let autoCollapsed = false;
    const apply = () => {
      if (mql.matches) {
        autoCollapsed = true;
        setAssistantCollapsed(true);
        setPreviewCollapsed(true);
      } else if (autoCollapsed) {
        autoCollapsed = false;
        setAssistantCollapsed(false);
        setPreviewCollapsed(false);
      }
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("paneVisibility");
    if (!saved) return;
    try {
      const v = JSON.parse(saved);
      if (typeof v.showEditor === "boolean") setShowEditor(v.showEditor);
      if (typeof v.showAssistant === "boolean") setShowAssistant(v.showAssistant);
      if (typeof v.showPreview === "boolean") setShowPreview(v.showPreview);
      if (typeof v.sidebarCollapsed === "boolean") setSidebarCollapsed(v.sidebarCollapsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "paneVisibility",
      JSON.stringify({ showEditor, showAssistant, showPreview, sidebarCollapsed }),
    );
  }, [showEditor, showAssistant, showPreview, sidebarCollapsed]);

  useEffect(() => {
    const saved = localStorage.getItem("editorSettings");
    if (!saved) return;
    try {
      const next = JSON.parse(saved);
      setEditorSettings((prev) => ({ ...prev, ...next }));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("editorSettings", JSON.stringify(editorSettings));
  }, [editorSettings]);

  useEffect(() => {
    const saved = localStorage.getItem("pdfSettings");
    if (!saved) return;
    try {
      const next = JSON.parse(saved);
      setPdfSettings((prev) => ({ ...prev, ...next }));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("pdfSettings", JSON.stringify(pdfSettings));
  }, [pdfSettings]);

  const [workspace, setWorkspace] = useState<Workspace>(() => emptyWorkspace());

  const [isNewFileOpen, setIsNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newEntryKind, setNewEntryKind] = useState<"file" | "folder">("file");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ chapters: true });

  const assistantThreadId = "assistant";
  const [activeThreadId, setActiveThreadId] = useState<string>(assistantThreadId);
  const [threads, setThreads] = useState<Record<string, ChatThread>>(() => {
    const byId: Record<string, ChatThread> = {};
    byId[assistantThreadId] = {
      id: assistantThreadId,
      title: "Assistant",
      file: null,
      draft: "",
      messages: [],
      lastSuggestion: null,
      proposedFile: null,
      proposedPatch: null,
      proposedText: null,
      proposedOpen: true,
      proposed: [],
    };
    return byId;
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [pdfZoom, setPdfZoom] = useState(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "custom">("fit");
  const [pdfRendererAvailable, setPdfRendererAvailable] = useState(true);
  const [pageHistory, setPageHistory] = useState<number[]>([1]);
  const [pageHistoryIndex, setPageHistoryIndex] = useState(0);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfBaseWidthRef = useRef<number | null>(null);
  const formatTimerRef = useRef<number | null>(null);
  const compileTimerRef = useRef<number | null>(null);
  const settingsSaveTimerRef = useRef<number | null>(null);

  const [models, setModels] = useState<ModelConfig[]>(() => []);
  const [selectedModelId, setSelectedModelId] = useState(() => "");
  const selectedModel = useMemo(
    () => {
      if (!models.length) return null;
      return models.find((m) => m.id === selectedModelId) ?? models[0];
    },
    [models, selectedModelId],
  );

  const activeThread = threads[activeThreadId] ?? threads[assistantThreadId];
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadDirInputRef = useRef<HTMLInputElement | null>(null);
  const uploadBaseRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const queuedWorkspaceRef = useRef<Workspace | null>(null);

  function queueSave(next: Workspace) {
    queuedWorkspaceRef.current = next;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      if (!queuedWorkspaceRef.current) return;
      await saveWorkspace(queuedWorkspaceRef.current);
    }, 600);
  }

  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  function updateThread(id: string, updater: (t: ChatThread) => ChatThread) {
    setThreads((prev) => {
      const t = prev[id];
      if (!t) return prev;
      return { ...prev, [id]: updater(t) };
    });
  }

  function extractJsonBlock(text: string): string | null {
    const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) return fenceMatch[1].trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1).trim();
  }

  function parseStructuredPatch(text: string): { file: string; patch: string; message?: string } | null {
    const candidates = [text, extractJsonBlock(text)].filter(Boolean) as string[];
    for (const candidate of candidates) {
      try {
        const raw = JSON.parse(candidate);
        if (raw && typeof raw.file === "string" && typeof raw.patch === "string") {
          return { file: raw.file, patch: raw.patch, message: raw.message };
        }
      } catch {}
    }
    return null;
  }

  function applyUnifiedDiff(original: string, patch: string): { text: string; added: number; removed: number } {
    const origLines = original.split("\n");
    const patchLines = patch.split("\n");
    let output: string[] = [];
    let index = 0;
    let added = 0;
    let removed = 0;

    let i = 0;
    while (i < patchLines.length) {
      const line = patchLines[i];
      if (line.startsWith("---") || line.startsWith("+++")) {
        i += 1;
        continue;
      }
      if (!line.startsWith("@@")) {
        i += 1;
        continue;
      }
      const match = /@@\s-\d+(?:,\d+)?\s\+(\d+)(?:,\d+)?\s@@/.exec(line);
      if (!match) {
        i += 1;
        continue;
      }
      const targetStart = Math.max(0, Number.parseInt(match[1], 10) - 1);
      if (targetStart > index) {
        output = output.concat(origLines.slice(index, targetStart));
        index = targetStart;
      }
      i += 1;
      while (i < patchLines.length && !patchLines[i].startsWith("@@")) {
        const hunkLine = patchLines[i];
        if (hunkLine.startsWith(" ")) {
          output.push(origLines[index] ?? hunkLine.slice(1));
          index += 1;
        } else if (hunkLine.startsWith("-")) {
          removed += 1;
          index += 1;
        } else if (hunkLine.startsWith("+")) {
          added += 1;
          output.push(hunkLine.slice(1));
        } else if (hunkLine.startsWith("\\")) {
          // no newline marker, ignore
        }
        i += 1;
      }
    }
    output = output.concat(origLines.slice(index));
    return { text: output.join("\n"), added, removed };
  }

  function resetNewChat() {
    setThreads((prev) => ({
      ...prev,
      [assistantThreadId]: {
        ...prev[assistantThreadId],
        draft: "",
        messages: [],
        lastSuggestion: null,
        proposed: [],
        proposedOpen: true,
      },
    }));
    setActiveThreadId(assistantThreadId);
  }

  useEffect(() => {
    if (!pinToBottom) return;
    if (assistantCollapsed) return;
    const el = chatMessagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [pinToBottom, assistantCollapsed, activeThreadId, activeThread.messages.length]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    void (async () => {
      try {
        const user = await me();
        setAuthUser(user);
      } catch {
        localStorage.removeItem("authToken");
      }
    })();
  }, []);

  useEffect(() => {
    if (!docId || !authUser) return;
    const ping = async () => {
      await heartbeatPresence(docId, authUser.id, authUser.username);
      const list = await listPresence(docId);
      setPresenceUsers(list.map((u) => ({ id: u.user_id, display_name: u.display_name })));
    };
    void ping();
    const id = window.setInterval(() => void ping(), 10000);
    return () => window.clearInterval(id);
  }, [docId, authUser]);

  useEffect(() => {
    const token = window.location.pathname.startsWith("/share/")
      ? window.location.pathname.split("/share/")[1]
      : null;
    if (!token) return;
    void (async () => {
      const shared = await getSharedDoc(token);
      setPublicDoc({ title: shared.title, content: shared.content });
    })();
  }, []);

  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await searchDoc(docId, search.trim());
        if (cancelled) return;
        setSearchResults(res.results.map((r) => r.path));
      } catch {
        if (!cancelled) setSearchResults(null);
        notify("Search failed");
      }
    };
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }
    const id = window.setTimeout(() => void load(), 250);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [search, docId]);

  useEffect(() => {
    void (async () => {
      try {
        const docs = await listDocs();
        if (!docs.length) return;
        const first = docs[0];
        const loaded = await getDoc(first.id);
        const ws = tryParseWorkspace(loaded.content);
        if (ws) {
          setWorkspace(ws);
          setDocId(first.id);
        }
        try {
          const env = await getDocModels(first.id);
          setModels(env.models.length ? env.models : []);
          setSelectedModelId(env.models[0]?.id ?? "");
        } catch {}
        const settings = loaded.settings ?? {};
        if (settings.editorSettings && typeof settings.editorSettings === "object") {
          setEditorSettings((prev) => ({ ...prev, ...(settings.editorSettings as object) }));
        }
        if (settings.pdfSettings && typeof settings.pdfSettings === "object") {
          setPdfSettings((prev) => ({ ...prev, ...(settings.pdfSettings as object) }));
        }
        if (typeof (settings as any).webSearchEnabled === "boolean") {
          setWebSearchEnabled(Boolean((settings as any).webSearchEnabled));
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!docId) return;
    if (settingsSaveTimerRef.current) window.clearTimeout(settingsSaveTimerRef.current);
    settingsSaveTimerRef.current = window.setTimeout(async () => {
      try {
        await updateDoc(docId, {
          title: "workspace",
          content: serializeWorkspace(workspace),
          settings: { editorSettings, pdfSettings, webSearchEnabled },
        });
      } catch {}
    }, 600);
  }, [docId, editorSettings, pdfSettings, webSearchEnabled, workspace]);

  useEffect(() => {
    if (rightPaneMode !== "tools" || !docId) return;
    const load = async () => {
      if (toolsTab === "comments") {
        const rows = await listComments(docId);
        setComments(rows);
      }
      if (toolsTab === "logs") {
        const rows = await listLogs(docId);
        setLogs(rows);
      }
      if (toolsTab === "project") {
        const rows = await listRevisions(docId);
        setRevisions(rows);
      }
    };
    void load();
  }, [rightPaneMode, toolsTab, docId]);



  const activeEntry = workspace.active ? workspace.entries[workspace.active] : null;
  const activeFile =
    workspace.active && activeEntry?.type === "file" ? { name: workspace.active, content: activeEntry.content } : null;

  useEffect(() => {
    if (!editorSettings.realtimeCompile || !activeFile) return;
    if (compileTimerRef.current) window.clearTimeout(compileTimerRef.current);
    compileTimerRef.current = window.setTimeout(() => {
      void onCompilePreview();
    }, 1200);
    return () => {
      if (compileTimerRef.current) window.clearTimeout(compileTimerRef.current);
    };
  }, [editorSettings.realtimeCompile, activeFile?.content]);

  useEffect(() => {
    if (!pdfSettings.zoomShortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "0") {
        e.preventDefault();
        setZoomToFit();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomBy(0.1);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomBy(-0.1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pdfSettings.zoomShortcuts]);

  const entryKeys = Object.keys(workspace.entries).sort();
  function matchesIgnore(name: string, pattern: string): boolean {
    if (!pattern) return false;
    if (pattern === name) return true;
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    const re = new RegExp(`^${escaped}$`, "i");
    return re.test(name);
  }

  function shouldIgnorePath(path: string): boolean {
    const parts = path.split("/");
    for (const pat of ignorePatterns) {
      if (!pat) continue;
      if (parts.some((p) => matchesIgnore(p, pat))) return true;
      const file = parts[parts.length - 1];
      if (matchesIgnore(file, pat)) return true;
      if (pat.startsWith("*.") && file.toLowerCase().endsWith(pat.slice(1).toLowerCase())) return true;
    }
    return false;
  }

  const filteredEntryKeys = entryKeys.filter((n) => {
    if (shouldIgnorePath(n)) return false;
    if (showSearch && search.trim()) {
      if (searchResults) return searchResults.includes(n);
      return n.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const orderedThreadIds = useMemo(() => [assistantThreadId], [assistantThreadId]);

  function setActive(name: string) {
    setWorkspace((prev) => ({ ...prev, active: name }));
  }

  function updateActiveContent(next: string) {
    let nextWorkspace: Workspace | null = null;
    setWorkspace((prev) => {
      if (!prev.active) return prev;
      const cur = prev.entries[prev.active];
      if (!cur || cur.type !== "file") return prev;
      nextWorkspace = {
        ...prev,
        entries: {
          ...prev.entries,
          [prev.active]: fileEntry(next),
        },
      };
      return nextWorkspace;
    });
    if (nextWorkspace) queueSave(nextWorkspace);
  }

  function formatLatex(input: string): string {
    const trimmed = input
      .split("\n")
      .map((line) => line.replace(/[ \t]+$/g, ""))
      .join("\n");
    return trimmed.replace(/\n{3,}/g, "\n\n");
  }

  function scheduleAutoFormat() {
    if (formatTimerRef.current) window.clearTimeout(formatTimerRef.current);
    formatTimerRef.current = window.setTimeout(() => {
      setWorkspace((prev) => {
        if (!prev.active) return prev;
        const entry = prev.entries[prev.active];
        if (!entry || entry.type !== "file") return prev;
        const formatted = formatLatex(entry.content);
        if (formatted === entry.content) return prev;
        const next = {
          ...prev,
          entries: { ...prev.entries, [prev.active]: fileEntry(formatted) },
        };
        queueSave(next);
        return next;
      });
    }, 500);
  }

  function onEditorChange(next: string) {
    updateActiveContent(next);
    if (editorSettings.autoFormatting) scheduleAutoFormat();
  }

  async function toggleVimMode() {
    if (editorSettings.vimMode) {
      setEditorSettings((s) => ({ ...s, vimMode: false }));
      return;
    }
    try {
      const modPath = "monaco-vim";
      await import(/* @vite-ignore */ modPath);
      setEditorSettings((s) => ({ ...s, vimMode: true }));
    } catch {
      notify("Vim mode requires monaco-vim to be installed");
    }
  }

  async function onCreateDoc(): Promise<string> {
    const created = await createDoc({
      title: "workspace",
      content: serializeWorkspace(workspace),
      settings: { editorSettings, pdfSettings, webSearchEnabled },
    });
    setDocId(created.id);
    const env = await getDocModels(created.id);
    setModels(env.models.length ? env.models : []);
    setSelectedModelId(env.models[0]?.id ?? "");
    return created.id;
  }

  async function ensureDocId(): Promise<string> {
    if (docId) return docId;
    return await onCreateDoc();
  }

  async function saveWorkspace(next: Workspace) {
    const id = await ensureDocId();
    await updateDoc(id, {
      title: "workspace",
      content: serializeWorkspace(next),
      settings: { editorSettings, pdfSettings, webSearchEnabled },
    });
  }

  async function onSaveDoc() {
    await saveWorkspace(workspace);
  }

  async function onLoadDoc() {
    const id = await ensureDocId();
    const loaded = await getDoc(id);
    const ws = tryParseWorkspace(loaded.content);
    if (ws) setWorkspace(ws);
    const settings = loaded.settings ?? {};
    if (settings.editorSettings && typeof settings.editorSettings === "object") {
      setEditorSettings((prev) => ({ ...prev, ...(settings.editorSettings as object) }));
    }
    if (settings.pdfSettings && typeof settings.pdfSettings === "object") {
      setPdfSettings((prev) => ({ ...prev, ...(settings.pdfSettings as object) }));
    }
    if (typeof (settings as any).webSearchEnabled === "boolean") {
      setWebSearchEnabled(Boolean((settings as any).webSearchEnabled));
    }
  }

  async function onSuggest() {
    if (!activeFile) return;
    const model = selectedModel;
    if (!model) {
      notify("Select a model to continue");
      return;
    }
    const prompt = (activeThread?.draft ?? "").trim();
    if (!prompt) return;
    await ensureDocId();
    const userMsg = { id: crypto.randomUUID(), role: "user" as const, text: prompt };
    updateThread(activeThreadId, (t) => ({ ...t, messages: [...t.messages, userMsg], draft: "" }));

    const fileList = filteredEntryKeys.length ? filteredEntryKeys.join(", ") : "";
    let webContext = "";
    if (webSearchEnabled && prompt) {
      try {
        const res = await webSearch(prompt, 5);
        if (res.results?.length) {
          webContext =
            "WEB SEARCH RESULTS:\n" +
            res.results
              .map((r, i) => `${i + 1}. ${r.title} (${r.url})${r.snippet ? ` — ${r.snippet}` : ""}`)
              .join("\n");
        }
      } catch (err) {
        notify(err instanceof Error ? err.message : "Web search failed");
      }
    }
    const systemPrompt = [
      "You are editing a LaTeX/Markdown project.",
      "Choose the target file based on the request and file list.",
      "Return ONLY valid JSON with keys: file, patch, message.",
      "patch must be a unified diff against the target file.",
      "If you need to create a new file, set file to the new path and make the patch against an empty file.",
      "Use LaTeX for .tex/.bib and Markdown for .md based on the file extension.",
      fileList ? `FILES: ${fileList}` : "",
      webContext,
    ]
      .filter(Boolean)
      .join("\n");

    const resp = await completion({
      modelConfig: model,
      sourceLatex: activeFile.content,
      prompt: `${systemPrompt}\n\nUSER:\n${prompt}`,
      options: { maxTokens: 4096, timeoutS: 120.0 },
    });
    const parsed = parseStructuredPatch(resp.text);
    const assistantText = parsed?.message ?? (parsed?.file ? `Proposed changes ready for ${parsed.file}.` : "");
    const assistantMsg = {
      id: crypto.randomUUID(),
      role: "assistant" as const,
      text: assistantText || "Model response could not be parsed into a patch.",
    };
    updateThread(activeThreadId, (t) => ({ ...t, messages: [...t.messages, assistantMsg], lastSuggestion: assistantText }));
    if (!parsed) {
      updateThread(activeThreadId, (t) => ({
        ...t,
        proposed: [],
        proposedFile: null,
        proposedPatch: null,
        proposedText: "Model did not return a valid patch.",
      }));
      return;
    }
    const target = parsed.file;
    const entry = workspace.entries[target];
    const baseContent = entry && entry.type === "file" ? entry.content : "";
    const isNewFile = !entry || entry.type !== "file";
    const result = applyUnifiedDiff(baseContent, parsed.patch);
    updateThread(activeThreadId, (t) => ({
      ...t,
      proposedFile: target,
      proposedPatch: parsed.patch,
      proposedText: parsed.message ?? (isNewFile ? "Create new file." : ""),
      proposed: [
        {
          file: target,
          note: parsed.message ?? (prompt.slice(0, 40) || "Edit"),
          added: result.added,
          removed: result.removed,
        },
      ],
    }));
  }

  async function onExtractLatexFromImage(file: File) {
    try {
      const resp = await extractLatexFromImage(file);
      const latex = resp.latex ?? "";
      const assistantMsg = { id: crypto.randomUUID(), role: "assistant" as const, text: latex };
      updateThread(activeThreadId, (t) => ({ ...t, messages: [...t.messages, assistantMsg] }));
      if (!activeFile) return;
      const next = activeFile.content ? `${activeFile.content}\n${latex}` : latex;
      updateActiveContent(next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to extract LaTeX from image";
      const assistantMsg = { id: crypto.randomUUID(), role: "assistant" as const, text: `Error: ${msg}` };
      updateThread(activeThreadId, (t) => ({ ...t, messages: [...t.messages, assistantMsg] }));
    }
  }

  async function onCompilePreview() {
    if (!activeFile) return;
    await ensureDocId();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    try {
      setPreviewCompiling(true);
      const blob = await compileLatex(activeFile.content);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPdfPage(1);
      setPdfPageCount(null);
      setPageHistory([1]);
      setPageHistoryIndex(0);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Compile failed");
    } finally {
      setPreviewCompiling(false);
    }
  }

  function onDownloadPreview() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = "preview.pdf";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function onOpenPreviewInNewWindow() {
    if (!previewUrl) return;
    const w = window.open(previewUrl, "_blank", "noopener,noreferrer");
    if (!w) notify("Pop-up blocked");
  }

  async function onFullscreenPreview() {
    const el = previewContainerRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn = (el as any)?.requestFullscreen as (() => Promise<void>) | undefined;
    if (fn) await fn.call(el);
  }

  function setZoomToFit() {
    const baseWidth = pdfBaseWidthRef.current;
    const stage = previewStageRef.current;
    if (!baseWidth || !stage) {
      setPdfZoom(1);
      setZoomMode("fit");
      return;
    }
    const available = Math.max(240, stage.getBoundingClientRect().width - 32);
    const scale = Math.max(0.2, available / baseWidth);
    setPdfZoom(scale);
    setZoomMode("fit");
  }

  function zoomBy(delta: number) {
    setZoomMode("custom");
    setPdfZoom((z) => Math.max(0.2, Math.min(4, z + delta)));
  }

  function setZoomPercent(value: number) {
    setZoomMode("custom");
    setPdfZoom(Math.max(0.2, Math.min(4, value)));
  }

  function goToPage(next: number, pushHistory = true) {
    if (!pdfPageCount) return;
    const clamped = Math.min(Math.max(next, 1), pdfPageCount);
    setPdfPage(clamped);
    if (pushHistory) {
      const nextHist = pageHistory.slice(0, pageHistoryIndex + 1).concat([clamped]);
      setPageHistory(nextHist);
      setPageHistoryIndex(nextHist.length - 1);
    }
  }

  function undoPage() {
    if (pageHistoryIndex <= 0) return;
    const nextIndex = pageHistoryIndex - 1;
    setPageHistoryIndex(nextIndex);
    setPdfPage(pageHistory[nextIndex]);
  }

  function redoPage() {
    if (pageHistoryIndex >= pageHistory.length - 1) return;
    const nextIndex = pageHistoryIndex + 1;
    setPageHistoryIndex(nextIndex);
    setPdfPage(pageHistory[nextIndex]);
  }

  useEffect(() => {
    if (!previewUrl || !pdfRendererAvailable) return;
    let cancelled = false;
    void (async () => {
      try {
        const pdfjsPath = "pdfjs-dist";
        const pdfjs = await import(/* @vite-ignore */ pdfjsPath);
        const pdfjsLib: any = pdfjs;
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.js",
            import.meta.url,
          ).toString();
        }
        const task = pdfjsLib.getDocument(previewUrl);
        const doc = await task.promise;
        if (cancelled) return;
        const totalPages = doc.numPages;
        setPdfPageCount(totalPages);
        if (pdfPage > totalPages) {
          setPdfPage(totalPages);
          setPageHistory([totalPages]);
          setPageHistoryIndex(0);
        }
        const page = await doc.getPage(Math.min(pdfPage, totalPages));
        const baseViewport = page.getViewport({ scale: 1 });
        pdfBaseWidthRef.current = baseViewport.width;
        if (zoomMode === "fit") {
          setZoomToFit();
        }
        const viewport = page.getViewport({ scale: pdfZoom });
        const canvas = pdfCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        setPdfRendererAvailable(false);
        notify("PDF render failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [previewUrl, pdfPage, pdfZoom, zoomMode, pdfRendererAvailable]);

  async function onCreateFile() {
    const name = newFileName.trim();
    if (!name) return;
    if (newEntryKind === "folder") {
      const key = name.endsWith("/") ? name : `${name}/`;
      const next = {
        ...workspace,
        entries: { ...workspace.entries, [key]: folderEntry() },
      };
      setWorkspace(next);
      await saveWorkspace(next);
      await addLog(await ensureDocId(), `Created folder ${key}`);
      setIsNewFileOpen(false);
      setNewFileName("");
      setNewEntryKind("file");
      return;
    }
    const next = workspace.entries[name]
      ? { ...workspace, active: name }
      : {
          ...workspace,
          active: name,
          entries: { ...workspace.entries, [name]: fileEntry("") },
        };
    setWorkspace(next);
    await saveWorkspace(next);
    await addLog(await ensureDocId(), `Created ${newEntryKind === "folder" ? "folder" : "file"} ${name}`);
    await addLog(await ensureDocId(), "Uploaded files");
    setIsNewFileOpen(false);
    setNewFileName("");
    setNewEntryKind("file");
  }

  function openNewEntryModal(prefill: string, kind: "file" | "folder") {
    setNewEntryKind(kind);
    setNewFileName(prefill);
    setIsNewFileOpen(true);
  }

  async function handleFilesUpload(files: FileList, baseFolder?: string) {
    const updates: Record<string, WorkspaceEntry> = {};
    const folderPrefixes = new Set<string>();
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) {
        notify(`Skipped ${file.name} (max 5MB)`);
        continue;
      }
      const rel = (file as any).webkitRelativePath || file.name;
      const path = baseFolder ? `${baseFolder}${rel}` : rel;
      const content = await file.text();
      updates[path] = fileEntry(content);
      const parts = path.split("/").slice(0, -1);
      if (parts.length) {
        let acc = "";
        for (const part of parts) {
          acc = acc ? `${acc}/${part}` : part;
          folderPrefixes.add(`${acc}/`);
        }
      }
    }
    const nextEntries = { ...workspace.entries };
    for (const folder of folderPrefixes) {
      if (!nextEntries[folder]) nextEntries[folder] = folderEntry();
    }
    for (const [path, entry] of Object.entries(updates)) {
      nextEntries[path] = entry;
    }
    const next: Workspace = { ...workspace, entries: nextEntries };
    setWorkspace(next);
    await saveWorkspace(next);
    await addLog(await ensureDocId(), "Uploaded files");
  }

  function toggleFolder(folder: string) {
    setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  }

  function listFolderChildren(folder: string): string[] {
    const prefix = folder.endsWith("/") ? folder : `${folder}/`;
    return entryKeys.filter((k) => k.startsWith(prefix) && !k.endsWith("/"));
  }

  function listRootFiles(): string[] {
    return filteredEntryKeys.filter((k) => !k.includes("/") && !k.endsWith("/"));
  }

  function listRootFolders(): string[] {
    const folders = new Set<string>();
    for (const k of filteredEntryKeys) {
      if (k.endsWith("/")) folders.add(k.slice(0, -1));
      if (k.includes("/")) folders.add(k.split("/")[0]);
    }
    return Array.from(folders).sort();
  }

  if (publicDoc) {
    return (
      <div className="app">
        <div className="layout" style={{ padding: 24 }}>
          <section className="pane previewPane" aria-label="Shared Preview">
            <div className="paneHeader previewHeader">
              <div className="previewHeaderLeft">
                <div className="paneTitle">{publicDoc.title ?? "Shared Document"}</div>
              </div>
              <div className="previewHeaderRight">
                <Button
                  aria-label="Compile"
                  className="toolbarButton"
                  onPress={async () => {
                    if (sharedPreviewUrl) URL.revokeObjectURL(sharedPreviewUrl);
                    setSharedCompiling(true);
                    try {
                      const blob = await compileLatex(publicDoc.content);
                      setSharedPreviewUrl(URL.createObjectURL(blob));
                    } catch (err) {
                      notify(err instanceof Error ? err.message : "Compile failed");
                    } finally {
                      setSharedCompiling(false);
                    }
                  }}
                  isDisabled={sharedCompiling}
                  type="button"
                >
                  <span className={sharedCompiling ? "iconOnly spin" : "iconOnly"} aria-hidden="true">
                    <IconRefresh />
                  </span>
                  <span className="toolbarText">{sharedCompiling ? "Initializing…" : "Compile"}</span>
                </Button>
              </div>
            </div>
            <div className="previewStage">
              {sharedPreviewUrl ? (
                <iframe className="preview" title="Shared PDF Preview" src={sharedPreviewUrl} />
              ) : (
                <div className="previewPlaceholder muted">Shared content loaded. Compile to view.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <input
        ref={uploadFileInputRef}
        aria-label="Upload file"
        type="file"
        style={{ display: "none" }}
        onChange={async (e) => {
          const input = e.target as HTMLInputElement;
          const files = input.files;
          input.value = "";
          const base = uploadBaseRef.current ?? "";
          uploadBaseRef.current = null;
          if (!files || files.length === 0) return;
          await handleFilesUpload(files, base);
        }}
      />
      <input
        ref={uploadDirInputRef}
        aria-label="Upload directory"
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={async (e) => {
          const input = e.target as HTMLInputElement;
          const files = input.files;
          input.value = "";
          const base = uploadBaseRef.current ?? "";
          uploadBaseRef.current = null;
          if (!files || files.length === 0) return;
          await handleFilesUpload(files, base);
        }}
        // @ts-expect-error webkitdirectory support
        webkitdirectory="true"
      />
      <div
        className={sidebarCollapsed ? "appFrame sidebarCollapsed" : "appFrame"}
        ref={frameRef}
        style={{
          ["--sidebar-width" as any]: `${sidebarWidthPx}px`,
          ["--editor-col" as any]: showEditor ? `${editorWidthPx}px` : "0px",
          ["--assistant-col" as any]: showAssistant ? `${assistantWidthPx}px` : "0px",
          ["--right-col" as any]: showPreview ? `${rightWidthPx}px` : "0px",
        } as any}
      >
        {!sidebarCollapsed ? (
          <aside className="sidebar" aria-label="Sidebar">
            <div className="sidebarTop">
              <div className="sidebarIconRow">
                <Heading className="brand logo" aria-label="Verta">
                  V
                </Heading>
                <div className="sidebarIconSpacer" />
                <IconButton aria-label="Settings" onPress={() => setSettingsOpen(true)}>
                  <IconSettings />
                </IconButton>
              <MenuTrigger>
                <IconButton aria-label="View toggles">
                  <IconCollapse />
                </IconButton>
                <Popover className="popover">
                  <div className="toggleMenu">
                    <button
                      className="toggleRow"
                      onClick={() => setShowEditor((v) => !v)}
                      aria-pressed={showEditor}
                    >
                      <span>Code</span>
                      <span className={showEditor ? "toggleSwitch on" : "toggleSwitch"} />
                    </button>
                    <button
                      className="toggleRow"
                      onClick={() => setShowPreview((v) => !v)}
                      aria-pressed={showPreview}
                    >
                      <span>PDF</span>
                      <span className={showPreview ? "toggleSwitch on" : "toggleSwitch"} />
                    </button>
                    <button
                      className="toggleRow"
                      onClick={() => setSidebarCollapsed((v) => !v)}
                      aria-pressed={!sidebarCollapsed}
                    >
                      <span>Sidebar</span>
                      <span className={!sidebarCollapsed ? "toggleSwitch on" : "toggleSwitch"} />
                    </button>
                    <button
                      className="toggleRow"
                      onClick={() => setShowAssistant((v) => !v)}
                      aria-pressed={showAssistant}
                    >
                      <span>Assistant</span>
                      <span className={showAssistant ? "toggleSwitch on" : "toggleSwitch"} />
                    </button>
                  </div>
                </Popover>
              </MenuTrigger>
              </div>

              <div className="projectRow">
                  <MenuTrigger
                    onOpenChange={async (open) => {
                      if (!open) return;
                      const docs = await listDocs();
                      setProjectMenuDocs(docs);
                    }}
                  >
                    <Button className="projectButton" aria-label="Project selector">
                      <span>{docId ? `Project ${docId.slice(0, 4)}` : "New Project"}</span>
                      <span className="caret">
                        <IconChevronDown />
                      </span>
                    </Button>
                    <Popover className="popover">
                      <Menu aria-label="Projects" className="menu">
                        <MenuItem
                          onAction={async () => {
                            const id = await onCreateDoc();
                            setSidebarStatus(`Created ${id.slice(0, 6)}`);
                            setTimeout(() => setSidebarStatus(null), 2000);
                          }}
                        >
                          Create new project
                        </MenuItem>
                        {projectMenuDocs.map((doc) => (
                          <MenuItem
                            key={doc.id}
                            onAction={async () => {
                              const loaded = await getDoc(doc.id);
                              const ws = tryParseWorkspace(loaded.content);
                              if (ws) setWorkspace(ws);
                              setDocId(doc.id);
                            }}
                          >
                            {doc.title || doc.id}
                          </MenuItem>
                        ))}
                      </Menu>
                    </Popover>
                  </MenuTrigger>
                  <Button
                    aria-label="Share"
                    className="shareButton"
                    onPress={async () => {
                      try {
                        const id = await ensureDocId();
                        const resp = await shareDoc(id);
                        const full = `${window.location.origin}${resp.url}`;
                        try {
                          await navigator.clipboard.writeText(full);
                          setSidebarStatus("Share link copied");
                        } catch {
                          setSidebarStatus(`Share link: ${full}`);
                        }
                        setTimeout(() => setSidebarStatus(null), 2000);
                        await addLog(id, "Shared project");
                      } catch (err) {
                        notify(err instanceof Error ? err.message : "Share failed");
                      }
                    }}
                  >
                    Share
                  </Button>
              </div>

              <div className="tabsRow">
                <Tabs
                  selectedKey={activeSidebarTab}
                  onSelectionChange={(k) => setActiveSidebarTab(k as "files" | "chats")}
                >
                  <TabList aria-label="Sidebar tabs" className="tabList">
                    <Tab id="files" className="tab">
                      Files
                    </Tab>
                    <Tab id="chats" className="tab">
                      Chats
                    </Tab>
                  </TabList>
                </Tabs>
                <div className="sidebarIconSpacer" />
                <IconButton aria-label="Search" onPress={() => setShowSearch((v) => !v)}>
                  <IconSearch />
                </IconButton>
                <IconButton aria-label="Add" onPress={() => setIsNewFileOpen(true)}>
                  <IconPlus />
                </IconButton>
              </div>

              {showSearch ? (
                <div className="searchRow">
                  <TextField aria-label="File search" className="textField">
                      <Input
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                      />
                  </TextField>
                </div>
              ) : null}
            </div>

            <nav className="sidebarBody" aria-label="Files">
              {activeSidebarTab === "files" ? (
                <div className="fileList">
                  {listRootFolders().map((folder) => {
                    const open = !!expandedFolders[folder];
                    const children = listFolderChildren(folder);
                    return (
                      <div key={folder} className="folderBlock">
                        <div className="folderRow">
                          <Button
                            className="folderToggle"
                            aria-label={open ? `Collapse ${folder}` : `Expand ${folder}`}
                            onPress={() => toggleFolder(folder)}
                          >
                            {open ? "▾" : "▸"}
                          </Button>
                          <Button
                            className="folderName"
                            onPress={() => toggleFolder(folder)}
                            aria-label={`Folder ${folder}`}
                          >
                            <span className="folderIcon">
                              <IconFolder />
                            </span>
                            {folder}
                          </Button>
                          <MenuTrigger>
                            <Button className="folderPlus" aria-label={`Folder actions ${folder}`}>
                              <IconPlus />
                            </Button>
                            <Popover className="popover">
                              <Menu aria-label={`Actions for ${folder}`} className="menu">
                                <MenuItem onAction={() => openNewEntryModal(`${folder}/`, "file")}>Add file</MenuItem>
                                <MenuItem onAction={() => openNewEntryModal(`${folder}/`, "folder")}>Add folder</MenuItem>
                                <MenuItem
                                  onAction={() => {
                                    uploadBaseRef.current = `${folder}/`;
                                    uploadFileInputRef.current?.click();
                                  }}
                                >
                                  Upload file
                                </MenuItem>
                                <MenuItem
                                  onAction={() => {
                                    uploadBaseRef.current = `${folder}/`;
                                    uploadDirInputRef.current?.click();
                                  }}
                                >
                                  Upload directory
                                </MenuItem>
                                <MenuItem
                                  onAction={async () => {
                                    const resp = await connectZotero();
                                    setSidebarStatus(`Zotero ${resp.status}`);
                                    setTimeout(() => setSidebarStatus(null), 2000);
                                  }}
                                >
                                  Connect Zotero
                                </MenuItem>
                              </Menu>
                            </Popover>
                          </MenuTrigger>
                        </div>
                        {open ? (
                          <div className="folderChildren">
                            {children.map((path) => (
                              <Button
                                key={path}
                                className={path === workspace.active ? "fileItem active" : "fileItem"}
                                onPress={() => setActive(path)}
                              >
                                {path.split("/").slice(1).join("/")}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {listRootFiles().map((name) => (
                    <Button
                      key={name}
                      className={name === workspace.active ? "fileItem active" : "fileItem"}
                      onPress={() => setActive(name)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ padding: 12 }}>
                  No chats yet.
                </div>
              )}
            </nav>

            <div className="sidebarBottom">
              {sidebarStatus ? <div className="muted">{sidebarStatus}</div> : <div className="muted">&nbsp;</div>}
              <Button aria-label="User avatar" className="userAvatar" onPress={() => setAuthOpen(true)}>
                {authUser?.username?.[0]?.toLowerCase() ?? "n"}
              </Button>
            </div>
          </aside>
        ) : (
          <Button className="sidebarExpand" aria-label="Expand" onPress={() => setSidebarCollapsed(false)}>
            ⫸
          </Button>
        )}

        {!sidebarCollapsed ? (
          <div
            role="separator"
            aria-label="Resize sidebar"
            className="splitter splitterSidebar"
            onPointerDown={startSidebarResize}
          />
        ) : null}

        <div
          className="layout"
          ref={layoutRef}
          style={
            {
              ["--editor-col" as any]: `${editorWidthPx}px`,
              ["--assistant-col" as any]: `${assistantWidthPx}px`,
              ["--right-col" as any]: `${rightWidthPx}px`,
            } as any
          }
        >
          {showEditor ? (
          <section className="pane editorPane" aria-label="Editor">
            <div className="paneHeader editorHeader">
              <div className="editorHeaderLeft">
                <IconButton aria-label="New chat" className="newChatButton" onPress={resetNewChat}>
                  <IconEdit />
                </IconButton>
                <Tabs selectedKey={activeThreadId} onSelectionChange={(k) => setActiveThreadId(String(k))}>
                  <TabList aria-label="Chat tabs" className="chatTabList">
                    {orderedThreadIds.map((id) => (
                      <Tab key={id} id={id} className="chatTab">
                        {threads[id]?.title ?? id}
                      </Tab>
                    ))}
                  </TabList>
                </Tabs>
              </div>
              <div className="editorHeaderRight">
                <Button
                  className={rightPaneMode === "tools" ? "toolsButton active" : "toolsButton"}
                  aria-label="Tools"
                  onPress={() => setRightPaneMode((mode) => (mode === "tools" ? "preview" : "tools"))}
                >
                  <span>Tools</span>
                  <span className="toolsIcon">
                    <IconGrid />
                  </span>
                </Button>
              </div>
            </div>
          <CodeEditor
              key={`editor-${editorSettings.vimMode ? "vim" : "std"}`}
              ariaLabel="Editor"
              value={activeFile?.content ?? ""}
              onChange={onEditorChange}
              onSelectionChange={(start, end) => setSelectionRange({ start, end })}
              wordWrap={editorSettings.disableWordWrap ? "off" : "on"}
              stickyScroll={!editorSettings.disableStickyScroll}
              vimMode={editorSettings.vimMode}
              formatOnType={editorSettings.autoFormatting}
              diffOriginal={
                activeThread.proposedFile === activeFile?.name && activeThread.proposedPatch
                  ? activeFile?.content ?? ""
                  : null
              }
              diffModified={
                activeThread.proposedFile === activeFile?.name && activeThread.proposedPatch
                  ? applyUnifiedDiff(activeFile?.content ?? "", activeThread.proposedPatch).text
                  : null
              }
            />
          </section>
          ) : null}

        {showEditor && showAssistant ? (
          <div
            role="separator"
            aria-label="Resize editor"
            className="splitter splitterLayout"
            onPointerDown={(e) => startLayoutResize(e, "editor-assistant")}
          />
        ) : null}

        {showAssistant ? (
        <section className="pane assistantPane" aria-label="Assistant">
                <div className="paneHeader">
                  <div className="paneTitle">Assistant</div>
                  <div className="paneHeaderActions">
              <TextField aria-label="Model" className="textField">
                <select
                  aria-label="Model"
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                >
                  {models.length ? (
                    models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {(m.provider ?? m.type) + ":" + m.id}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No models configured
                    </option>
                  )}
                </select>
              </TextField>
                    <IconButton
                      aria-label="Clear conversation"
                      onPress={() =>
                        updateThread(activeThreadId, (t) => ({
                          ...t,
                          draft: "",
                          messages: [],
                          lastSuggestion: null,
                          proposed: [],
                          proposedOpen: true,
                        }))
                      }
                    >
                      <IconTrash />
                    </IconButton>
                    <IconButton
                      aria-label="Pin to bottom"
                      className={pinToBottom ? "pinButton active" : "pinButton"}
                      onPress={() => setPinToBottom((v) => !v)}
                    >
                      <IconPin />
                    </IconButton>
                  </div>
                </div>

          <div className={assistantCollapsed ? "chat collapsed" : "chat"}>
            <div ref={chatMessagesRef} className="chatMessages" aria-label="Chat messages">
              {activeThread.messages.length === 0 ? (
                <div className="muted chatEmpty">Ask for edits, citations, rewrites, or a summary.</div>
              ) : null}
              {activeThread.messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "bubble user" : "bubble assistant"}>
                  {m.text}
                </div>
              ))}
            </div>

            {activeThread.proposed.length ? (
              <div className="proposed card">
                <button
                  className="proposedHeader"
                  onClick={() => updateThread(activeThreadId, (t) => ({ ...t, proposedOpen: !t.proposedOpen }))}
                  aria-label="Proposed Changes"
                >
                  <span>Proposed Changes</span>
                  <span className="muted">{activeThread.proposedOpen ? "▾" : "▸"}</span>
                </button>
                {activeThread.proposedOpen ? (
                  <div className="proposedList">
                    {activeThread.proposedText ? (
                      <div className="muted" style={{ padding: "8px 0" }}>
                        {activeThread.proposedText}
                      </div>
                    ) : null}
                    {activeThread.proposed.map((p) => (
                      <button
                        key={p.file}
                        className="proposedRow"
                        onClick={() => setActive(p.file)}
                        aria-label={`Open ${p.file}`}
                      >
                        <div className="proposedFile">{p.file}</div>
                        <div className="proposedNote muted">{p.note}</div>
                        <div className="proposedDelta">
                          <span className="deltaPlus">+{p.added}</span>
                          <span className="deltaMinus">-{p.removed}</span>
                        </div>
                      </button>
                    ))}
                    <div className="row" style={{ padding: "8px 0 0" }}>
                      <Button
                        aria-label="Apply changes"
                        onPress={() => {
                          const file = activeThread.proposedFile;
                          const patch = activeThread.proposedPatch;
                          if (!file || !patch) return;
                          const entry = workspace.entries[file];
                          const baseContent = entry && entry.type === "file" ? entry.content : "";
                          const result = applyUnifiedDiff(baseContent, patch);
                          const nextEntries = { ...workspace.entries };
                          if (!entry || entry.type !== "file") {
                            const parts = file.split("/").slice(0, -1);
                            if (parts.length) {
                              let acc = "";
                              for (const part of parts) {
                                acc = acc ? `${acc}/${part}` : part;
                                const folderKey = `${acc}/`;
                                if (!nextEntries[folderKey]) nextEntries[folderKey] = folderEntry();
                              }
                            }
                          }
                          nextEntries[file] = fileEntry(result.text);
                          const next: Workspace = { ...workspace, entries: nextEntries, active: file };
                          setWorkspace(next);
                          queueSave(next);
                          updateThread(activeThreadId, (t) => ({
                            ...t,
                            proposed: [],
                            proposedFile: null,
                            proposedPatch: null,
                            proposedText: null,
                            proposedOpen: true,
                          }));
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        aria-label="Discard changes"
                        onPress={() =>
                          updateThread(activeThreadId, (t) => ({
                            ...t,
                            proposed: [],
                            proposedFile: null,
                            proposedPatch: null,
                            proposedText: null,
                            proposedOpen: true,
                          }))
                        }
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="chatInputBar">
              <input
                ref={imageInputRef}
                aria-label="Image upload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const input = e.target as HTMLInputElement;
                  const file = input.files?.[0] ?? null;
                  input.value = "";
                  if (!file) return;
                  void onExtractLatexFromImage(file);
                }}
              />
              <div className="chatComposer">
                <TextField aria-label="Ask anything" className="textField">
                  <Input
                    placeholder="Ask anything"
                    value={activeThread.draft}
                    onChange={(e) =>
                      updateThread(activeThreadId, (t) => ({ ...t, draft: (e.target as HTMLInputElement).value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void onSuggest();
                      }
                    }}
                  />
                </TextField>
                <div className="composerActions">
                  <IconButton
                    aria-label="Extract LaTeX from image"
                    onPress={() => imageInputRef.current?.click()}
                  >
                    <IconImage />
                  </IconButton>
                  <Button
                    onPress={() => void onSuggest()}
                    isDisabled={!activeThread.draft.trim()}
                    aria-label="Send"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
        ) : null}

        {showAssistant && showPreview ? (
          <div
            role="separator"
            aria-label="Resize assistant"
            className="splitter splitterLayout"
            onPointerDown={(e) => startLayoutResize(e, "assistant-right")}
          />
        ) : null}

        {showPreview ? (
        <section
          className={pdfSettings.darkMode ? "pane previewPane previewDark" : "pane previewPane"}
          aria-label={rightPaneMode === "tools" ? "Tools" : "Preview"}
          ref={previewContainerRef as any}
        >
          {rightPaneMode === "preview" ? (
            <>
              <div className="paneHeader previewHeader">
                <div className="previewHeaderLeft">
                  <Button
                    aria-label="Compile"
                    className="toolbarButton"
                    onPress={onCompilePreview}
                    isDisabled={previewCompiling}
                    type="button"
                  >
                    <span className={previewCompiling ? "iconOnly spin" : "iconOnly"} aria-hidden="true">
                      <IconRefresh />
                    </span>
                    <span className="toolbarText">{previewCompiling ? "Initializing…" : "Compile"}</span>
                  </Button>
                </div>
                <div className="previewHeaderCenter" aria-label="Page indicator">
                  {previewUrl && pdfPageCount
                    ? `${pad2(pdfPage)} of ${pad2(pdfPageCount)}`
                    : previewUrl
                      ? `${pad2(pdfPage)} of ${pad2(1)}`
                      : "-"}
                </div>
                <div className="previewHeaderRight">
                  <MenuTrigger>
                    <Button aria-label="Zoom" className="toolbarButton zoom">
                      <span className="toolbarText">Zoom to fit</span>
                      <span className="toolbarCaret" aria-hidden="true">
                        ▾
                      </span>
                    </Button>
                    <Popover className="popover">
                      <Menu aria-label="Zoom options" className="menu zoomMenu">
                        <MenuItem onAction={() => setZoomToFit()}>
                          <span>Zoom to fit</span>
                          <span className="menuShortcut">Ctrl0</span>
                        </MenuItem>
                        <MenuItem onAction={() => zoomBy(0.1)}>
                          <span>Zoom in</span>
                          <span className="menuShortcut">Ctrl+</span>
                        </MenuItem>
                        <MenuItem onAction={() => zoomBy(-0.1)}>
                          <span>Zoom out</span>
                          <span className="menuShortcut">Ctrl-</span>
                        </MenuItem>
                        <div role="separator" className="menuDivider" />
                        {["50%", "75%", "100%", "150%", "200%", "300%", "400%"].map((value) => (
                          <MenuItem
                            key={value}
                            onAction={() => {
                              const n = Number.parseInt(value.replace("%", ""), 10);
                              setZoomPercent(n / 100);
                            }}
                          >
                            {value}
                          </MenuItem>
                        ))}
                      </Menu>
                    </Popover>
                  </MenuTrigger>
                  <IconButton
                    aria-label="Download preview"
                    className="iconButton"
                    onPress={onDownloadPreview}
                    isDisabled={!previewUrl}
                  >
                    <IconDownload />
                  </IconButton>
                  <MenuTrigger>
                    <IconButton aria-label="More actions" className="iconButton">
                      <IconMore />
                    </IconButton>
                    <Popover className="popover">
                      <Menu aria-label="Preview actions" className="menu">
                        <MenuItem onAction={() => void onFullscreenPreview()}>Full screen</MenuItem>
                        <MenuItem onAction={onOpenPreviewInNewWindow}>Open in new window</MenuItem>
                      </Menu>
                    </Popover>
                  </MenuTrigger>
                </div>
              </div>
              {!previewCollapsed ? (
                <>
                  <div className="previewStage" ref={previewStageRef}>
                    {previewUrl ? (
                      !pdfRendererAvailable ? (
                        <iframe className="preview" title="PDF Preview" src={previewUrl} />
                      ) : (
                        <canvas className="previewCanvas" ref={pdfCanvasRef} aria-label="PDF Preview canvas" />
                      )
                    ) : (
                      <div className="previewPlaceholder muted">Compile to see preview.</div>
                    )}
                      <div className="previewFloating" role="group" aria-label="Preview controls">
                        <IconButton
                          aria-label="Undo"
                          className="previewFloatingBtn"
                          onPress={undoPage}
                          isDisabled={pageHistoryIndex <= 0}
                        >
                          <IconUndo />
                        </IconButton>
                        <IconButton
                          aria-label="Redo"
                          className="previewFloatingBtn"
                          onPress={redoPage}
                          isDisabled={pageHistoryIndex >= pageHistory.length - 1}
                        >
                          <IconRedo />
                        </IconButton>
                        <IconButton
                          aria-label="Previous page"
                          className="previewFloatingBtn"
                          onPress={() => goToPage(pdfPage - 1)}
                          isDisabled={!previewUrl || !pdfPageCount || pdfPage <= 1}
                        >
                          <IconChevronLeft />
                        </IconButton>
                        <IconButton
                          aria-label="Next page"
                          className="previewFloatingBtn"
                          onPress={() => goToPage(pdfPage + 1)}
                          isDisabled={!previewUrl || !pdfPageCount || pdfPage >= (pdfPageCount ?? 1)}
                        >
                          <IconChevronRight />
                        </IconButton>
                      </div>
                  </div>
                </>
              ) : (
                <div className="muted" style={{ padding: 12 }}>
                  Preview collapsed
                </div>
              )}
            </>
          ) : (
            <>
              <div className="paneHeader toolsHeader">
                <Tabs selectedKey={toolsTab} onSelectionChange={(k) => setToolsTab(k as "project" | "comments" | "logs")}>
                  <TabList aria-label="Tools tabs" className="toolsTabList">
                    <Tab id="project" className="toolsTab">
                      Project info
                    </Tab>
                    <Tab id="comments" className="toolsTab">
                      Comments
                    </Tab>
                    <Tab id="logs" className="toolsTab">
                      Logs
                    </Tab>
                  </TabList>
                </Tabs>
              </div>
              <div className="toolsPaneContent">
                  {toolsTab === "project" ? (
                    <>
                      <div className="paneTitle">Project info</div>
                      <div className="muted" style={{ marginTop: 6 }}>
                        Doc ID: {docId ?? "not created"}
                      </div>
                      <div className="muted" style={{ marginTop: 6 }}>
                        Files: {Object.keys(workspace.entries).length}
                      </div>
                      <div className="muted" style={{ marginTop: 6 }}>
                        Active: {workspace.active ?? "none"}
                      </div>
                      <div className="muted" style={{ marginTop: 6 }}>
                        Collaborators: {presenceUsers.length ? presenceUsers.map((u) => u.display_name).join(", ") : "none"}
                      </div>
                      <div className="card" style={{ marginTop: 10 }}>
                        <div className="paneTitle">History</div>
                        {revisions.length ? (
                          revisions.map((r) => (
                            <div key={r.id} className="row" style={{ padding: "6px 0" }}>
                              <div className="muted">{new Date(r.created_at).toLocaleString()}</div>
                              <Button
                                onPress={async () => {
                                  if (!docId) return;
                                  const restored = await restoreRevision(docId, r.id);
                                  const ws = tryParseWorkspace(restored.content);
                                  if (ws) setWorkspace(ws);
                                }}
                              >
                                Restore
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="muted" style={{ marginTop: 6 }}>
                            No revisions yet.
                          </div>
                        )}
                      </div>
                    </>
                  ) : toolsTab === "comments" ? (
                    <>
                      <div className="paneTitle">Comments</div>
                      <div className="card" style={{ marginTop: 8 }}>
                        {comments.length ? (
                          comments.map((c) => (
                            <div key={c.id} className="row" style={{ padding: "6px 0" }}>
                              <div>
                                <div>{c.body}</div>
                                {c.path ? (
                                  <div className="muted" style={{ fontSize: 11 }}>
                                    {c.path}
                                    {c.selection_start != null && c.selection_end != null
                                      ? ` (${c.selection_start}-${c.selection_end})`
                                      : ""}
                                  </div>
                                ) : null}
                              </div>
                              <div className="muted" style={{ fontSize: 11 }}>
                                {new Date(c.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="muted">No comments yet.</div>
                        )}
                      </div>
                      <div className="row" style={{ padding: 0, marginTop: 8 }}>
                        <TextField aria-label="Add comment" className="textField">
                          <Input
                            placeholder="Add a comment"
                            value={commentDraft}
                            onChange={(e) => setCommentDraft((e.target as HTMLInputElement).value)}
                          />
                        </TextField>
                        <Button
                          onPress={async () => {
                            const id = await ensureDocId();
                            if (!commentDraft.trim()) return;
                            const created = await addComment(id, commentDraft.trim(), {
                              path: activeFile?.name ?? null,
                              selection_start: selectionRange?.start ?? null,
                              selection_end: selectionRange?.end ?? null,
                            });
                            setComments((prev) => [...prev, created]);
                            setCommentDraft("");
                            await addLog(id, "Added comment");
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="paneTitle">Logs</div>
                      <div className="card" style={{ marginTop: 8 }}>
                        {logs.length ? (
                          logs.map((l) => (
                            <div key={l.id} className="row" style={{ padding: "6px 0" }}>
                              <div>{l.body}</div>
                              <div className="muted" style={{ fontSize: 11 }}>
                                {new Date(l.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="muted">No logs yet.</div>
                        )}
                      </div>
                    </>
                  )}
              </div>
            </>
          )}
        </section>
        ) : null}
        </div>
      </div>

      <ModalOverlay isOpen={isNewFileOpen} onOpenChange={setIsNewFileOpen} className="modalBackdrop">
        <Modal className="modal">
          <Dialog aria-label="New File">
            <div className="paneTitle">Create file</div>
            <TextField aria-label="File name" className="field">
              <span className="fieldLabel">File name</span>
              <Input value={newFileName} onChange={(e) => setNewFileName((e.target as HTMLInputElement).value)} />
            </TextField>
            <div className="row" style={{ padding: 0 }}>
              <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="radio" name="entryKind" checked={newEntryKind === "file"} onChange={() => setNewEntryKind("file")} />
                File
              </label>
              <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="radio" name="entryKind" checked={newEntryKind === "folder"} onChange={() => setNewEntryKind("folder")} />
                Folder
              </label>
            </div>
            <div className="row">
              <Button onPress={onCreateFile}>Create</Button>
              <Button onPress={() => setIsNewFileOpen(false)}>Cancel</Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>

      <ModalOverlay isOpen={settingsOpen} onOpenChange={setSettingsOpen} className="modalBackdrop">
        <Modal className="modal settingsModal">
          <Dialog aria-label="Settings">
            <div className="settingsLayout">
              <div className="settingsNav">
                <div className="settingsHeader">
                  <div className="paneTitle">Settings</div>
                  <Button aria-label="Close settings" className="iconButton" onPress={() => setSettingsOpen(false)}>
                    ✕
                  </Button>
                </div>
                <button className={settingsTab === "editor" ? "settingsNavItem active" : "settingsNavItem"} onClick={() => setSettingsTab("editor")}>
                  Editor
                </button>
                <button className={settingsTab === "pdf" ? "settingsNavItem active" : "settingsNavItem"} onClick={() => setSettingsTab("pdf")}>
                  PDF Viewer
                </button>
                <button className={settingsTab === "files" ? "settingsNavItem active" : "settingsNavItem"} onClick={() => setSettingsTab("files")}>
                  File Management
                </button>
                <button className={settingsTab === "integrations" ? "settingsNavItem active" : "settingsNavItem"} onClick={() => setSettingsTab("integrations")}>
                  Integrations
                </button>
              </div>

              <div className="settingsContent">
                {settingsTab === "editor" ? (
                  <>
                    <div className="paneTitle">Editor</div>
                    <div className="card" style={{ marginTop: 12 }}>
                      <div className="row settingsToggleRow">
                        <div>
                          <div>Auto Formatting</div>
                          <div className="muted">Automatically format LaTeX as you type.</div>
                        </div>
                        <button
                          aria-label="Auto Formatting"
                          className={editorSettings.autoFormatting ? "toggleSwitch on" : "toggleSwitch"}
                          onClick={() =>
                            setEditorSettings((s) => ({ ...s, autoFormatting: !s.autoFormatting }))
                          }
                        />
                      </div>
                      <div className="row settingsToggleRow">
                        <div>
                          <div>Realtime compilation</div>
                          <div className="muted">Compile document while typing.</div>
                        </div>
                        <button
                          aria-label="Realtime compilation"
                          className={editorSettings.realtimeCompile ? "toggleSwitch on" : "toggleSwitch"}
                          onClick={() =>
                            setEditorSettings((s) => ({ ...s, realtimeCompile: !s.realtimeCompile }))
                          }
                        />
                      </div>
                      <div className="row settingsToggleRow">
                        <div>
                          <div>Vim Mode</div>
                          <div className="muted">Enable vim keybindings.</div>
                        </div>
                        <button
                          aria-label="Vim Mode"
                          className={editorSettings.vimMode ? "toggleSwitch on" : "toggleSwitch"}
                          onClick={() => void toggleVimMode()}
                        />
                      </div>
                      <div className="row settingsToggleRow">
                        <div>
                          <div>Disable Word Wrap</div>
                          <div className="muted">Prevent long line wrapping.</div>
                        </div>
                        <button
                          aria-label="Disable Word Wrap"
                          className={editorSettings.disableWordWrap ? "toggleSwitch on" : "toggleSwitch"}
                          onClick={() =>
                            setEditorSettings((s) => ({ ...s, disableWordWrap: !s.disableWordWrap }))
                          }
                        />
                      </div>
                      <div className="row settingsToggleRow">
                        <div>
                          <div>Disable Sticky Scroll</div>
                          <div className="muted">Stop header stickiness.</div>
                        </div>
                        <button
                          aria-label="Disable Sticky Scroll"
                          className={editorSettings.disableStickyScroll ? "toggleSwitch on" : "toggleSwitch"}
                          onClick={() =>
                            setEditorSettings((s) => ({ ...s, disableStickyScroll: !s.disableStickyScroll }))
                          }
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {settingsTab === "pdf" ? (
                  <>
                    <div className="paneTitle">PDF Viewer</div>
                    <div className="card" style={{ marginTop: 12 }}>
                      <div className="row settingsToggleRow">
                        <div>
                          <div>PDF Dark Mode</div>
                          <div className="muted">Invert colors in the PDF viewer.</div>
                        </div>
                        <button
                          aria-label="PDF Dark Mode"
                          className={pdfSettings.darkMode ? "toggleSwitch on" : "toggleSwitch"}
                          onClick={() =>
                            setPdfSettings((s) => ({ ...s, darkMode: !s.darkMode }))
                          }
                        />
                      </div>
                      <div className="row settingsToggleRow">
                        <div>
                          <div>PDF Zoom Shortcuts</div>
                          <div className="muted">Use Cmd/Ctrl +/−/0 for PDF zoom.</div>
                        </div>
                        <button
                          aria-label="PDF Zoom Shortcuts"
                          className={pdfSettings.zoomShortcuts ? "toggleSwitch on" : "toggleSwitch"}
                          onClick={() =>
                            setPdfSettings((s) => ({ ...s, zoomShortcuts: !s.zoomShortcuts }))
                          }
                        />
                      </div>
                    </div>
                  </>
                ) : null}

                {settingsTab === "files" ? (
                  <>
                    <div className="paneTitle">File Management</div>
                    <div className="muted" style={{ marginTop: 6 }}>
                      Hide files from file tree
                    </div>
                    <div className="row" style={{ padding: 0, marginTop: 8 }}>
                      <Input
                        placeholder="Enter file name or extension to add to hide"
                        value={ignoreInput}
                        onChange={(e) => setIgnoreInput((e.target as HTMLInputElement).value)}
                      />
                      <Button
                        onPress={() => {
                          const v = ignoreInput.trim();
                          if (!v) return;
                          setIgnorePatterns((p) => (p.includes(v) ? p : [...p, v]));
                          setIgnoreInput("");
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <div className="fileList" style={{ padding: 0, marginTop: 12 }}>
                      {ignorePatterns.map((p) => (
                        <div key={p} className="folderRow" style={{ gridTemplateColumns: "1fr auto", gap: 8 }}>
                          <div className="muted">{p}</div>
                          <Button onPress={() => setIgnorePatterns((list) => list.filter((x) => x !== p))}>
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                {settingsTab === "integrations" ? (
                  <>
                    <div className="paneTitle">Integrations</div>
                    <div className="card" style={{ marginTop: 12 }}>
                      <div className="row settingsToggleRow">
                        <div>
                          <div>Web Search</div>
                          <div className="muted">Allow the assistant to use internet search results.</div>
                        </div>
                        <button
                          aria-label="Web Search"
                          className={webSearchEnabled ? "toggleSwitch on" : "toggleSwitch"}
                          onClick={() => setWebSearchEnabled((v) => !v)}
                        />
                      </div>
                      <div className="muted" style={{ marginTop: 8 }}>
                        Configure `VERTA_WEB_SEARCH_PROVIDER` and `VERTA_WEB_SEARCH_API_KEY` on the backend.
                      </div>
                    </div>
                    <div className="card" style={{ marginTop: 12 }}>
                      <div className="row">
                        <div>
                          <div>Zotero</div>
                          <div className="muted">Import references into your project.</div>
                        </div>
                        <Button
                          onPress={async () => {
                            const resp = await connectZotero();
                            notify(`Zotero ${resp.status}`);
                          }}
                        >
                          Connect
                        </Button>
                      </div>
                    </div>
                    <div className="card" style={{ marginTop: 12 }}>
                      <div className="paneTitle" style={{ marginBottom: 8 }}>
                        Ollama
                      </div>
                      <div className="row" style={{ padding: 0, flexWrap: "wrap" }}>
                        <Input
                          aria-label="Ollama base url"
                          placeholder="http://localhost:11434"
                          value={ollamaUrl}
                          onChange={(e) => setOllamaUrl((e.target as HTMLInputElement).value)}
                        />
                        <Button
                          aria-label="Check Ollama"
                          onPress={async () => {
                            try {
                              setOllamaStatus("Checking...");
                              const resp = await getOllamaStatus(ollamaUrl || undefined);
                              setOllamaModels(resp.models || []);
                              setOllamaStatus(`Connected to ${resp.baseUrl}`);
                              if (resp.models && resp.models.length) {
                                const nextModels: ModelConfig[] = resp.models.map((id) => ({
                                  type: "local",
                                  provider: "ollama",
                                  id,
                                  settings: {},
                                }));
                                const merged = [...models];
                                for (const m of nextModels) {
                                  if (!merged.find((x) => x.id === m.id && x.provider === m.provider)) {
                                    merged.push(m);
                                  }
                                }
                                setModels(merged);
                                if (!selectedModelId && merged.length) {
                                  setSelectedModelId(merged[0].id);
                                }
                                const id = await ensureDocId();
                                await putDocModels(id, { models: merged });
                              }
                            } catch (err) {
                              setOllamaModels([]);
                              setOllamaStatus(err instanceof Error ? err.message : "Ollama check failed");
                            }
                          }}
                        >
                          Check Ollama
                        </Button>
                      </div>
                      {ollamaStatus ? <div className="muted" style={{ marginTop: 8 }}>{ollamaStatus}</div> : null}
                      {ollamaModels.length ? (
                        <div className="fileList" style={{ padding: 0, marginTop: 8 }}>
                          {ollamaModels.map((m) => (
                            <div key={m} className="folderRow" style={{ gridTemplateColumns: "1fr", gap: 8 }}>
                              <div className="muted">{m}</div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="card" style={{ marginTop: 12 }}>
                      <div className="paneTitle" style={{ marginBottom: 8 }}>
                        Local model registry
                      </div>
                      <div className="row" style={{ padding: 0 }}>
                        <Button
                          aria-label="Refresh local models"
                          onPress={async () => {
                            setLocalModelsStatus("Loading…");
                            const list = await listLocalModels();
                            setLocalModels(list.map((m) => ({ id: m.id, runtime: m.runtime, fileName: m.fileName })));
                            setLocalModelsStatus(null);
                          }}
                        >
                          Refresh local models
                        </Button>
                      </div>
                      <div className="muted" style={{ marginTop: 8 }}>
                        Add / update model
                      </div>
                      <div className="row" style={{ padding: 0, flexWrap: "wrap" }}>
                        <Input
                          aria-label="Local model id"
                          placeholder="id"
                          value={newLocalModel.id}
                          onChange={(e) => setNewLocalModel((p) => ({ ...p, id: (e.target as HTMLInputElement).value }))}
                        />
                        <Input
                          aria-label="Local model fileName"
                          placeholder="fileName (e.g. m.gguf)"
                          value={newLocalModel.fileName}
                          onChange={(e) =>
                            setNewLocalModel((p) => ({ ...p, fileName: (e.target as HTMLInputElement).value }))
                          }
                        />
                        <Button
                          aria-label="Upsert local model"
                          onPress={async () => {
                            if (!newLocalModel.id || !newLocalModel.fileName) return;
                            await upsertLocalModel({
                              id: newLocalModel.id,
                              runtime: newLocalModel.runtime,
                              fileName: newLocalModel.fileName,
                              sha256: newLocalModel.sha256 || null,
                              sourceUrl: newLocalModel.sourceUrl || null,
                              settings: {},
                            });
                            const list = await listLocalModels();
                            setLocalModels(list.map((m) => ({ id: m.id, runtime: m.runtime, fileName: m.fileName })));
                          }}
                        >
                          Save
                        </Button>
                      </div>
                      {localModelsStatus ? <div className="muted">{localModelsStatus}</div> : null}
                      {localModels.length ? (
                        <div className="fileList" style={{ padding: 0, marginTop: 8 }}>
                          {localModels.map((m) => (
                            <div key={m.id} className="folderRow" style={{ gridTemplateColumns: "1fr auto auto auto", gap: 8 }}>
                              <div className="muted">
                                {m.id} — {m.runtime} — {m.fileName}
                              </div>
                              <Button
                                aria-label={`Verify ${m.id}`}
                                onPress={async () => {
                                  await verifyLocalModel(m.id);
                                }}
                              >
                                Verify
                              </Button>
                              <Button
                                aria-label={`Download ${m.id}`}
                                onPress={async () => {
                                  await downloadLocalModel(m.id);
                                }}
                              >
                                Download
                              </Button>
                              <Button
                                aria-label={`Delete ${m.id}`}
                                onPress={async () => {
                                  await deleteLocalModel(m.id);
                                  const list = await listLocalModels();
                                  setLocalModels(list.map((x) => ({ id: x.id, runtime: x.runtime, fileName: x.fileName })));
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="muted" style={{ marginTop: 8 }}>
                          No local models loaded.
                        </div>
                      )}
                    </div>
                    <div className="card" style={{ marginTop: 12 }}>
                      <div className="paneTitle" style={{ marginBottom: 8 }}>
                        Document model configs
                      </div>
                      <div className="row" style={{ padding: 0 }}>
                        <Button
                          aria-label="Save doc models"
                          isDisabled={false}
                          onPress={async () => {
                            const id = await ensureDocId();
                            setModelsSaveStatus("Saving…");
                            await putDocModels(id, { models });
                            setModelsSaveStatus("Models saved");
                            setTimeout(() => setModelsSaveStatus(null), 1500);
                          }}
                        >
                          Save doc models
                        </Button>
                      </div>
                      {modelsSaveStatus ? <div className="muted">{modelsSaveStatus}</div> : null}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="row" style={{ padding: 0, marginTop: 12 }}>
              <Button onPress={() => setSettingsOpen(false)}>Close</Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>

      <ModalOverlay isOpen={authOpen} onOpenChange={setAuthOpen} className="modalBackdrop">
        <Modal className="modal">
          <Dialog aria-label="Account">
            <div className="paneTitle">{authMode === "login" ? "Sign in" : "Create account"}</div>
            <TextField aria-label="Username" className="field">
              <span className="fieldLabel">Username</span>
              <Input
                value={authForm.username}
                onChange={(e) => setAuthForm((v) => ({ ...v, username: (e.target as HTMLInputElement).value }))}
              />
            </TextField>
            <TextField aria-label="Password" className="field">
              <span className="fieldLabel">Password</span>
              <Input
                type="password"
                value={authForm.password}
                onChange={(e) => setAuthForm((v) => ({ ...v, password: (e.target as HTMLInputElement).value }))}
              />
            </TextField>
            {authError ? <div className="muted">{authError}</div> : null}
            <div className="row">
              <Button
                onPress={async () => {
                  try {
                    setAuthError(null);
                    const resp =
                      authMode === "login"
                        ? await login(authForm.username, authForm.password)
                        : await register(authForm.username, authForm.password);
                    localStorage.setItem("authToken", resp.token);
                    setAuthUser(resp.user);
                    setAuthOpen(false);
                  } catch (err) {
                    setAuthError(err instanceof Error ? err.message : "Auth failed");
                  }
                }}
              >
                {authMode === "login" ? "Sign in" : "Register"}
              </Button>
              <Button onPress={() => setAuthMode(authMode === "login" ? "register" : "login")}>
                {authMode === "login" ? "Need an account" : "Have an account"}
              </Button>
              {authUser ? (
                <Button
                  onPress={async () => {
                    await logout();
                    localStorage.removeItem("authToken");
                    setAuthUser(null);
                    setAuthOpen(false);
                  }}
                >
                  Sign out
                </Button>
              ) : null}
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}








