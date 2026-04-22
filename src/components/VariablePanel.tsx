import { useMemo } from "react";
import { useAppStore } from "../store/appStore";
import { Input } from "./ui/Input";
import {
  Wand2,
  Info,
  Hash,
  Calendar,
  Type as TypeIcon,
  History,
} from "lucide-react";
import { getHistory } from "../lib/valueHistory";

const typeIcons = {
  number: Hash,
  date: Calendar,
  text: TypeIcon,
  select: TypeIcon,
} as const;

export function VariablePanel() {
  const variables = useAppStore((s) => s.variables);
  const values = useAppStore((s) => s.values);
  const setValue = useAppStore((s) => s.setValue);
  const history = useAppStore((s) => s.history);

  // Values seen in past runs (template params) merged with local history.
  const fromRuns = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const entry of history) {
      for (const [k, v] of Object.entries(entry.params ?? {})) {
        if (v == null) continue;
        const s = String(v).trim();
        if (!s) continue;
        if (!map.has(k)) map.set(k, new Set());
        map.get(k)!.add(s);
      }
    }
    return map;
  }, [history]);

  if (variables.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted py-2">
        <Wand2 className="size-3.5 text-accent-glow" />
        Aucune variable détectée. Utilisez{" "}
        <code className="bg-accent/10 border border-accent/20 text-accent-glow px-1.5 py-0.5 rounded text-[11px] font-mono">
          :nomVariable
        </code>{" "}
        dans votre SQL pour créer des champs.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {variables.map((v) => {
        const Icon = typeIcons[v.type] ?? TypeIcon;
        const listId = `vhist-${v.name}`;
        const localHistory = getHistory(v.name);
        const fromHistory = fromRuns.get(v.name) ?? new Set<string>();
        const suggestions = Array.from(
          new Set([
            ...localHistory,
            ...fromHistory,
            ...(v.default != null ? [String(v.default)] : []),
          ]),
        ).slice(0, 8);

        return (
          <label key={v.name} className="block group">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="size-5 rounded-md bg-accent/10 flex items-center justify-center text-accent-glow">
                <Icon className="size-3" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-200">
                {v.label}
              </span>
              <code className="text-[10px] text-accent-glow bg-accent/10 px-1.5 py-0.5 rounded font-mono">
                :{v.name}
              </code>
              {v.hint && (
                <span className="relative group/hint ml-auto">
                  <Info className="size-3 text-muted cursor-help hover:text-accent-glow transition" />
                  <span className="pointer-events-none absolute right-0 top-full mt-1 w-60 z-10 p-2 rounded-md text-[11px] bg-bg-elev border border-accent/20 text-slate-200 opacity-0 group-hover/hint:opacity-100 transition shadow-panel">
                    {v.hint}
                  </span>
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                list={listId}
                type={
                  v.type === "date"
                    ? "date"
                    : v.type === "number"
                      ? "number"
                      : "text"
                }
                value={values[v.name] ?? ""}
                placeholder={v.default != null ? String(v.default) : ""}
                onChange={(e) => setValue(v.name, e.target.value)}
                className="group-hover:border-accent/30 focus:border-accent/50 transition"
              />
              {suggestions.length > 0 && (
                <datalist id={listId}>
                  {suggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              )}
            </div>
            {suggestions.length > 0 && v.type !== "date" && (
              <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                <History className="size-2.5 text-muted" />
                {suggestions.slice(0, 5).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue(v.name, s)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition truncate max-w-[90px] ${
                      (values[v.name] ?? "") === s
                        ? "bg-accent/20 text-accent-glow border-accent/40"
                        : "bg-white/[0.03] text-slate-300 border-border hover:border-accent/30 hover:text-accent-glow"
                    }`}
                    title={s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </label>
        );
      })}
    </div>
  );
}
