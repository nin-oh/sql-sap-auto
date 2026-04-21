import CodeMirror from "@uiw/react-codemirror";
import { sql as sqlLang, MSSQL } from "@codemirror/lang-sql";
import { EditorView } from "@codemirror/view";
import { useAppStore } from "../store/appStore";

const theme = EditorView.theme(
  {
    "&": { color: "#e5e7eb", height: "100%" },
    ".cm-content": { caretColor: "#a78bfa" },
    ".cm-cursor": { borderLeftColor: "#a78bfa" },
    ".cm-line": { padding: "0 8px" },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      background: "rgba(124,92,255,0.25)",
    },
    ".cm-keyword": { color: "#c4b5fd" },
    ".cm-string": { color: "#86efac" },
    ".cm-number": { color: "#fca5a5" },
    ".cm-operator": { color: "#93c5fd" },
    ".cm-comment": { color: "#64748b", fontStyle: "italic" },
    ".cm-variableName": { color: "#e5e7eb" },
    ".cm-propertyName": { color: "#f0abfc" },
  },
  { dark: true },
);

export function QueryEditor() {
  const sql = useAppStore((s) => s.sql);
  const setSql = useAppStore((s) => s.setSql);
  return (
    <div className="h-full min-h-[200px] rounded-lg border border-border bg-bg-soft overflow-hidden">
      <CodeMirror
        value={sql}
        onChange={setSql}
        theme="dark"
        height="100%"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          autocompletion: true,
          indentOnInput: true,
        }}
        extensions={[sqlLang({ dialect: MSSQL, upperCaseKeywords: true }), theme]}
      />
    </div>
  );
}
