import { Suspense, lazy, useEffect, useMemo, useRef } from "react";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onSelectionChange?: (start: number, end: number) => void;
  language?: string;
  ariaLabel: string;
  wordWrap?: "on" | "off";
  stickyScroll?: boolean;
  vimMode?: boolean;
  formatOnType?: boolean;
  diffOriginal?: string | null;
  diffModified?: string | null;
};

const Monaco = lazy(() => import("@monaco-editor/react"));

function isTestEnv() {
  // Vitest/jsdom cannot run Monaco reliably.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (import.meta as any).env?.MODE === "test";
}

function defineTheme(monaco: any) {
  if (!monaco.languages.getLanguages().some((l: any) => l.id === "latex")) {
    monaco.languages.register({ id: "latex" });
    monaco.languages.setMonarchTokensProvider("latex", {
      tokenizer: {
        root: [
          [/%.*/, "comment"],
          [/\\[a-zA-Z]+/, "keyword"],
          [/\$[^$]*\$/, "string"],
          [/\{/, "delimiter.bracket"],
          [/\}/, "delimiter.bracket"],
        ],
      },
    });
  }
  monaco.editor.defineTheme("verta-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#0a0b10",
      "editorLineNumber.foreground": "#5b6472",
      "editorLineNumber.activeForeground": "#cbd5e1",
      "editorGutter.background": "#0a0b10",
      "editorCursor.foreground": "#cbd5e1",
      "editor.selectionBackground": "#1f2937",
      "editor.inactiveSelectionBackground": "#141923",
    },
  });
}

export function CodeEditor({
  value,
  onChange,
  onSelectionChange,
  language = "latex",
  ariaLabel,
  wordWrap = "on",
  stickyScroll = true,
  vimMode = false,
  formatOnType = true,
  diffOriginal = null,
  diffModified = null,
}: Props) {
  const useTextarea = isTestEnv();
  const showDiff = diffOriginal != null && diffModified != null && !useTextarea;
  const diffEditorRef = useRef<any>(null);
  const options = useMemo(
    () => ({
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 13,
      lineNumbers: "on",
      wordWrap,
      scrollBeyondLastLine: true,
      bracketPairColorization: { enabled: true },
      formatOnType,
      formatOnPaste: formatOnType,
      suggestOnTriggerCharacters: true,
      quickSuggestions: { other: true, comments: true, strings: true },
      parameterHints: { enabled: true },
      hover: { enabled: true },
      links: true,
      folding: true,
      stickyScroll: { enabled: stickyScroll },
      renderWhitespace: "boundary",
      renderControlCharacters: true,
      smoothScrolling: true,
      cursorSmoothCaretAnimation: "on",
    }),
    [formatOnType, stickyScroll, wordWrap],
  );

  useEffect(() => {
    if (!showDiff || !diffEditorRef.current) return;
    const editor = diffEditorRef.current;
    const changes = editor.getLineChanges?.() ?? [];
    const first = changes?.[0];
    const line = Math.max(1, first?.modifiedStartLineNumber || first?.originalStartLineNumber || 1);
    const modified = editor.getModifiedEditor?.();
    if (modified?.revealLineInCenter) {
      modified.revealLineInCenter(line);
    }
  }, [showDiff, diffModified]);

  if (useTextarea) {
    return (
      <textarea
        className="editor"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={(e) => {
          const target = e.currentTarget;
          if (onSelectionChange) onSelectionChange(target.selectionStart ?? 0, target.selectionEnd ?? 0);
        }}
      />
    );
  }

  return (
    <div className="monacoWrap" aria-label={ariaLabel}>
      <Suspense fallback={<div className="muted" style={{ padding: 12 }}>Loading editor...</div>}>
        {showDiff ? (
          <Monaco.DiffEditor
            height="100%"
            theme="vs-dark"
            language={language}
            original={diffOriginal ?? ""}
            modified={diffModified ?? ""}
            options={{ ...options, renderSideBySide: false, readOnly: true }}
            beforeMount={(monaco) => {
              defineTheme(monaco);
            }}
            onMount={(editor, monaco) => {
              monaco.editor.setTheme("verta-dark");
              diffEditorRef.current = editor;
            }}
          />
        ) : (
          <Monaco
            height="100%"
            theme="vs-dark"
            language={language}
            value={value}
            options={options}
            beforeMount={(monaco) => {
              defineTheme(monaco);
            }}
            onMount={(editor, monaco) => {
              monaco.editor.setTheme("verta-dark");
              const model = editor.getModel();
              editor.onDidChangeCursorSelection((e) => {
                if (!onSelectionChange || !model) return;
                const start = model.getOffsetAt(e.selection.getStartPosition());
                const end = model.getOffsetAt(e.selection.getEndPosition());
                onSelectionChange(start, end);
              });
              if (vimMode) {
                void (async () => {
                  try {
                    const modPath = "monaco-vim";
                    const mod = await import(/* @vite-ignore */ modPath);
                    const initVimMode = (mod as any).initVimMode as (ed: any, el: HTMLElement) => { dispose: () => void };
                    initVimMode(editor, editor.getDomNode() as HTMLElement);
                  } catch {}
                })();
              }
            }}
            onChange={(v) => onChange(v ?? "")}
          />
        )}
      </Suspense>
    </div>
  );
}
