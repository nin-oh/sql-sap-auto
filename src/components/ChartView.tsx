import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
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
import {
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  AreaChart as AreaIcon,
} from "lucide-react";
import { useAppStore } from "../store/appStore";
import { cn } from "../lib/cn";

type ChartType = "bar" | "line" | "area" | "pie";

const PALETTE = [
  "#7c5cff",
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#60a5fa",
  "#fb7185",
  "#a78bfa",
];

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "rgba(20, 24, 36, 0.92)",
  border: "1px solid rgba(124,92,255,0.25)",
  borderRadius: 10,
  color: "#e5e7eb",
  boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
  fontSize: 12,
  padding: "8px 10px",
};

export function ChartView() {
  const rows = useAppStore((s) => s.rows);
  const columns = useAppStore((s) => s.columns);

  const numericCols = useMemo(
    () => columns.filter((c) => c.type === "number").map((c) => c.name),
    [columns],
  );
  const categoricalCols = useMemo(
    () => columns.filter((c) => c.type !== "number").map((c) => c.name),
    [columns],
  );

  const [type, setType] = useState<ChartType>("area");
  const [xKey, setXKey] = useState<string>(
    categoricalCols[0] ?? columns[0]?.name ?? "",
  );
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
        <p className="text-sm">
          Exécutez une requête pour visualiser les données.
        </p>
      </div>
    );
  }

  if (numericCols.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted">
        <p className="text-sm">
          Aucune colonne numérique détectée pour tracer un graphique.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 flex-wrap pb-3">
        <div className="flex items-center gap-1 bg-bg-soft border border-border rounded-lg p-1">
          {(
            [
              { t: "area", icon: AreaIcon, label: "Aire" },
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
                  ? "bg-accent/20 text-accent-glow shadow-[0_0_0_1px_rgba(124,92,255,0.3)_inset]"
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
            className="bg-bg-soft border border-border rounded-md text-xs px-2 py-1.5 text-slate-200 hover:border-border-soft transition"
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
            className="bg-bg-soft border border-border rounded-md text-xs px-2 py-1.5 text-slate-200 hover:border-border-soft transition"
          >
            {numericCols.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-border bg-bg-soft/40 p-3 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 size-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-64 rounded-full bg-cyan/10 blur-3xl pointer-events-none" />
        <ResponsiveContainer width="100%" height="100%">
          {type === "area" ? (
            <AreaChart
              data={data}
              margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
            >
              <defs>
                <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#7c5cff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
              <XAxis dataKey={xKey} stroke="#8a92a6" fontSize={11} />
              <YAxis stroke="#8a92a6" fontSize={11} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ stroke: "#7c5cff", strokeOpacity: 0.3 }}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke="#9a82ff"
                strokeWidth={2.5}
                fill="url(#gradArea)"
                activeDot={{
                  r: 5,
                  fill: "#fff",
                  stroke: "#7c5cff",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          ) : type === "bar" ? (
            <BarChart
              data={data}
              margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
            >
              <defs>
                <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9a82ff" stopOpacity={1} />
                  <stop offset="100%" stopColor="#6b4ff0" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
              <XAxis dataKey={xKey} stroke="#8a92a6" fontSize={11} />
              <YAxis stroke="#8a92a6" fontSize={11} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: "rgba(124,92,255,0.08)" }}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              <Bar
                dataKey={yKey}
                fill="url(#gradBar)"
                radius={[8, 8, 0, 0]}
                animationDuration={600}
              />
            </BarChart>
          ) : type === "line" ? (
            <LineChart
              data={data}
              margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
              <XAxis dataKey={xKey} stroke="#8a92a6" fontSize={11} />
              <YAxis stroke="#8a92a6" fontSize={11} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ stroke: "#7c5cff", strokeOpacity: 0.3 }}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke="#9a82ff"
                strokeWidth={2.5}
                dot={{ fill: "#9a82ff", r: 3, strokeWidth: 0 }}
                activeDot={{
                  r: 6,
                  fill: "#fff",
                  stroke: "#7c5cff",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          ) : (
            <PieChart>
              <defs>
                {PALETTE.map((color, i) => (
                  <linearGradient
                    key={i}
                    id={`gradPie${i}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.55} />
                  </linearGradient>
                ))}
              </defs>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={75}
                outerRadius={135}
                paddingAngle={3}
                cornerRadius={6}
                label
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={`url(#gradPie${i % PALETTE.length})`}
                    stroke="rgba(10,11,17,0.4)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
