import type { ColumnMeta } from "../lib/types";

export function SkeletonRows({
  columns,
  rows = 14,
}: {
  columns: ColumnMeta[];
  rows?: number;
}) {
  if (columns.length === 0) {
    return (
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-bg-soft/60 p-4 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-4 rounded shimmer" />
        ))}
      </div>
    );
  }
  return (
    <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-border bg-bg-soft/60">
      <table className="min-w-full text-[12.5px]">
        <thead className="sticky top-0 bg-bg-panel/95 backdrop-blur-md">
          <tr>
            <th className="w-12 border-b border-r border-border px-2 py-2.5 text-center text-muted font-semibold">
              #
            </th>
            {columns.map((c, i) => (
              <th
                key={i}
                className="text-left font-semibold text-slate-300 border-b border-border px-3 py-2.5"
              >
                <span className="uppercase tracking-wide text-[10.5px]">
                  {c.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => {
            const widths = ["w-12", "w-20", "w-32", "w-24", "w-28", "w-16"];
            return (
              <tr
                key={i}
                className={i % 2 ? "bg-white/[0.012]" : undefined}
              >
                <td className="w-12 border-b border-r border-border/60 px-2 py-2">
                  <div className="h-3 w-6 mx-auto rounded shimmer" />
                </td>
                {columns.map((_, j) => (
                  <td
                    key={j}
                    className="border-b border-border/60 px-3 py-2"
                  >
                    <div
                      className={`h-3 ${widths[(i + j) % widths.length]} rounded shimmer`}
                      style={{ opacity: 0.8 - i * 0.02 }}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
