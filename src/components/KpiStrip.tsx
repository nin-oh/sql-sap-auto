import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Database,
  Hash,
  Sigma,
  TrendingUp,
} from "lucide-react";
import { useAppStore } from "../store/appStore";

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else prev.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function Kpi({
  icon: Icon,
  label,
  value,
  hue,
  suffix,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hue: string;
  suffix?: string;
}) {
  const animated = useCountUp(value);
  return (
    <div className="glass glass-lift rounded-xl p-3.5 relative overflow-hidden group">
      <div
        className="absolute -top-10 -right-10 size-28 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition"
        style={{ background: hue }}
      />
      <div className="flex items-center gap-2">
        <div
          className="size-7 rounded-lg flex items-center justify-center"
          style={{ background: `${hue}33`, color: hue }}
        >
          <Icon className="size-3.5" />
        </div>
        <span className="text-[10.5px] uppercase tracking-wider text-muted font-semibold">
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums grad-text">
        {animated.toLocaleString()}
        {suffix && <span className="text-sm ml-1 opacity-70">{suffix}</span>}
      </div>
    </div>
  );
}

export function KpiStrip() {
  const rows = useAppStore((s) => s.rows);
  const columns = useAppStore((s) => s.columns);
  const durationMs = useAppStore((s) => s.durationMs);

  const numericCol = useMemo(
    () => columns.find((c) => c.type === "number"),
    [columns],
  );

  const sum = useMemo(() => {
    if (!numericCol) return 0;
    let s = 0;
    for (const r of rows) {
      const v = Number(r[numericCol.name]);
      if (Number.isFinite(v)) s += v;
    }
    return Math.round(s);
  }, [rows, numericCol]);

  const avg = useMemo(() => {
    if (!numericCol || rows.length === 0) return 0;
    return Math.round(sum / rows.length);
  }, [sum, rows.length, numericCol]);

  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Kpi
        icon={Database}
        label="Lignes"
        value={rows.length}
        hue="#7c5cff"
      />
      <Kpi
        icon={Hash}
        label="Colonnes"
        value={columns.length}
        hue="#22d3ee"
      />
      {numericCol && (
        <Kpi
          icon={Sigma}
          label={`Σ ${numericCol.name}`}
          value={sum}
          hue="#34d399"
        />
      )}
      {numericCol && (
        <Kpi
          icon={TrendingUp}
          label={`Moy. ${numericCol.name}`}
          value={avg}
          hue="#fbbf24"
        />
      )}
      {!numericCol && durationMs != null && (
        <Kpi
          icon={Activity}
          label="Durée"
          value={durationMs}
          hue="#f472b6"
          suffix="ms"
        />
      )}
    </div>
  );
}
