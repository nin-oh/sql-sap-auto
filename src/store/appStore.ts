import { create } from "zustand";
import type {
  ColumnMeta,
  HistoryEntry,
  Template,
  Variable,
} from "../lib/types";
import { mergeVariables } from "../lib/template";

type View = "results" | "chart";

type AppState = {
  sql: string;
  variables: Variable[];
  values: Record<string, string>;
  rows: Record<string, unknown>[];
  columns: ColumnMeta[];
  running: boolean;
  error: string | null;
  errorHint: string | null;
  errorKind: string | null;
  durationMs: number | null;
  view: View;
  templates: Template[];
  activeTemplateId: string | null;
  history: HistoryEntry[];

  setSql: (sql: string) => void;
  setValue: (name: string, value: string) => void;
  setView: (view: View) => void;

  initialize: () => Promise<void>;
  loadTemplate: (id: string) => void;
  saveCurrentAsTemplate: (name: string, description?: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  reloadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
  runFromHistory: (entry: HistoryEntry) => void;
  runQuery: () => Promise<void>;
};

export const useAppStore = create<AppState>((set, get) => ({
  sql: "",
  variables: [],
  values: {},
  rows: [],
  columns: [],
  running: false,
  error: null,
  errorHint: null,
  errorKind: null,
  durationMs: null,
  view: "results",
  templates: [],
  activeTemplateId: null,
  history: [],

  setSql: (sql) => {
    const variables = mergeVariables(sql, get().variables);
    const values = { ...get().values };
    for (const v of variables) {
      if (values[v.name] === undefined)
        values[v.name] = v.default != null ? String(v.default) : "";
    }
    set({ sql, variables, values });
  },

  setValue: (name, value) =>
    set((s) => ({ values: { ...s.values, [name]: value } })),

  setView: (view) => set({ view }),

  initialize: async () => {
    const [templates, history] = await Promise.all([
      window.sap.listTemplates(),
      window.sap.listHistory(),
    ]);
    set({ templates, history });
    if (templates[0]) {
      get().loadTemplate(templates[0].id);
    }
  },

  loadTemplate: (id) => {
    const tpl = get().templates.find((t) => t.id === id);
    if (!tpl) return;
    const variables = mergeVariables(tpl.sql, tpl.variables);
    const values: Record<string, string> = {};
    for (const v of variables) {
      values[v.name] = v.default != null ? String(v.default) : "";
    }
    set({
      sql: tpl.sql,
      variables,
      values,
      activeTemplateId: id,
      rows: [],
      columns: [],
      error: null,
      errorHint: null,
      errorKind: null,
      durationMs: null,
    });
  },

  saveCurrentAsTemplate: async (name, description) => {
    const { sql, variables } = get();
    const tpl: Template = {
      id: `tpl_${Date.now().toString(36)}`,
      name,
      description,
      sql,
      variables,
      createdAt: Date.now(),
    };
    const templates = await window.sap.saveTemplate(tpl);
    set({ templates, activeTemplateId: tpl.id });
  },

  deleteTemplate: async (id) => {
    const templates = await window.sap.deleteTemplate(id);
    set({ templates });
    if (get().activeTemplateId === id && templates[0]) {
      get().loadTemplate(templates[0].id);
    }
  },

  reloadHistory: async () => {
    const history = await window.sap.listHistory();
    set({ history });
  },

  clearHistory: async () => {
    await window.sap.clearHistory();
    set({ history: [] });
  },

  runFromHistory: (entry) => {
    const variables = mergeVariables(entry.sql, get().variables);
    const values: Record<string, string> = {};
    for (const v of variables) {
      const raw = (entry.params as Record<string, unknown>)[v.name];
      values[v.name] = raw != null ? String(raw) : "";
    }
    set({ sql: entry.sql, variables, values });
  },

  runQuery: async () => {
    const { sql, variables, values } = get();
    if (!sql.trim()) return;
    set({ running: true, error: null, errorHint: null, errorKind: null });
    const params: Record<string, unknown> = {};
    for (const v of variables) {
      const raw = values[v.name] ?? v.default ?? "";
      params[v.name] =
        v.type === "number"
          ? Number.isFinite(Number(raw))
            ? Number(raw)
            : 0
          : String(raw);
    }
    const started = Date.now();
    const result = await window.sap.runQuery(sql, params);
    const durationMs = Date.now() - started;
    if (result.success) {
      set({
        rows: result.rows,
        columns: result.columns,
        error: null,
        errorHint: null,
        errorKind: null,
        durationMs,
        running: false,
      });
    } else {
      set({
        rows: [],
        columns: [],
        error: result.error,
        errorHint: result.hint ?? null,
        errorKind: result.kind ?? null,
        durationMs,
        running: false,
      });
    }
    await get().reloadHistory();
  },
}));
