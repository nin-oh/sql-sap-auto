import { useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Search,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { useAppStore } from "../store/appStore";
import type { ColumnMeta } from "../lib/types";
import { cn } from "../lib/cn";

function formatCell(value: unknown, type: ColumnMeta["type"]): string {
  if (value === null || value === undefined) return "—";
  if (type === "date") {
    const d = value instanceof Date ? value : new Date(String(value));
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 19).replace("T", " ");
    }
  }
  if (type === "number" && typeof value === "number") {
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 4,
    });
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const LARGE_RESULT_WARN = 50_000;

export function ResultsTable() {
  const rows = useAppStore((s) => s.rows);
  const columns = useAppStore((s) => s.columns);
  const dense = useAppStore((s) => s.denseTable);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const cols = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      columns.map((c) => ({
        id: c.name,
        accessorKey: c.name,
        header: c.name,
        cell: (info) => {
          const raw = info.getValue();
          const v = formatCell(raw, c.type);
          return (
            <span
              className={cn(
                "block",
                c.type === "number" &&
                  "tabular-nums text-right font-mono text-[12px]",
                raw == null && "text-muted italic",
              )}
              title={v}
            >
              {v}
            </span>
          );
        },
      })),
    [columns],
  );

  const table = useReactTable({
    data: rows,
    columns: cols,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _colId, filterValue) => {
      if (!filterValue) return true;
      const q = String(filterValue).toLowerCase();
      for (const v of Object.values(row.original as object)) {
        if (v == null) continue;
        if (String(v).toLowerCase().includes(q)) return true;
      }
      return false;
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const allRows = table.getRowModel().rows;

  const rowHeight = dense ? 28 : 34;
  const virtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualItems.length ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length
    ? totalSize - virtualItems[virtualItems.length - 1].end
    : 0;

  const exportCsv = async () => {
    await window.sap.exportCsv(
      table.getFilteredRowModel().rows.map((r) => r.original),
      columns.map((c) => c.name),
    );
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted">
        <div className="size-14 rounded-full border border-border flex items-center justify-center mb-3">
          <Search className="size-5" />
        </div>
        <p className="text-sm">Aucun résultat à afficher.</p>
        <p className="text-xs mt-1">
          Exécutez une requête pour voir les données ici.
        </p>
      </div>
    );
  }

  const cellPaddingY = dense ? "py-1" : "py-1.5";
  const cellTextSize = dense ? "text-[11.5px]" : "text-[12.5px]";

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between gap-3 pb-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <Input
              className="pl-9"
              placeholder="Filtrer dans les résultats..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">
            {table.getFilteredRowModel().rows.length.toLocaleString()} lignes
          </span>
          <Button size="sm" onClick={exportCsv}>
            <Download className="size-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {rows.length > LARGE_RESULT_WARN && (
        <div className="mb-2 flex items-center gap-2 p-2.5 rounded-lg bg-warn/5 border border-warn/20 text-[11.5px] text-slate-200">
          <AlertTriangle className="size-4 text-warn flex-shrink-0" />
          <span>
            Grand volume :{" "}
            <span className="font-semibold text-warn">
              {rows.length.toLocaleString()}
            </span>{" "}
            lignes. L'affichage reste fluide grâce à la virtualisation, mais
            ajoutez <code className="bg-white/5 px-1 rounded">TOP N</code> ou
            filtrez par date pour des résultats plus rapides.
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto rounded-xl border border-border bg-bg-soft/60 relative"
      >
        <table
          className={cn(
            "min-w-full border-separate border-spacing-0",
            cellTextSize,
          )}
        >
          <thead className="sticky top-0 z-20">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                <th
                  className={cn(
                    "sticky left-0 z-30 w-12 text-center font-semibold text-muted bg-bg-panel/95 backdrop-blur-md border-b border-r border-border px-2",
                    dense ? "py-1.5" : "py-2",
                  )}
                >
                  #
                </th>
                {hg.headers.map((h) => {
                  const sort = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className={cn(
                        "text-left font-semibold text-slate-200 bg-bg-panel/95 backdrop-blur-md border-b border-border cursor-pointer select-none hover:bg-accent/5 transition",
                        dense ? "px-2.5 py-1.5" : "px-3 py-2",
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="uppercase tracking-wide text-[10.5px]">
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                        </span>
                        {sort === "asc" ? (
                          <ArrowUp className="size-3 text-accent-glow" />
                        ) : sort === "desc" ? (
                          <ArrowDown className="size-3 text-accent-glow" />
                        ) : (
                          <ArrowUpDown className="size-3 text-muted/60" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  style={{ height: paddingTop }}
                />
              </tr>
            )}
            {virtualItems.map((vi) => {
              const row = allRows[vi.index];
              if (!row) return null;
              const zebra = vi.index % 2 === 1;
              const abs = vi.index + 1;
              return (
                <tr
                  key={row.id}
                  data-index={vi.index}
                  className={cn(
                    "group transition",
                    zebra && "bg-white/[0.012]",
                    "hover:bg-accent/[0.08]",
                  )}
                  style={{ height: rowHeight }}
                >
                  <td
                    className={cn(
                      "sticky left-0 z-10 w-12 text-center text-[10.5px] font-mono tabular-nums text-muted border-b border-r border-border/60 bg-bg-panel/80 backdrop-blur group-hover:bg-accent/10 group-hover:text-accent-glow transition",
                      "px-2",
                    )}
                  >
                    {abs}
                  </td>
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "text-slate-200 max-w-[360px] truncate border-b border-border/60",
                        cellPaddingY,
                        dense ? "px-2.5" : "px-3",
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  style={{ height: paddingBottom }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-3 text-[11px] text-muted">
        <span>
          Affichage virtualisé ·{" "}
          {table.getFilteredRowModel().rows.length.toLocaleString()} lignes
          chargées
        </span>
        <span>Cliquez sur un entête pour trier · défilement pour parcourir</span>
      </div>
    </div>
  );
}
