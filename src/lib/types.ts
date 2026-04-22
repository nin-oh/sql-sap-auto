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

export type VariableOption = { value: string | number; label?: string };

export type FilterOperator = "eq" | "likeOrAll" | "gte" | "lte";

export type Variable = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  default?: string | number;
  options?: string[];
  optionsQuery?: string;
  hint?: string;
  filterColumn?: string;
  filterOperator?: FilterOperator;
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
  variables?: Variable[];
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
      streamQuery: (
        sql: string,
        params: Record<string, unknown>,
        handlers: {
          onColumns?: (columns: ColumnMeta[]) => void;
          onBatch?: (rows: Record<string, unknown>[], totalSoFar: number) => void;
          onDone?: (payload: {
            success: boolean;
            totalRows?: number;
            durationMs?: number;
            error?: string;
            hint?: string;
            kind?: ErrorKind;
          }) => void;
        },
      ) => { cancel: () => void };
      fetchOptions: (sql: string) => Promise<QueryResult>;
      listHistory: () => Promise<HistoryEntry[]>;
      clearHistory: () => Promise<boolean>;
      listTemplates: () => Promise<Template[]>;
      saveTemplate: (tpl: Template) => Promise<Template[]>;
      deleteTemplate: (id: string) => Promise<Template[]>;
      listSnapshots: () => Promise<Snapshot[]>;
      saveSnapshot: (snap: Snapshot) => Promise<Snapshot[]>;
      deleteSnapshot: (id: string) => Promise<Snapshot[]>;
      exportWorkspace: (opts?: {
        hint?: string;
        title?: string;
        templateIds?: string[];
        snapshotIds?: string[];
        includeHistory?: boolean;
        extraSnapshots?: Snapshot[];
      }) => Promise<{
        success: boolean;
        filePath?: string;
        canceled?: boolean;
        error?: string;
        counts?: { templates: number; snapshots: number; history: number };
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
      exportExcel: (args: {
        items: Array<{
          name: string;
          description?: string;
          sql: string;
          params: Record<string, unknown>;
          columns: ColumnMeta[];
          rows: Record<string, unknown>[];
          filters?: Array<{
            paramName: string;
            column: string;
            operator: FilterOperator;
          }>;
        }>;
        title?: string;
        exportedBy?: string;
        defaultFileName?: string;
      }) => Promise<{
        success: boolean;
        filePath?: string;
        canceled?: boolean;
        error?: string;
      }>;
    };
  }
}
