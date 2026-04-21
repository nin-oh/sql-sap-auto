import { useAppStore } from "../store/appStore";
import { Input } from "./ui/Input";
import { Wand2, Info } from "lucide-react";

export function VariablePanel() {
  const variables = useAppStore((s) => s.variables);
  const values = useAppStore((s) => s.values);
  const setValue = useAppStore((s) => s.setValue);

  if (variables.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted py-2">
        <Wand2 className="size-3.5" />
        Aucune variable détectée. Utilisez{" "}
        <code className="bg-white/5 px-1 py-0.5 rounded text-[11px]">
          :nomVariable
        </code>{" "}
        dans votre SQL pour créer des champs.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
      {variables.map((v) => (
        <label key={v.name} className="block group">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              {v.label}
            </span>
            <code className="text-[10px] text-accent-glow bg-accent/10 px-1 py-0.5 rounded">
              :{v.name}
            </code>
            {v.hint && (
              <span className="relative group/hint">
                <Info className="size-3 text-muted cursor-help" />
                <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-1 w-60 z-10 p-2 rounded-md text-[11px] bg-bg-elev border border-border text-slate-200 opacity-0 group-hover/hint:opacity-100 transition">
                  {v.hint}
                </span>
              </span>
            )}
          </div>
          <Input
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
          />
        </label>
      ))}
    </div>
  );
}
