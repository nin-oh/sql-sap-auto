import {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
  shell,
  dialog,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import { runQuery, testConnection, listTables } from "./db";

type ConnectionConfig = {
  server: string;
  database: string;
  user: string;
  password: string;
  port?: number;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
};

type HistoryEntry = {
  id: string;
  timestamp: number;
  sql: string;
  params: Record<string, unknown>;
  durationMs: number;
  rowCount: number;
  success: boolean;
  error?: string;
};

type Template = {
  id: string;
  name: string;
  description?: string;
  sql: string;
  variables: Array<{
    name: string;
    label: string;
    type: "text" | "number" | "date" | "select";
    default?: string | number;
    options?: string[];
    hint?: string;
  }>;
  createdAt: number;
};

const userDataDir = () => app.getPath("userData");
const connectionFile = () => path.join(userDataDir(), "connection.json");
const historyFile = () => path.join(userDataDir(), "history.json");
const templatesFile = () => path.join(userDataDir(), "templates.json");

function readJsonSafe<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function saveConnection(cfg: ConnectionConfig) {
  const payload = { ...cfg };
  if (safeStorage.isEncryptionAvailable() && payload.password) {
    const encrypted = safeStorage
      .encryptString(payload.password)
      .toString("base64");
    payload.password = `enc:${encrypted}`;
  }
  writeJson(connectionFile(), payload);
}

function loadConnection(): ConnectionConfig | null {
  const raw = readJsonSafe<ConnectionConfig | null>(connectionFile(), null);
  if (!raw) return null;
  if (
    raw.password &&
    typeof raw.password === "string" &&
    raw.password.startsWith("enc:") &&
    safeStorage.isEncryptionAvailable()
  ) {
    try {
      const buf = Buffer.from(raw.password.slice(4), "base64");
      raw.password = safeStorage.decryptString(buf);
    } catch {
      raw.password = "";
    }
  }
  return raw;
}

function loadHistory(): HistoryEntry[] {
  return readJsonSafe<HistoryEntry[]>(historyFile(), []);
}

function pushHistory(entry: HistoryEntry) {
  const list = loadHistory();
  list.unshift(entry);
  writeJson(historyFile(), list.slice(0, 500));
}

function loadTemplates(): Template[] {
  const existing = readJsonSafe<Template[] | null>(templatesFile(), null);
  if (existing && existing.length > 0) return existing;
  const seeded = seedTemplates();
  writeJson(templatesFile(), seeded);
  return seeded;
}

function saveTemplates(list: Template[]) {
  writeJson(templatesFile(), list);
}

function seedTemplates(): Template[] {
  return [
    {
      id: "tpl_sls_det",
      name: "Ventes par vendeur (SLS_DET)",
      description:
        "Lignes de ventes détaillées filtrées par vendeur, entrepôt et période. Utilisez '*' pour tous les entrepôts.",
      sql: `SELECT *
FROM DATAWAREHOUSE.dbo.SLS_DET s
WHERE
    s.SlpCode = :SlpCode
    AND (:Entrepot = '*' OR s.WhsCode LIKE :Entrepot)
    AND s.Dte BETWEEN :StartDate AND :EndDate
ORDER BY s.Dte`,
      variables: [
        {
          name: "SlpCode",
          label: "Code vendeur",
          type: "number",
          default: 1,
          hint: "Identifiant numérique du vendeur (SlpCode).",
        },
        {
          name: "Entrepot",
          label: "Entrepôt",
          type: "text",
          default: "*",
          hint: "Code d'entrepôt. Utilisez * pour tous. Les jokers % sont acceptés (ex: 01%).",
        },
        {
          name: "StartDate",
          label: "Date début",
          type: "date",
          default: new Date(Date.now() - 30 * 86400000)
            .toISOString()
            .slice(0, 10),
        },
        {
          name: "EndDate",
          label: "Date fin",
          type: "date",
          default: new Date().toISOString().slice(0, 10),
        },
      ],
      createdAt: Date.now(),
    },
    {
      id: "tpl_list_tables",
      name: "Liste des tables",
      description: "Affiche toutes les tables de la base courante.",
      sql: `SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
ORDER BY TABLE_SCHEMA, TABLE_NAME`,
      variables: [],
      createdAt: Date.now(),
    },
  ];
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#0b0d12",
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("connection:get", async () => loadConnection());
ipcMain.handle("connection:save", async (_e, cfg: ConnectionConfig) => {
  saveConnection(cfg);
  return true;
});
ipcMain.handle("connection:test", async (_e, cfg: ConnectionConfig) => {
  return testConnection(cfg);
});

ipcMain.handle(
  "query:run",
  async (_e, args: { sql: string; params: Record<string, unknown> }) => {
    const cfg = loadConnection();
    if (!cfg) {
      return { success: false, error: "No connection configured." };
    }
    const started = Date.now();
    const result = await runQuery(cfg, args.sql, args.params);
    const entry: HistoryEntry = {
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: started,
      sql: args.sql,
      params: args.params,
      durationMs: Date.now() - started,
      rowCount: result.success ? result.rows.length : 0,
      success: result.success,
      error: result.success ? undefined : result.error,
    };
    pushHistory(entry);
    return { ...result, entry };
  },
);

ipcMain.handle("query:tables", async () => {
  const cfg = loadConnection();
  if (!cfg) return { success: false, error: "No connection configured." };
  return listTables(cfg);
});

ipcMain.handle("history:list", async () => loadHistory());
ipcMain.handle("history:clear", async () => {
  writeJson(historyFile(), []);
  return true;
});

ipcMain.handle("templates:list", async () => loadTemplates());
ipcMain.handle("templates:save", async (_e, tpl: Template) => {
  const list = loadTemplates();
  const idx = list.findIndex((t) => t.id === tpl.id);
  if (idx >= 0) list[idx] = tpl;
  else list.push(tpl);
  saveTemplates(list);
  return list;
});
ipcMain.handle("templates:delete", async (_e, id: string) => {
  const list = loadTemplates().filter((t) => t.id !== id);
  saveTemplates(list);
  return list;
});

ipcMain.handle(
  "export:csv",
  async (
    _e,
    args: { rows: Record<string, unknown>[]; columns: string[] },
  ) => {
    if (!mainWindow) return { success: false, error: "No window" };
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Exporter en CSV",
      defaultPath: `export_${Date.now()}.csv`,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const header = args.columns.map(esc).join(",");
    const body = args.rows
      .map((r) => args.columns.map((c) => esc(r[c])).join(","))
      .join("\n");
    fs.writeFileSync(filePath, `${header}\n${body}`, "utf8");
    return { success: true, filePath };
  },
);
