import ExcelJS from "exceljs";

type ColumnType = "number" | "date" | "boolean" | "string";

type ColumnMeta = {
  name: string;
  type: ColumnType;
};

export type ExcelExportItem = {
  name: string;
  description?: string;
  sql: string;
  params: Record<string, unknown>;
  columns: ColumnMeta[];
  rows: Record<string, unknown>[];
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
    home.getCell(`B${titleRow}`).value = "PARAMÈTRES";
    home.getCell(`B${titleRow}`).font = {
      bold: true,
      size: 13,
      color: { argb: COLORS.accent },
    };
    home.getRow(titleRow).height = 22;

    const hintRow = titleRow + 1;
    const hint = home.getCell(`B${hintRow}`);
    hint.value =
      "Les cellules jaunes sont les valeurs utilisées au moment de l'export. Modifiez-les pour documenter un nouveau contexte — pour re-exécuter la requête avec d'autres paramètres, utilisez l'application.";
    hint.font = { italic: true, size: 9.5, color: { argb: COLORS.mutedText } };
    hint.alignment = { wrapText: true, vertical: "top" };
    home.mergeCells(`B${hintRow}:F${hintRow}`);
    home.getRow(hintRow).height = 32;

    const pHead = hintRow + 2;
    const pLabels = ["Variable", "Valeur", "Utilisée dans"];
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
    for (const [name, { value, usedIn }] of allParams) {
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
        fgColor: { argb: COLORS.paramLabelBg },
      };
      nameCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      nameCell.border = {
        top: { style: "thin", color: { argb: COLORS.line } },
        bottom: { style: "thin", color: { argb: COLORS.line } },
      };

      const valueCell = home.getCell(`C${pRow}`);
      valueCell.value = value as ExcelJS.CellValue;
      valueCell.font = { size: 11, bold: true, color: { argb: COLORS.bodyText } };
      valueCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      valueCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: COLORS.paramBg },
      };
      valueCell.border = {
        top: { style: "medium", color: { argb: COLORS.paramBorder } },
        left: { style: "medium", color: { argb: COLORS.paramBorder } },
        bottom: { style: "medium", color: { argb: COLORS.paramBorder } },
        right: { style: "medium", color: { argb: COLORS.paramBorder } },
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
      home.mergeCells(`D${pRow}:F${pRow}`);

      home.getRow(pRow).height = 24;
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
          xSplit: 1,
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
    item.columns.forEach((c, i) => {
      if (c.type === "number") numericIdxs.push(i);
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

    if (numericIdxs.length > 0) {
      const firstNumIdx = numericIdxs[0];
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

    const kpiWidth = Math.max(2, Math.floor(colCount / kpiBlocks.length));
    ws.getRow(3).height = 44;
    let currentCol = 1;
    kpiBlocks.forEach((kpi, i) => {
      const isLast = i === kpiBlocks.length - 1;
      const endCol = isLast ? colCount : currentCol + kpiWidth - 1;
      const startLetter = columnLetter(currentCol);
      const endLetter = columnLetter(endCol);
      ws.mergeCells(`${startLetter}3:${endLetter}3`);
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
    });

    // --- HEADER ROW (row 4) ---
    const headerRowIdx = 4;
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

    // --- DATA ROWS ---
    const formats = item.columns.map((c, i) => numFmtFor(c.type, samples[i]));

    const dataStart = headerRowIdx + 1;
    item.rows.forEach((r, ri) => {
      const rowRef = ws.getRow(dataStart + ri);
      rowRef.height = 18;
      const bandFill = ri % 2 === 0 ? "FFFFFFFF" : COLORS.bandRow;
      item.columns.forEach((col, ci) => {
        const cell = rowRef.getCell(ci + 1);
        cell.value = coerceCellValue(r[col.name], col.type) as ExcelJS.CellValue;
        cell.numFmt = formats[ci];
        cell.alignment = {
          vertical: "middle",
          horizontal: col.type === "number" ? "right" : "left",
          indent: 1,
        };
        cell.font = { size: 10.5, color: { argb: COLORS.bodyText } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bandFill },
        };
        cell.border = {
          bottom: { style: "hair", color: { argb: COLORS.line } },
          right:
            ci === 0
              ? { style: "thin", color: { argb: COLORS.accentLight } }
              : undefined,
        };
        if (ci === 0) {
          cell.font = {
            size: 10.5,
            color: { argb: COLORS.bodyText },
            bold: true,
          };
        }
      });
    });

    const dataEnd = dataStart + item.rows.length - 1;

    // --- TOTALS ROW ---
    const totalsRowIdx = dataEnd + 1;
    const totalsRow = ws.getRow(totalsRowIdx);
    totalsRow.height = 24;
    item.columns.forEach((col, ci) => {
      const cell = totalsRow.getCell(ci + 1);
      if (ci === 0) {
        cell.value = `TOTAL (${item.rows.length.toLocaleString("fr-FR")} lignes)`;
        cell.font = {
          bold: true,
          color: { argb: COLORS.headerText },
          size: 10.5,
        };
      } else if (col.type === "number" && item.rows.length > 0) {
        const colLetter = columnLetter(ci + 1);
        cell.value = {
          formula: `SUM(${colLetter}${dataStart}:${colLetter}${dataEnd})`,
        } as ExcelJS.CellFormulaValue;
        cell.numFmt = formats[ci];
        cell.font = {
          bold: true,
          color: { argb: COLORS.headerText },
          size: 10.5,
        };
      } else {
        cell.font = { color: { argb: COLORS.headerText } };
      }
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
    });

    // --- DATA BARS on numeric columns ---
    if (dataEnd >= dataStart) {
      for (const nIdx of numericIdxs) {
        const colL = columnLetter(nIdx + 1);
        const range = `${colL}${dataStart}:${colL}${dataEnd}`;
        try {
          ws.addConditionalFormatting({
            ref: range,
            rules: [
              {
                type: "dataBar",
                priority: 1,
                cfvo: [
                  { type: "min" },
                  { type: "max" },
                ],
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

    // --- AUTO FILTER ---
    ws.autoFilter = {
      from: { row: headerRowIdx, column: 1 },
      to: { row: totalsRowIdx - 1 >= headerRowIdx ? dataEnd : headerRowIdx, column: colCount },
    };

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
      const noteRow = totalsRowIdx + 2;
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
  });

  await wb.xlsx.writeFile(req.filePath);
}
