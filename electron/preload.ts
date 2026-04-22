import { contextBridge, ipcRenderer } from "electron";

const api = {
  getConnection: () => ipcRenderer.invoke("connection:get"),
  saveConnection: (cfg: unknown) => ipcRenderer.invoke("connection:save", cfg),
  testConnection: (cfg: unknown) => ipcRenderer.invoke("connection:test", cfg),

  runQuery: (sql: string, params: Record<string, unknown>) =>
    ipcRenderer.invoke("query:run", { sql, params }),
  listTables: () => ipcRenderer.invoke("query:tables"),

  streamQuery: (
    sql: string,
    params: Record<string, unknown>,
    handlers: {
      onColumns?: (columns: unknown[]) => void;
      onBatch?: (rows: unknown[], totalSoFar: number) => void;
      onDone?: (payload: {
        success: boolean;
        totalRows?: number;
        durationMs?: number;
        error?: string;
        hint?: string;
        kind?: string;
      }) => void;
    },
  ) => {
    const jobId = `j_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const metaCh = `query:meta:${jobId}`;
    const batchCh = `query:batch:${jobId}`;
    const doneCh = `query:done:${jobId}`;
    const onMeta = (_e: unknown, payload: { columns: unknown[] }) => {
      handlers.onColumns?.(payload.columns);
    };
    const onBatch = (
      _e: unknown,
      payload: { rows: unknown[]; totalSoFar: number },
    ) => {
      handlers.onBatch?.(payload.rows, payload.totalSoFar);
    };
    const onDone = (
      _e: unknown,
      payload: {
        success: boolean;
        totalRows?: number;
        durationMs?: number;
        error?: string;
        hint?: string;
        kind?: string;
      },
    ) => {
      handlers.onDone?.(payload);
      ipcRenderer.removeListener(metaCh, onMeta);
      ipcRenderer.removeListener(batchCh, onBatch);
      ipcRenderer.removeListener(doneCh, onDone);
    };
    ipcRenderer.on(metaCh, onMeta);
    ipcRenderer.on(batchCh, onBatch);
    ipcRenderer.on(doneCh, onDone);
    ipcRenderer.send("query:start", { jobId, sql, params });
    return {
      cancel: () => ipcRenderer.send("query:cancel", { jobId }),
    };
  },

  fetchOptions: (sql: string) =>
    ipcRenderer.invoke("options:fetch", { sql }),

  listHistory: () => ipcRenderer.invoke("history:list"),
  clearHistory: () => ipcRenderer.invoke("history:clear"),

  listTemplates: () => ipcRenderer.invoke("templates:list"),
  saveTemplate: (tpl: unknown) => ipcRenderer.invoke("templates:save", tpl),
  deleteTemplate: (id: string) => ipcRenderer.invoke("templates:delete", id),

  listSnapshots: () => ipcRenderer.invoke("snapshots:list"),
  saveSnapshot: (snap: unknown) => ipcRenderer.invoke("snapshots:save", snap),
  deleteSnapshot: (id: string) => ipcRenderer.invoke("snapshots:delete", id),

  exportWorkspace: (hint?: string) =>
    ipcRenderer.invoke("workspace:export", hint),
  importWorkspace: (mode: "merge" | "replace" = "merge") =>
    ipcRenderer.invoke("workspace:import", { mode }),

  exportCsv: (rows: unknown, columns: unknown) =>
    ipcRenderer.invoke("export:csv", { rows, columns }),
  exportExcel: (args: unknown) => ipcRenderer.invoke("export:excel", args),
};

contextBridge.exposeInMainWorld("sap", api);

export type SapApi = typeof api;
