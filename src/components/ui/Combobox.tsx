import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Check, X, Loader2, Search } from "lucide-react";
import { cn } from "../../lib/cn";

export type Option = { value: string | number; label?: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  loading?: boolean;
  allowAll?: boolean;
  placeholder?: string;
  className?: string;
};

export function Combobox({
  value,
  onChange,
  options,
  loading,
  allowAll,
  placeholder,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const effectiveOptions = useMemo<Option[]>(() => {
    const extras: Option[] = [];
    if (allowAll) extras.push({ value: "*", label: "Tous (*)" });
    return [...extras, ...options];
  }, [allowAll, options]);

  const filtered = useMemo(() => {
    if (!query.trim()) return effectiveOptions.slice(0, 200);
    const q = query.toLowerCase();
    return effectiveOptions
      .filter(
        (o) =>
          String(o.value).toLowerCase().includes(q) ||
          (o.label ?? "").toLowerCase().includes(q),
      )
      .slice(0, 200);
  }, [effectiveOptions, query]);

  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(0);
  }, [filtered.length, highlight]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const selectedLabel = useMemo(() => {
    const match = effectiveOptions.find((o) => String(o.value) === String(value));
    if (match) return match.label ? `${match.value} — ${match.label}` : String(match.value);
    return value || "";
  }, [effectiveOptions, value]);

  const choose = (opt: Option) => {
    onChange(String(opt.value));
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-lg bg-bg-soft border border-border px-3 py-2 text-sm text-slate-100 hover:border-border-soft transition ring-accent",
          open && "border-accent/60 shadow-[0_0_0_3px_rgba(124,92,255,0.15)]",
        )}
      >
        <span className={cn("truncate", !value && "text-slate-500")}>
          {value ? selectedLabel : placeholder ?? "Sélectionner…"}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {loading && <Loader2 className="size-3.5 text-muted animate-spin" />}
          {value && !loading && (
            <X
              className="size-3.5 text-muted hover:text-danger transition"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          )}
          <ChevronDown
            className={cn(
              "size-3.5 text-muted transition",
              open && "rotate-180 text-accent-glow",
            )}
          />
        </div>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full rounded-lg glass shadow-panel border border-white/10 overflow-hidden animate-slideUp">
          <div className="relative border-b border-white/5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((i) => Math.min(filtered.length - 1, i + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((i) => Math.max(0, i - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const opt = filtered[highlight];
                  if (opt) choose(opt);
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Rechercher…"
              className="w-full bg-transparent outline-none pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <ul className="max-h-56 overflow-auto py-1">
            {loading && filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-[11px] text-muted">
                Chargement…
              </li>
            )}
            {!loading && filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-[11px] text-muted">
                Aucune valeur.
              </li>
            )}
            {filtered.map((opt, i) => {
              const active = i === highlight;
              const selected = String(opt.value) === String(value);
              return (
                <li
                  key={`${opt.value}-${i}`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => choose(opt)}
                  className={cn(
                    "mx-1 px-2.5 py-1.5 rounded-md text-xs cursor-pointer flex items-center justify-between gap-2 transition",
                    active
                      ? "bg-accent/15 text-white"
                      : "text-slate-200 hover:bg-white/[0.03]",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="text-accent-glow bg-accent/10 px-1 py-0.5 rounded text-[10px] font-mono flex-shrink-0">
                      {String(opt.value)}
                    </code>
                    {opt.label && (
                      <span className="truncate">{opt.label}</span>
                    )}
                  </div>
                  {selected && <Check className="size-3.5 text-success" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
