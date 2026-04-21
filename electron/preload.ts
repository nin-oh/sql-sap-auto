import { contextBridge, ipcRenderer } from "electron";

const api = {
  getConnection: () => ipcRenderer.invoke("connection:get"),
  saveConnection: (cfg: unknown) => ipcRenderer.invoke("connection:save", cfg),
  testConnection: (cfg: unknown) => ipcRenderer.invoke("connection:test", cfg),

  runQuery: (sql: string, params: Record<string, unknown>) =>
    ipcRenderer.invoke("query:run", { sql, params }),
  listTables: () => ipcRenderer.invoke("query:tables"),

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
