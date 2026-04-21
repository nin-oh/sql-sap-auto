export type ConnectionConfig = {
  server: string;
  database: string;
  user: string;
  password: string;
  port?: number;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
};

export type ColumnMeta = {
  name: string;
  type: "number" | "date" | "boolean" | "string";
};

export type ErrorKind = "network" | "auth" | "database" | "query" | "unknown";

export type QueryResult =
  | {
      success: true;
      rows: Record<string, unknown>[];
      columns: ColumnMeta[];
      entry?: HistoryEntry;
    }
  | {
      success: false;
      error: string;
      hint?: string;
      kind?: ErrorKind;
      entry?: HistoryEntry;
    };

export type HistoryEntry = {
  id: string;
  timestamp: number;
  sql: string;
  params: Record<string, unknown>;
  durationMs: number;
  rowCount: number;
  success: boolean;
  error?: string;
};

export type Variable = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  default?: string | number;
  options?: string[];
  hint?: string;
};

export type Template = {
  id: string;
  name: string;
  description?: string;
  sql: string;
  variables: Variable[];
  createdAt: number;
};

export type Snapshot = {
  id: string;
  name: string;
  description?: string;
  sql: string;
  params: Record<string, unknown>;
  columns: ColumnMeta[];
  rows: Record<string, unknown>[];
  createdAt: number;
  createdBy?: string;
};

declare global {
  interface Window {
    sap: {
      getConnection: () => Promise<ConnectionConfig | null>;
      saveConnection: (cfg: ConnectionConfig) => Promise<boolean>;
      testConnection: (
        cfg: ConnectionConfig,
      ) => Promise<{
        success: boolean;
        error?: string;
        hint?: string;
        kind?: ErrorKind;
        version?: string;
      }>;
      runQuery: (
        sql: string,
        params: Record<string, unknown>,
      ) => Promise<QueryResult>;
      listTables: () => Promise<QueryResult>;
      listHistory: () => Promise<HistoryEntry[]>;
      clearHistory: () => Promise<boolean>;
      listTemplates: () => Promise<Template[]>;
      saveTemplate: (tpl: Template) => Promise<Template[]>;
      deleteTemplate: (id: string) => Promise<Template[]>;
      listSnapshots: () => Promise<Snapshot[]>;
      saveSnapshot: (snap: Snapshot) => Promise<Snapshot[]>;
      deleteSnapshot: (id: string) => Promise<Snapshot[]>;
      exportWorkspace: (
        hint?: string,
      ) => Promise<{
        success: boolean;
        filePath?: string;
        canceled?: boolean;
        error?: string;
      }>;
      importWorkspace: (
        mode?: "merge" | "replace",
      ) => Promise<{
        success: boolean;
        filePath?: string;
        canceled?: boolean;
        error?: string;
        counts?: { templates: number; history: number; snapshots: number };
      }>;
      exportCsv: (
        rows: Record<string, unknown>[],
        columns: string[],
      ) => Promise<{ success: boolean; filePath?: string; canceled?: boolean }>;
    };
  }
}
