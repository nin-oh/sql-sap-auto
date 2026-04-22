import type { ColumnMeta } from "./types";

type DemoRow = {
  DocNum: number;
  Dte: string;
  SlpCode: number;
  SlpName: string;
  WhsCode: string;
  CardCode: string;
  CardName: string;
  ItemCode: string;
  ItemName: string;
  Quantity: number;
  UnitPrice: number;
  LineTotal: number;
};

const SALESMEN = [
  { code: 1, name: "A. DUPONT" },
  { code: 2, name: "M. MARTIN" },
  { code: 3, name: "L. BERNARD" },
  { code: 4, name: "S. PETIT" },
  { code: 5, name: "R. ROUX" },
  { code: 6, name: "C. MOREAU" },
  { code: 7, name: "F. FOURNIER" },
];

const WAREHOUSES = ["01", "02", "03", "04", "CASA", "RABAT"];

const CLIENTS = [
  { code: "C00001", name: "CARREFOUR SA" },
  { code: "C00002", name: "MARJANE HOLDING" },
  { code: "C00003", name: "ACIMA SARL" },
  { code: "C00004", name: "BIM STORES" },
  { code: "C00005", name: "LABEL'VIE" },
  { code: "C00006", name: "METRO C&C" },
  { code: "C00007", name: "AL AMANE DISTRIBUTION" },
  { code: "C00008", name: "HANOUTY SUPER" },
  { code: "C00009", name: "ASWAK ASSALAM" },
  { code: "C00010", name: "ATACADAO" },
];

const ITEMS = [
  { code: "A1001", name: "HUILE DE TOURNESOL 1L" },
  { code: "A1002", name: "SUCRE BLANC 1KG" },
  { code: "A1003", name: "FARINE T55 2KG" },
  { code: "A1004", name: "RIZ BASMATI 5KG" },
  { code: "A1005", name: "LAIT UHT 1L" },
  { code: "A1006", name: "PÂTES SPAGHETTI 500G" },
  { code: "A1007", name: "CAFÉ MOULU 250G" },
  { code: "A1008", name: "THÉ VERT MENTHE" },
  { code: "A1009", name: "SAVON DE MARSEILLE" },
  { code: "A1010", name: "LESSIVE 3L" },
];

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

let DEMO_CACHE: DemoRow[] | null = null;

function buildDemoData(): DemoRow[] {
  if (DEMO_CACHE) return DEMO_CACHE;
  const rnd = mulberry32(42);
  const rows: DemoRow[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 1500; i++) {
    const daysAgo = Math.floor(rnd() * 120);
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const salesman = SALESMEN[Math.floor(rnd() * SALESMEN.length)];
    const warehouse = WAREHOUSES[Math.floor(rnd() * WAREHOUSES.length)];
    const client = CLIENTS[Math.floor(rnd() * CLIENTS.length)];
    const item = ITEMS[Math.floor(rnd() * ITEMS.length)];
    const qty = Math.floor(rnd() * 50) + 1;
    const price = Math.round((10 + rnd() * 180) * 100) / 100;
    rows.push({
      DocNum: 100000 + i,
      Dte: d.toISOString().slice(0, 10),
      SlpCode: salesman.code,
      SlpName: salesman.name,
      WhsCode: warehouse,
      CardCode: client.code,
      CardName: client.name,
      ItemCode: item.code,
      ItemName: item.name,
      Quantity: qty,
      UnitPrice: price,
      LineTotal: Math.round(qty * price * 100) / 100,
    });
  }
  rows.sort((a, b) => a.Dte.localeCompare(b.Dte));
  DEMO_CACHE = rows;
  return rows;
}

const COLUMNS: ColumnMeta[] = [
  { name: "DocNum", type: "number" },
  { name: "Dte", type: "date" },
  { name: "SlpCode", type: "number" },
  { name: "SlpName", type: "string" },
  { name: "WhsCode", type: "string" },
  { name: "CardCode", type: "string" },
  { name: "CardName", type: "string" },
  { name: "ItemCode", type: "string" },
  { name: "ItemName", type: "string" },
  { name: "Quantity", type: "number" },
  { name: "UnitPrice", type: "number" },
  { name: "LineTotal", type: "number" },
];

export function runDemoQuery(
  sql: string,
  params: Record<string, unknown>,
):
  | { success: true; rows: Record<string, unknown>[]; columns: ColumnMeta[] }
  | { success: false; error: string; hint?: string; kind?: string } {
  const s = sql.toLowerCase();
  if (s.includes("information_schema.tables")) {
    return {
      success: true,
      columns: [
        { name: "TABLE_SCHEMA", type: "string" },
        { name: "TABLE_NAME", type: "string" },
        { name: "TABLE_TYPE", type: "string" },
      ],
      rows: [
        { TABLE_SCHEMA: "dbo", TABLE_NAME: "SLS_DET", TABLE_TYPE: "BASE TABLE" },
        { TABLE_SCHEMA: "dbo", TABLE_NAME: "OITM", TABLE_TYPE: "BASE TABLE" },
        { TABLE_SCHEMA: "dbo", TABLE_NAME: "OCRD", TABLE_TYPE: "BASE TABLE" },
        { TABLE_SCHEMA: "dbo", TABLE_NAME: "OSLP", TABLE_TYPE: "BASE TABLE" },
        { TABLE_SCHEMA: "dbo", TABLE_NAME: "OWHS", TABLE_TYPE: "BASE TABLE" },
      ],
    };
  }

  const data = buildDemoData();
  const slp = Number(params.SlpCode);
  const whs = String(params.Entrepot ?? "*");
  const start = String(params.StartDate ?? "");
  const end = String(params.EndDate ?? "");

  const filtered = data.filter((r) => {
    if (!Number.isNaN(slp) && slp > 0 && r.SlpCode !== slp) return false;
    if (whs && whs !== "*") {
      const pattern = whs.replace(/%/g, "").toLowerCase();
      if (pattern && !r.WhsCode.toLowerCase().includes(pattern)) return false;
    }
    if (start && r.Dte < start) return false;
    if (end && r.Dte > end) return false;
    return true;
  });

  return {
    success: true,
    columns: COLUMNS,
    rows: filtered as unknown as Record<string, unknown>[],
  };
}

export function isDemoDataset(): boolean {
  return DEMO_CACHE !== null;
}
