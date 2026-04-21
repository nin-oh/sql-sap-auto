import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { cn } from "../lib/cn";

type ChartType = "bar" | "line" | "pie";

const PALETTE = [
  "#7c5cff",
  "#34d399",
  "#f59e0b",
  "#60a5fa",
  "#f472b6",
  "#22d3ee",
  "#fb7185",
  "#a78bfa",
];

export function ChartView() {
  const rows = useAppStore((s) => s.rows);
  const columns = useAppStore((s) => s.columns);

  const numericCols = useMemo(
    () => columns.filter((c) => c.type === "number").map((c) => c.name),
    [columns],
  );
  const categoricalCols = useMemo(
    () =>
      columns
        .filter((c) => c.type !== "number")
        .map((c) => c.name),
    [columns],
  );

  const [type, setType] = useState<ChartType>("bar");
  const [xKey, setXKey] = useState<string>(categoricalCols[0] ?? columns[0]?.name ?? "");
  const [yKey, setYKey] = useState<string>(numericCols[0] ?? "");

  const data = useMemo(() => {
    if (!xKey || !yKey) return [];
    if (type === "pie") {
      const agg = new Map<string, number>();
      for (const r of rows) {
        const k = String(r[xKey] ?? "—");
        const v = Number(r[yKey] ?? 0);
        agg.set(k, (agg.get(k) ?? 0) + (Number.isFinite(v) ? v : 0));
      }
      return Array.from(agg.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 12);
    }
    return rows.slice(0, 500).map((r) => ({
      [xKey]: r[xKey],
      [yKey]: Number(r[yKey] ?? 0),
    }));
  }, [rows, xKey, yKey, type]);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted">
        <BarChart3 className="size-6 mb-2" />
        <p className="text-sm">Exécutez une requête pour visualiser les données.</p>
      </div>
    );
  }

  if (numericCols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted">
        <p className="text-sm">Aucune colonne numérique détectée pour tracer un graphique.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 flex-wrap pb-3">
        <div className="flex items-center gap-1 bg-bg-soft border border-border rounded-lg p-1">
          {(
            [
              { t: "bar", icon: BarChart3, label: "Barres" },
              { t: "line", icon: LineIcon, label: "Lignes" },
              { t: "pie", icon: PieIcon, label: "Camembert" },
            ] as const
          ).map(({ t, icon: Icon, label }) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition",
                type === t
                  ? "bg-accent/20 text-accent-glow"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted">
            Axe X
          </span>
          <select
            value={xKey}
            onChange={(e) => setXKey(e.target.value)}
            className="bg-bg-soft border border-border rounded-md text-xs px-2 py-1.5 text-slate-200"
          >
            {columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted">
            Valeur
          </span>
          <select
            value={yKey}
            onChange={(e) => setYKey(e.target.value)}
            className="bg-bg-soft border border-border rounded-md text-xs px-2 py-1.5 text-slate-200"
          >
            {numericCols.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-border bg-bg-soft/40 p-3">
        <ResponsiveContainer width="100%" height="100%">
          {type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
              <XAxis dataKey={xKey} stroke="#8a92a6" fontSize={11} />
              <YAxis stroke="#8a92a6" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#141824",
                  border: "1px solid #1f2637",
                  borderRadius: 8,
                  color: "#e5e7eb",
                }}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              <Bar dataKey={yKey} fill="#7c5cff" radius={[6, 6, 0, 0]} />
            </BarChart>
          ) : type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
              <XAxis dataKey={xKey} stroke="#8a92a6" fontSize={11} />
              <YAxis stroke="#8a92a6" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#141824",
                  border: "1px solid #1f2637",
                  borderRadius: 8,
                  color: "#e5e7eb",
                }}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke="#7c5cff"
                strokeWidth={2}
                dot={{ fill: "#9a82ff", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          ) : (
            <PieChart>
              <Tooltip
                contentStyle={{
                  background: "#141824",
                  border: "1px solid #1f2637",
                  borderRadius: 8,
                  color: "#e5e7eb",
                }}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={130}
                paddingAngle={2}
                label
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
