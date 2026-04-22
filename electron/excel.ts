import ExcelJS from "exceljs";

type ColumnType = "number" | "date" | "boolean" | "string";

type ColumnMeta = {
  name: string;
  type: ColumnType;
};

export type ExcelFilterMapping = {
  paramName: string;
  column: string;
  operator: "eq" | "likeOrAll" | "gte" | "lte";
};

export type ExcelExportItem = {
  name: string;
  description?: string;
  sql: string;
  params: Record<string, unknown>;
  columns: ColumnMeta[];
  rows: Record<string, unknown>[];
  filters?: ExcelFilterMapping[];
};

export type ExcelExportRequest = {
  filePath: string;
  title?: string;
  exportedBy?: string;
  items: ExcelExportItem[];
};

const COLORS = {
  accent: "FF7C5CFF",
  accentDark: "FF4A2DCF",
  accentLight: "FFB9A5FF",
  accentSoft: "FFF3F0FF",
  bandRow: "FFF8F7FD",
  headerText: "FFFFFFFF",
  bodyText: "FF1F1F2E",
  mutedText: "FF6B7280",
  paramBg: "FFFFFBCC",
  paramBorder: "FFD4A500",
  paramLabelBg: "FFEDE8FF",
  success: "FF059669",
  line: "FFE5E7EB",
};

function sanitizeSheetName(raw: string, idx: number): string {
  let name = (raw || `Table ${idx + 1}`).replace(/[\\/?*\[\]:]/g, "-").trim();
  if (!name) name = `Table ${idx + 1}`;
  if (name.length > 28) name = name.slice(0, 28) + "…";
  return name;
}

function columnLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function coerceCellValue(
  value: unknown,
  type: ColumnType,
): string | number | boolean | Date | null {
  if (value === null || value === undefined) return null;
  if (type === "date") {
    if (value instanceof Date) return value;
    if (typeof value === "string") {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? value : d;
    }
  }
  if (type === "number" && typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return value as string | number | boolean | Date;
}

function shouldAggregate(name: string, samples: unknown[]): boolean {
  const n = name.toLowerCase();
  if (/^(doc|item|card|slp|bp|u_|ocr|owhs|oitm|ref)/.test(n)) return false;
  if (/(code|num|id|no|number|key|idx|ref|year|month|day|week|doc)$/i.test(n))
    return false;
  if (/^(id|code|num|no|ref|key|idx|year|month|day)$/i.test(n)) return false;
  // If all numeric values are unique integers and large, it's likely an ID
  let uniq = new Set<number>();
  let allInt = true;
  let count = 0;
  for (const v of samples) {
    if (typeof v !== "number") continue;
    count++;
    if (!Number.isInteger(v)) allInt = false;
    uniq.add(v);
    if (count > 120) break;
  }
  if (count >= 20 && allInt && uniq.size / count > 0.92) return false;
  return true;
}

function numFmtFor(type: ColumnType, sampleValues: unknown[]): string {
  if (type === "date") {
    const hasTime = sampleValues.some((v) => {
      if (v instanceof Date) {
        return (
          v.getHours() !== 0 || v.getMinutes() !== 0 || v.getSeconds() !== 0
        );
      }
      if (typeof v === "string") return /\d{2}:\d{2}/.test(v);
      return false;
    });
    return hasTime ? "yyyy-mm-dd hh:mm" : "yyyy-mm-dd";
  }
  if (type === "number") {
    const hasDecimals = sampleValues.some(
      (v) => typeof v === "number" && !Number.isInteger(v),
    );
    return hasDecimals ? "#,##0.00" : "#,##0";
  }
  return "@";
}

export async function exportExcel(req: ExcelExportRequest): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = req.exportedBy ?? "SAP Query Desktop";
  wb.lastModifiedBy = wb.creator;
  wb.created = new Date();
  wb.modified = new Date();
  wb.title = req.title ?? "Export SAP Query";
  wb.company = "SAP Query Desktop";

  const home = wb.addWorksheet("Accueil", {
    properties: { tabColor: { argb: COLORS.accent } },
    views: [{ showGridLines: false, state: "normal" }],
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  home.columns = [
    { width: 2 },
    { width: 32 },
    { width: 22 },
    { width: 20 },
    { width: 14 },
    { width: 48 },
    { width: 4 },
  ];

  home.mergeCells("B2:F4");
  const titleCell = home.getCell("B2");
  titleCell.value = req.title ?? "Export SAP Query";
  titleCell.font = {
    name: "Calibri",
    size: 26,
    bold: true,
    color: { argb: COLORS.headerText },
  };
  titleCell.alignment = {
    vertical: "middle",
    horizontal: "left",
    indent: 2,
  };
  titleCell.fill = {
    type: "gradient",
    gradient: "angle",
    degree: 135,
    stops: [
      { position: 0, color: { argb: COLORS.accent } },
      { position: 1, color: { argb: COLORS.accentDark } },
    ],
  };

  home.mergeCells("B5:F5");
  const sub = home.getCell("B5");
  const exportedOn = new Date().toLocaleString("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  });
  sub.value = `${req.items.length} table${req.items.length > 1 ? "s" : ""} · Exporté le ${exportedOn}${
    req.exportedBy ? ` par ${req.exportedBy}` : ""
  }`;
  sub.font = {
    name: "Calibri",
    size: 10.5,
    italic: true,
    color: { argb: COLORS.mutedText },
  };
  sub.alignment = { vertical: "middle", horizontal: "left", indent: 2 };

  // TOC
  home.getCell("B7").value = "SOMMAIRE";
  home.getCell("B7").font = {
    bold: true,
    size: 13,
    color: { argb: COLORS.accent },
  };
  home.getCell("B7").alignment = { vertical: "middle" };
  home.getRow(7).height = 22;

  const tocHeaderRow = 8;
  const tocLabels = ["Table", "Lignes", "Colonnes", "Description"];
  const tocCols = ["B", "C", "D", "E"];
  tocLabels.forEach((label, i) => {
    const cell = home.getCell(`${tocCols[i]}${tocHeaderRow}`);
    cell.value = label;
    cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.accent },
    };
    cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    cell.border = {
      bottom: { style: "thin", color: { argb: COLORS.accentDark } },
    };
  });
  home.mergeCells(`E${tocHeaderRow}:F${tocHeaderRow}`);
  home.getRow(tocHeaderRow).height = 20;

  const sheetNames: string[] = [];
  const usedNames = new Set<string>(["Accueil"]);
  for (let i = 0; i < req.items.length; i++) {
    let base = sanitizeSheetName(req.items[i].name, i);
    let candidate = base;
    let n = 1;
    while (usedNames.has(candidate)) {
      const suffix = `_${++n}`;
      candidate = base.slice(0, 31 - suffix.length) + suffix;
    }
    usedNames.add(candidate);
    sheetNames.push(candidate);
  }

  req.items.forEach((item, i) => {
    const rowIdx = tocHeaderRow + 1 + i;
    const sheetName = sheetNames[i];
    const link = home.getCell(`B${rowIdx}`);
    link.value = {
      text: `→  ${item.name}`,
      hyperlink: `#'${sheetName}'!A1`,
    };
    link.font = {
      color: { argb: COLORS.accent },
      underline: true,
      bold: true,
    };
    link.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

    home.getCell(`C${rowIdx}`).value = item.rows.length;
    home.getCell(`C${rowIdx}`).numFmt = "#,##0";
    home.getCell(`D${rowIdx}`).value = item.columns.length;

    const desc = home.getCell(`E${rowIdx}`);
    desc.value = item.description ?? "";
    desc.font = { italic: true, color: { argb: COLORS.mutedText } };
    home.mergeCells(`E${rowIdx}:F${rowIdx}`);

    const bandFill = i % 2 === 0 ? null : COLORS.accentSoft;
    if (bandFill) {
      for (const col of ["B", "C", "D", "E", "F"]) {
        home.getCell(`${col}${rowIdx}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bandFill },
        };
      }
    }
    home.getRow(rowIdx).height = 19;
  });

  const allParams = new Map<string, { value: unknown; usedIn: string[] }>();
  for (const item of req.items) {
    for (const [k, v] of Object.entries(item.params ?? {})) {
      const existing = allParams.get(k);
      if (existing) {
        existing.usedIn.push(item.name);
      } else {
        allParams.set(k, { value: v, usedIn: [item.name] });
      }
    }
  }

  const paramsStartRow = tocHeaderRow + 2 + req.items.length + 1;

  if (allParams.size > 0) {
    const titleRow = paramsStartRow;
    home.getCell(`B${titleRow}`).value = "FILTRES APPLIQUÉS · LECTURE SEULE";
    home.getCell(`B${titleRow}`).font = {
      bold: true,
      size: 13,
      color: { argb: COLORS.accent },
    };
    home.getRow(titleRow).height = 22;

    const hintRow = titleRow + 1;
    const hint = home.getCell(`B${hintRow}`);
    hint.value =
      "Modifiez les valeurs ci-dessous pour rafraîchir les feuilles « Vue … » qui se filtrent en direct (Excel 365 / 2021+). Les feuilles de données brutes restent figées au moment de l'export : utilisez-les avec les filtres des entêtes pour tri/filtrage libre. Chaque paramètre est aussi exposé comme nom défini (=Param_Entrepot, =Param_StartDate…) pour vos formules personnelles.";
    hint.font = { italic: true, size: 9.5, color: { argb: COLORS.mutedText } };
    hint.alignment = { wrapText: true, vertical: "top" };
    home.mergeCells(`B${hintRow}:F${hintRow}`);
    home.getRow(hintRow).height = 60;

    const pHead = hintRow + 2;
    const pLabels = ["Variable", "Valeur utilisée", "Utilisée dans"];
    const pCols = ["B", "C", "D"];
    pLabels.forEach((label, i) => {
      const cell = home.getCell(`${pCols[i]}${pHead}`);
      cell.value = label;
      cell.font = { bold: true, color: { argb: COLORS.headerText }, size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.accent },
      };
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    });
    home.mergeCells(`D${pHead}:F${pHead}`);
    home.getRow(pHead).height = 20;

    let pRow = pHead + 1;
    let idx = 0;
    for (const [name, { value, usedIn }] of allParams) {
      const band = idx % 2 === 0 ? "FFFFFFFF" : COLORS.accentSoft;
      idx++;

      const nameCell = home.getCell(`B${pRow}`);
      nameCell.value = `:${name}`;
      nameCell.font = {
        bold: true,
        color: { argb: COLORS.accentDark },
        name: "Consolas",
        size: 10.5,
      };
      nameCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: band },
      };
      nameCell.alignment = {
        vertical: "middle",
        horizontal: "left",
        indent: 1,
      };
      nameCell.border = {
        bottom: { style: "hair", color: { argb: COLORS.line } },
      };

      const valueCell = home.getCell(`C${pRow}`);
      valueCell.value = value as ExcelJS.CellValue;
      valueCell.font = {
        size: 11,
        bold: true,
        color: { argb: COLORS.bodyText },
      };
      valueCell.alignment = {
        vertical: "middle",
        horizontal: "left",
        indent: 1,
      };
      valueCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: band },
      };
      valueCell.border = {
        bottom: { style: "hair", color: { argb: COLORS.line } },
      };

      const useCell = home.getCell(`D${pRow}`);
      useCell.value = usedIn.join(", ");
      useCell.font = { italic: true, color: { argb: COLORS.mutedText } };
      useCell.alignment = {
        vertical: "middle",
        horizontal: "left",
        indent: 1,
        wrapText: true,
      };
      useCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: band },
      };
      useCell.border = {
        bottom: { style: "hair", color: { argb: COLORS.line } },
      };
      home.mergeCells(`D${pRow}:F${pRow}`);
      home.getRow(pRow).height = 22;

      // Named cell so users can reference this parameter from any formula
      // (e.g. =Param_Entrepot). Name must start with a letter and contain
      // no spaces or special characters; we sanitize.
      const safeName = `Param_${String(name).replace(/[^A-Za-z0-9_]/g, "_")}`;
      try {
        wb.definedNames.add(`Accueil!$C$${pRow}`, safeName);
      } catch {
        /* ignore name conflicts */
      }

      pRow++;
    }
  }

  home.views = [
    {
      showGridLines: false,
      state: "frozen",
      xSplit: 0,
      ySplit: 6,
    },
  ];

  req.items.forEach((item, idx) => {
    const sheetName = sheetNames[idx];
    const ws = wb.addWorksheet(sheetName, {
      properties: { tabColor: { argb: COLORS.accentLight } },
      views: [
        {
          state: "frozen",
          ySplit: 4,
          showGridLines: false,
          zoomScale: 100,
        },
      ],
    });

    const colCount = item.columns.length;
    const endColLetter = columnLetter(colCount);

    // --- TITLE BANNER (rows 1-2) ---
    ws.mergeCells(`A1:${endColLetter}2`);
    const banner = ws.getCell("A1");
    banner.value = item.name;
    banner.font = {
      name: "Calibri",
      size: 18,
      bold: true,
      color: { argb: COLORS.headerText },
    };
    banner.alignment = {
      vertical: "middle",
      horizontal: "left",
      indent: 2,
    };
    banner.fill = {
      type: "gradient",
      gradient: "angle",
      degree: 135,
      stops: [
        { position: 0, color: { argb: COLORS.accent } },
        { position: 1, color: { argb: COLORS.accentDark } },
      ],
    };
    ws.getRow(1).height = 22;
    ws.getRow(2).height = 22;

    // --- KPI STRIP (row 3) ---
    const samples: unknown[][] = item.columns.map(() => []);
    for (const r of item.rows.slice(0, 500)) {
      item.columns.forEach((c, i) => samples[i].push(r[c.name]));
    }

    const numericIdxs: number[] = [];
    const aggregatableIdxs: number[] = [];
    item.columns.forEach((c, i) => {
      if (c.type === "number") {
        numericIdxs.push(i);
        if (shouldAggregate(c.name, samples[i])) aggregatableIdxs.push(i);
      }
    });

    const kpiBlocks: Array<{
      label: string;
      value: string | number;
      tone: "violet" | "cyan" | "green" | "amber";
    }> = [
      {
        label: "LIGNES",
        value: item.rows.length,
        tone: "violet",
      },
      {
        label: "COLONNES",
        value: colCount,
        tone: "cyan",
      },
    ];

    if (aggregatableIdxs.length > 0) {
      const firstNumIdx = aggregatableIdxs[0];
      const firstNumCol = item.columns[firstNumIdx];
      let sum = 0;
      for (const r of item.rows) {
        const v = Number(r[firstNumCol.name]);
        if (Number.isFinite(v)) sum += v;
      }
      kpiBlocks.push({
        label: `Σ ${firstNumCol.name.toUpperCase()}`.slice(0, 24),
        value: sum,
        tone: "green",
      });
      if (item.rows.length > 0) {
        kpiBlocks.push({
          label: `MOY ${firstNumCol.name.toUpperCase()}`.slice(0, 24),
          value: sum / item.rows.length,
          tone: "amber",
        });
      }
    }

    const kpiToneColor: Record<string, string> = {
      violet: "FFEDE8FF",
      cyan: "FFDFF7FB",
      green: "FFDCFCE7",
      amber: "FFFFF4D6",
    };
    const kpiToneDark: Record<string, string> = {
      violet: COLORS.accent,
      cyan: "FF0891B2",
      green: "FF059669",
      amber: "FFB45309",
    };

    // Clamp number of KPI blocks to the number of columns (avoid merging past
    // the end of the sheet, which makes Excel reject cell-merge afterwards).
    const usableBlocks = kpiBlocks.slice(0, Math.max(1, colCount));
    const baseWidth = Math.max(1, Math.floor(colCount / usableBlocks.length));
    const remainder = colCount - baseWidth * usableBlocks.length;
    ws.getRow(3).height = 44;
    let currentCol = 1;
    usableBlocks.forEach((kpi, i) => {
      const extra = i < remainder ? 1 : 0;
      const width = baseWidth + extra;
      const endCol = Math.min(colCount, currentCol + width - 1);
      const startLetter = columnLetter(currentCol);
      const endLetter = columnLetter(endCol);
      if (endCol > currentCol) {
        ws.mergeCells(`${startLetter}3:${endLetter}3`);
      }
      const cell = ws.getCell(`${startLetter}3`);
      const formatted =
        typeof kpi.value === "number"
          ? Number.isInteger(kpi.value)
            ? kpi.value.toLocaleString("fr-FR")
            : kpi.value.toLocaleString("fr-FR", {
                maximumFractionDigits: 2,
              })
          : kpi.value;
      cell.value = `${kpi.label}\n${formatted}`;
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        indent: 2,
        wrapText: true,
      };
      cell.font = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: kpiToneDark[kpi.tone] },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: kpiToneColor[kpi.tone] },
      };
      cell.border = {
        left: { style: "thick", color: { argb: kpiToneDark[kpi.tone] } },
      };
      currentCol = endCol + 1;
      if (currentCol > colCount) return;
    });

    // --- REAL EXCEL TABLE (ListObject) from row 4 onward ---
    // Gives users native column filter dropdowns, sort, a totals row with
    // per-column aggregation switcher, and structured references (Table[Col]).
    const headerRowIdx = 4;
    const dataStart = headerRowIdx + 1;
    const dataEnd = dataStart + Math.max(0, item.rows.length - 1);
    const hasTotals = item.rows.length > 0 && aggregatableIdxs.length > 0;
    const formats = item.columns.map((c, i) => numFmtFor(c.type, samples[i]));

    const tableData = item.rows.map((r) =>
      item.columns.map(
        (c) =>
          coerceCellValue(r[c.name], c.type) as unknown as ExcelJS.CellValue,
      ),
    );

    const aggSet = new Set(aggregatableIdxs);
    const tableName = `tbl_${(idx + 1).toString().padStart(2, "0")}`;

    let tableCreated = false;
    try {
      ws.addTable({
        name: tableName,
        displayName: tableName,
        ref: `A${headerRowIdx}`,
        headerRow: true,
        totalsRow: hasTotals,
        style: {
          theme: "TableStyleLight1",
          showRowStripes: true,
          showFirstColumn: false,
        },
        columns: item.columns.map((col, i) => ({
          name: col.name,
          filterButton: true,
          totalsRowLabel:
            hasTotals && i === 0
              ? `TOTAL (${item.rows.length.toLocaleString("fr-FR")} lignes)`
              : undefined,
          totalsRowFunction: aggSet.has(i) ? "sum" : "none",
        })) as ExcelJS.TableColumnProperties[],
        rows: tableData as unknown as unknown[][],
      });
      tableCreated = true;
    } catch {
      // Fallback: write rows manually + autoFilter so the export never fails.
      for (let ri = 0; ri < item.rows.length; ri++) {
        const rowRef = ws.getRow(dataStart + ri);
        item.columns.forEach((col, ci) => {
          rowRef.getCell(ci + 1).value = coerceCellValue(
            item.rows[ri][col.name],
            col.type,
          ) as ExcelJS.CellValue;
        });
      }
      ws.autoFilter = {
        from: { row: headerRowIdx, column: 1 },
        to: { row: Math.max(dataEnd, headerRowIdx), column: colCount },
      };
    }

    // --- Header row styling (violet gradient, white bold) ---
    const headerRow = ws.getRow(headerRowIdx);
    headerRow.height = 26;
    item.columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = col.name;
      cell.font = {
        bold: true,
        color: { argb: COLORS.headerText },
        size: 11,
      };
      cell.fill = {
        type: "gradient",
        gradient: "angle",
        degree: 90,
        stops: [
          { position: 0, color: { argb: COLORS.accent } },
          { position: 1, color: { argb: COLORS.accentDark } },
        ],
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: col.type === "number" ? "right" : "left",
        indent: 1,
      };
      cell.border = {
        top: { style: "medium", color: { argb: COLORS.accentDark } },
        bottom: { style: "medium", color: { argb: COLORS.accentDark } },
        right: { style: "thin", color: { argb: COLORS.accentLight } },
      };
    });

    // --- Data rows: numeric/date formats + alignment + bold first column ---
    for (let r = dataStart; r <= dataEnd; r++) {
      const rowRef = ws.getRow(r);
      rowRef.height = 18;
      item.columns.forEach((col, ci) => {
        const cell = rowRef.getCell(ci + 1);
        cell.numFmt = formats[ci];
        cell.alignment = {
          vertical: "middle",
          horizontal: col.type === "number" ? "right" : "left",
          indent: 1,
        };
        cell.font = {
          size: 10.5,
          color: { argb: COLORS.bodyText },
          bold: ci === 0,
        };
      });
    }

    // --- Totals row styling (dark accent bar) ---
    if (hasTotals && tableCreated) {
      const totalsRowIdx = dataEnd + 1;
      const trow = ws.getRow(totalsRowIdx);
      trow.height = 24;
      item.columns.forEach((col, ci) => {
        const cell = trow.getCell(ci + 1);
        cell.font = {
          bold: true,
          color: { argb: COLORS.headerText },
          size: 10.5,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: COLORS.accentDark },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: col.type === "number" ? "right" : "left",
          indent: 1,
        };
        cell.border = {
          top: { style: "medium", color: { argb: COLORS.accent } },
        };
        if (aggSet.has(ci)) cell.numFmt = formats[ci];
      });
    }

    // --- Data bars on aggregatable numeric columns only ---
    if (dataEnd >= dataStart) {
      for (const nIdx of aggregatableIdxs) {
        const colL = columnLetter(nIdx + 1);
        const range = `${colL}${dataStart}:${colL}${dataEnd}`;
        try {
          ws.addConditionalFormatting({
            ref: range,
            rules: [
              {
                type: "dataBar",
                priority: 1,
                cfvo: [{ type: "min" }, { type: "max" }],
                color: { argb: "FFB9A5FF" },
                gradient: true,
                showValue: true,
              } as unknown as ExcelJS.ConditionalFormattingRule,
            ],
          });
        } catch {
          // ignore if dataBar not supported
        }
      }
    }

    // --- COLUMN WIDTHS ---
    ws.columns.forEach((col, i) => {
      const colDef = item.columns[i];
      if (!colDef) return;
      let maxLen = colDef.name.length + 3;
      const sample = samples[i] ?? [];
      for (const v of sample.slice(0, 100)) {
        if (v == null) continue;
        const s =
          v instanceof Date
            ? v.toISOString().slice(0, 16)
            : typeof v === "number"
              ? String(Math.round(v))
              : String(v);
        if (s.length > maxLen) maxLen = s.length;
      }
      col.width = Math.min(48, Math.max(14, maxLen + 2));
    });

    // --- SQL NOTE ---
    if (item.sql) {
      const noteRow = dataEnd + (hasTotals ? 1 : 0) + 2;
      const sqlCell = ws.getCell(`A${noteRow}`);
      sqlCell.value = `Requête source: ${item.sql.replace(/\s+/g, " ").trim().slice(0, 500)}`;
      sqlCell.font = {
        italic: true,
        size: 9,
        color: { argb: COLORS.mutedText },
      };
      sqlCell.alignment = { wrapText: true, vertical: "top" };
      ws.mergeCells(`A${noteRow}:${endColLetter}${noteRow}`);
    }

    // --- COMPANION "VUE" SHEET with live FILTER() formula ---
    // If the template defines filterColumn/filterOperator per variable, we
    // generate a second sheet that re-filters the Excel Table live based on
    // the Accueil named cells. Change a date on Accueil → this view updates.
    // Requires Excel 365 / 2021+ for FILTER(). Older versions show #NAME?.
    if (
      tableCreated &&
      item.rows.length > 0 &&
      item.filters &&
      item.filters.length > 0
    ) {
      const colsByName = new Set(item.columns.map((c) => c.name));
      const usableFilters = item.filters.filter(
        (f) => colsByName.has(f.column) && allParams.has(f.paramName),
      );
      if (usableFilters.length > 0) {
        const vueName = sanitizeSheetName(`Vue ${item.name}`.slice(0, 28), idx);
        let safeVueName = vueName;
        let n = 1;
        while (usedNames.has(safeVueName)) {
          const suffix = `_${++n}`;
          safeVueName = vueName.slice(0, 31 - suffix.length) + suffix;
        }
        usedNames.add(safeVueName);

        const vue = wb.addWorksheet(safeVueName, {
          properties: { tabColor: { argb: COLORS.accentDark } },
          views: [
            { state: "frozen", ySplit: 4, showGridLines: false, zoomScale: 100 },
          ],
        });

        // Banner rows 1-2
        vue.mergeCells(`A1:${endColLetter}2`);
        const vBanner = vue.getCell("A1");
        vBanner.value = `Vue interactive — ${item.name}`;
        vBanner.font = {
          name: "Calibri",
          size: 18,
          bold: true,
          color: { argb: COLORS.headerText },
        };
        vBanner.alignment = {
          vertical: "middle",
          horizontal: "left",
          indent: 2,
        };
        vBanner.fill = {
          type: "gradient",
          gradient: "angle",
          degree: 135,
          stops: [
            { position: 0, color: { argb: COLORS.accent } },
            { position: 1, color: { argb: COLORS.accentDark } },
          ],
        };
        vue.getRow(1).height = 22;
        vue.getRow(2).height = 22;

        // Hint row 3
        vue.mergeCells(`A3:${endColLetter}3`);
        const vHint = vue.getCell("A3");
        vHint.value =
          "Modifiez les valeurs sur la feuille « Accueil » — cette vue se rafraîchit toute seule. (Excel 365 / 2021+)";
        vHint.font = {
          italic: true,
          size: 10,
          color: { argb: COLORS.mutedText },
        };
        vHint.alignment = {
          vertical: "middle",
          horizontal: "left",
          indent: 2,
        };
        vue.getRow(3).height = 22;

        // Header row 4
        const vHead = vue.getRow(4);
        vHead.height = 26;
        item.columns.forEach((col, i) => {
          const cell = vHead.getCell(i + 1);
          cell.value = col.name;
          cell.font = {
            bold: true,
            color: { argb: COLORS.headerText },
            size: 11,
          };
          cell.fill = {
            type: "gradient",
            gradient: "angle",
            degree: 90,
            stops: [
              { position: 0, color: { argb: COLORS.accent } },
              { position: 1, color: { argb: COLORS.accentDark } },
            ],
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: col.type === "number" ? "right" : "left",
            indent: 1,
          };
        });

        // Build FILTER formula from mappings
        const conds: string[] = [];
        for (const f of usableFilters) {
          const pName = `Param_${f.paramName.replace(/[^A-Za-z0-9_]/g, "_")}`;
          const colRef = `${tableName}[${f.column}]`;
          switch (f.operator) {
            case "eq":
              conds.push(`(${colRef}=${pName})`);
              break;
            case "likeOrAll":
              conds.push(`((${pName}="*")+(${colRef}=${pName}))`);
              break;
            case "gte":
              conds.push(`(${colRef}>=${pName})`);
              break;
            case "lte":
              conds.push(`(${colRef}<=${pName})`);
              break;
          }
        }
        const filterExpr = conds.join("*");
        const formula = `IFERROR(FILTER(${tableName},${filterExpr}),"Aucun résultat pour ces filtres")`;
        vue.getCell("A5").value = {
          formula,
          result: "",
        } as ExcelJS.CellFormulaValue;

        // Apply per-column number format + alignment so spilled values render well
        item.columns.forEach((col, i) => {
          const column = vue.getColumn(i + 1);
          column.numFmt = formats[i];
          column.alignment = {
            vertical: "middle",
            horizontal: col.type === "number" ? "right" : "left",
            indent: 1,
          };
          let maxLen = col.name.length + 3;
          const sample = samples[i] ?? [];
          for (const v of sample.slice(0, 100)) {
            if (v == null) continue;
            const s =
              v instanceof Date
                ? v.toISOString().slice(0, 16)
                : typeof v === "number"
                  ? String(Math.round(v))
                  : String(v);
            if (s.length > maxLen) maxLen = s.length;
          }
          column.width = Math.min(48, Math.max(14, maxLen + 2));
        });

        // Add Vue to Home TOC (one more row below the data TOC entry)
      }
    }
  });

  await wb.xlsx.writeFile(req.filePath);
}
