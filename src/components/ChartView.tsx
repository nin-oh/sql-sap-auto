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
  LabelList,
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
type Agg = "sum" | "avg" | "count" | "min" | "max";

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
  background: "rgba(20, 24, 36, 0.96)",
  border: "1px solid rgba(124,92,255,0.3)",
  borderRadius: 10,
  color: "#e5e7eb",
  boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
  fontSize: 12,
  padding: "8px 10px",
};

const AGG_LABEL: Record<Agg, string> = {
  sum: "Somme",
  avg: "Moyenne",
  count: "Compte",
  min: "Minimum",
  max: "Maximum",
};

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return Number.isInteger(n) ? n.toLocaleString("fr-FR") : n.toFixed(2);
}

function aggregateValue(
  values: number[],
  agg: Agg,
): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case "count":
      return values.length;
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    default:
      return values.reduce((a, b) => a + b, 0);
  }
}

export function ChartView() {
  const rows = useAppStore((s) => s.rows);
  const columns = useAppStore((s) => s.columns);

  const numericCols = useMemo(
    () => columns.filter((c) => c.type === "number").map((c) => c.name),
    [columns],
  );
  const nonNumericCols = useMemo(
    () => columns.filter((c) => c.type !== "number").map((c) => c.name),
    [columns],
  );

  const [type, setType] = useState<ChartType>("bar");
  const [xKey, setXKey] = useState<string>(
    nonNumericCols[0] ?? columns[0]?.name ?? "",
  );
  const [yKey, setYKey] = useState<string>(numericCols[0] ?? "");
  const [agg, setAgg] = useState<Agg>("sum");
  const [topN, setTopN] = useState<number>(15);

  const { data, otherValue, truncated } = useMemo(() => {
    if (!xKey || !yKey) return { data: [], otherValue: 0, truncated: false };
    const buckets = new Map<string, number[]>();
    for (const r of rows) {
      const k =
        r[xKey] instanceof Date
          ? (r[xKey] as Date).toISOString().slice(0, 10)
          : r[xKey] == null
            ? "—"
            : String(r[xKey]);
      const v = Number(r[yKey]);
      if (!Number.isFinite(v) && agg !== "count") continue;
      const arr = buckets.get(k) ?? [];
      arr.push(agg === "count" ? 1 : v);
      buckets.set(k, arr);
    }
    const sortedKeys = Array.from(buckets.keys()).sort((a, b) => {
      const va = aggregateValue(buckets.get(a)!, agg);
      const vb = aggregateValue(buckets.get(b)!, agg);
      return vb - va;
    });
    let kept = sortedKeys;
    let other = 0;
    let wasTruncated = false;
    if (type !== "line" && type !== "area" && sortedKeys.length > topN) {
      kept = sortedKeys.slice(0, topN);
      const rest = sortedKeys.slice(topN);
      const allRest = rest.flatMap((k) => buckets.get(k)!);
      other = aggregateValue(allRest, agg);
      wasTruncated = true;
    }
    const aggregated = kept.map((k) => ({
      x: k,
      y: aggregateValue(buckets.get(k)!, agg),
    }));
    if (type === "line" || type === "area") {
      aggregated.sort((a, b) => a.x.localeCompare(b.x));
    }
    return {
      data: aggregated.map((p) => ({ [xKey]: p.x, [yKey]: p.y })),
      otherValue: other,
      truncated: wasTruncated,
    };
  }, [rows, xKey, yKey, agg, type, topN]);

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

  if (numericCols.length === 0 && agg !== "count") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted">
        <p className="text-sm">
          Aucune colonne numérique détectée. Basculez l'agrégation sur
          "Compte" pour obtenir un graphique de distribution.
        </p>
      </div>
    );
  }

  const pieData =
    type === "pie"
      ? [
          ...data.map((d) => ({
            name: String(d[xKey]),
            value: Number(d[yKey]),
          })),
          ...(otherValue > 0
            ? [{ name: "Autres", value: otherValue }]
            : []),
        ]
      : [];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 flex-wrap pb-3">
        <div className="flex items-center gap-1 bg-bg-soft border border-border rounded-lg p-1">
          {(
            [
              { t: "bar", icon: BarChart3, label: "Barres" },
              { t: "line", icon: LineIcon, label: "Lignes" },
              { t: "area", icon: AreaIcon, label: "Aire" },
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

        <Select
          label="Axe X"
          value={xKey}
          onChange={setXKey}
          options={columns.map((c) => c.name)}
        />

        {(numericCols.length > 0 || agg === "count") && (
          <Select
            label="Valeur"
            value={yKey || numericCols[0] || columns[0]?.name || ""}
            onChange={setYKey}
            options={
              agg === "count"
                ? columns.map((c) => c.name)
                : numericCols.length > 0
                  ? numericCols
                  : columns.map((c) => c.name)
            }
          />
        )}

        <Select
          label="Agrégation"
          value={agg}
          onChange={(v) => setAgg(v as Agg)}
          options={["sum", "avg", "count", "min", "max"]}
          format={(v) => AGG_LABEL[v as Agg]}
        />

        {type !== "line" && type !== "area" && (
          <Select
            label="Top"
            value={String(topN)}
            onChange={(v) => setTopN(Number(v))}
            options={["5", "10", "15", "25", "50", "100"]}
          />
        )}
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-border bg-bg-soft/40 p-3 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 size-64 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 size-64 rounded-full bg-cyan/10 blur-3xl pointer-events-none" />
        <ResponsiveContainer width="100%" height="100%">
          {type === "area" ? (
            <AreaChart
              data={data}
              margin={{ top: 24, right: 24, bottom: 12, left: 12 }}
            >
              <defs>
                <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c5cff" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#7c5cff" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
              <XAxis
                dataKey={xKey}
                stroke="#8a92a6"
                fontSize={11}
                tickFormatter={truncLabel}
              />
              <YAxis
                stroke="#8a92a6"
                fontSize={11}
                tickFormatter={fmt}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => fmt(v)}
                cursor={{ stroke: "#7c5cff", strokeOpacity: 0.3 }}
              />
              <Legend
                wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }}
                formatter={() => `${AGG_LABEL[agg]} · ${yKey}`}
              />
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
              margin={{ top: 24, right: 24, bottom: 12, left: 12 }}
            >
              <defs>
                <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9a82ff" stopOpacity={1} />
                  <stop offset="100%" stopColor="#6b4ff0" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
              <XAxis
                dataKey={xKey}
                stroke="#8a92a6"
                fontSize={11}
                interval={0}
                tickFormatter={truncLabel}
                angle={data.length > 8 ? -25 : 0}
                textAnchor={data.length > 8 ? "end" : "middle"}
                height={data.length > 8 ? 60 : 30}
              />
              <YAxis
                stroke="#8a92a6"
                fontSize={11}
                tickFormatter={fmt}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => fmt(v)}
                cursor={{ fill: "rgba(124,92,255,0.08)" }}
              />
              <Legend
                wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }}
                formatter={() => `${AGG_LABEL[agg]} · ${yKey}`}
              />
              <Bar
                dataKey={yKey}
                fill="url(#gradBar)"
                radius={[8, 8, 0, 0]}
                animationDuration={500}
              >
                {data.length <= 20 && (
                  <LabelList
                    dataKey={yKey}
                    position="top"
                    fill="#cbd5e1"
                    fontSize={10}
                    formatter={fmt}
                  />
                )}
              </Bar>
            </BarChart>
          ) : type === "line" ? (
            <LineChart
              data={data}
              margin={{ top: 24, right: 24, bottom: 12, left: 12 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2637" />
              <XAxis
                dataKey={xKey}
                stroke="#8a92a6"
                fontSize={11}
                tickFormatter={truncLabel}
              />
              <YAxis
                stroke="#8a92a6"
                fontSize={11}
                tickFormatter={fmt}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => fmt(v)}
                cursor={{ stroke: "#7c5cff", strokeOpacity: 0.3 }}
              />
              <Legend
                wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }}
                formatter={() => `${AGG_LABEL[agg]} · ${yKey}`}
              />
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
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => fmt(v)}
              />
              <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={75}
                outerRadius={135}
                paddingAngle={3}
                cornerRadius={6}
                label={(entry) => truncLabel(String(entry.name))}
              >
                {pieData.map((_, i) => (
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

      {truncated && (
        <div className="mt-2 text-[11px] text-muted">
          Affichage des {topN} premières catégories.{" "}
          {otherValue > 0 && `Les autres sont regroupées (${fmt(otherValue)}).`}
        </div>
      )}
    </div>
  );
}

function truncLabel(v: string): string {
  const s = String(v);
  return s.length > 12 ? s.slice(0, 12) + "…" : s;
}

function Select({
  label,
  value,
  onChange,
  options,
  format,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  format?: (v: string) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-bg-soft border border-border rounded-md text-xs px-2 py-1.5 text-slate-200 hover:border-border-soft transition"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {format ? format(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}
