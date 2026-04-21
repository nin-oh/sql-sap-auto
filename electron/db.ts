import sql, { type config as MssqlConfig } from "mssql";

type ConnectionConfig = {
  server: string;
  database: string;
  user: string;
  password: string;
  port?: number;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
};

function buildConfig(cfg: ConnectionConfig): MssqlConfig {
  return {
    server: cfg.server,
    database: cfg.database,
    user: cfg.user,
    password: cfg.password,
    port: cfg.port ?? 1433,
    options: {
      encrypt: cfg.encrypt ?? false,
      trustServerCertificate: cfg.trustServerCertificate ?? true,
      enableArithAbort: true,
    },
    pool: { min: 0, max: 4, idleTimeoutMillis: 30000 },
    connectionTimeout: 15000,
    requestTimeout: 120000,
  };
}

function inferType(value: unknown): sql.ISqlType {
  if (value === null || value === undefined) return sql.NVarChar(4000);
  if (typeof value === "number") {
    if (Number.isInteger(value)) return sql.Int();
    return sql.Float();
  }
  if (typeof value === "boolean") return sql.Bit();
  if (value instanceof Date) return sql.DateTime();
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return sql.Date();
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value))
      return sql.DateTime();
    return sql.NVarChar(4000);
  }
  return sql.NVarChar(4000);
}

function coerce(value: unknown): unknown {
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return value;
}

type ErrorKind = "network" | "auth" | "database" | "query" | "unknown";

function classifyError(e: unknown): { kind: ErrorKind; hint?: string } {
  const err = e as { code?: string; message?: string; number?: number };
  const msg = (err?.message ?? "").toString();
  const code = (err?.code ?? "").toString();

  if (
    code === "ETIMEDOUT" ||
    code === "ESOCKET" ||
    code === "ECONNREFUSED" ||
    code === "ECONNRESET" ||
    code === "EHOSTUNREACH" ||
    code === "ENETUNREACH" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    /timeout|unreachable|failed to connect|getaddrinfo/i.test(msg)
  ) {
    return {
      kind: "network",
      hint: "Serveur injoignable. Vérifiez que votre VPN est bien connecté, puis réessayez.",
    };
  }
  if (err.number === 18456 || /login failed/i.test(msg)) {
    return {
      kind: "auth",
      hint: "Identifiants refusés par SQL Server. Vérifiez l'utilisateur et le mot de passe.",
    };
  }
  if (err.number === 4060 || /cannot open database/i.test(msg)) {
    return {
      kind: "database",
      hint: "La base de données indiquée est introuvable ou inaccessible à cet utilisateur.",
    };
  }
  if (/syntax|invalid column|invalid object|incorrect syntax/i.test(msg)) {
    return { kind: "query" };
  }
  return { kind: "unknown" };
}

export async function testConnection(cfg: ConnectionConfig): Promise<{
  success: boolean;
  error?: string;
  hint?: string;
  kind?: ErrorKind;
  version?: string;
}> {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await new sql.ConnectionPool(buildConfig(cfg)).connect();
    const r = await pool.request().query("SELECT @@VERSION AS v");
    return { success: true, version: r.recordset[0]?.v ?? "" };
  } catch (e: unknown) {
    const c = classifyError(e);
    return {
      success: false,
      error: (e as Error).message,
      hint: c.hint,
      kind: c.kind,
    };
  } finally {
    if (pool) await pool.close().catch(() => undefined);
  }
}

export async function runQuery(
  cfg: ConnectionConfig,
  text: string,
  params: Record<string, unknown>,
): Promise<
  | { success: true; rows: Record<string, unknown>[]; columns: ColumnMeta[] }
  | { success: false; error: string; hint?: string; kind?: ErrorKind }
> {
  let pool: sql.ConnectionPool | null = null;
  try {
    pool = await new sql.ConnectionPool(buildConfig(cfg)).connect();
    const request = pool.request();
    for (const [key, rawValue] of Object.entries(params)) {
      const value = coerce(rawValue);
      request.input(key, inferType(value), value as never);
    }
    const result = await request.query(text);
    const recordset = result.recordset ?? [];
    const columns: ColumnMeta[] = extractColumns(result, recordset);
    return {
      success: true,
      rows: recordset as Record<string, unknown>[],
      columns,
    };
  } catch (e: unknown) {
    const c = classifyError(e);
    return {
      success: false,
      error: (e as Error).message,
      hint: c.hint,
      kind: c.kind,
    };
  } finally {
    if (pool) await pool.close().catch(() => undefined);
  }
}

export type ColumnMeta = {
  name: string;
  type: "number" | "date" | "boolean" | "string";
};

function extractColumns(
  result: sql.IResult<unknown>,
  sample: unknown[],
): ColumnMeta[] {
  const meta = (result.recordset as unknown as { columns?: Record<string, { type: { name: string } }> })
    ?.columns;
  if (meta && typeof meta === "object") {
    return Object.entries(meta).map(([name, info]) => ({
      name,
      type: mapMssqlType(info?.type?.name ?? ""),
    }));
  }
  const first = (sample[0] as Record<string, unknown>) ?? {};
  return Object.keys(first).map((name) => ({
    name,
    type: detectType(first[name]),
  }));
}

function mapMssqlType(name: string): ColumnMeta["type"] {
  const n = name.toLowerCase();
  if (
    n.includes("int") ||
    n.includes("decimal") ||
    n.includes("numeric") ||
    n.includes("float") ||
    n.includes("money") ||
    n.includes("real")
  )
    return "number";
  if (n.includes("date") || n.includes("time")) return "date";
  if (n.includes("bit")) return "boolean";
  return "string";
}

function detectType(v: unknown): ColumnMeta["type"] {
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (v instanceof Date) return "date";
  return "string";
}

export async function listTables(cfg: ConnectionConfig) {
  return runQuery(
    cfg,
    `SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
     FROM INFORMATION_SCHEMA.TABLES
     ORDER BY TABLE_SCHEMA, TABLE_NAME`,
    {},
  );
}
