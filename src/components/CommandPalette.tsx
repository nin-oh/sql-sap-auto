import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  FileCode2,
  Camera,
  Clock,
  FileSpreadsheet,
  Upload,
  Download,
  Settings,
  Maximize2,
  Rows3,
  BarChart3,
  Table2,
  Keyboard,
  Sparkles,
  Command,
  ArrowRight,
} from "lucide-react";
import { useAppStore } from "../store/appStore";
import { cn } from "../lib/cn";

type CmdItem = {
  id: string;
  label: string;
  subtitle?: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string;
  shortcut?: string;
  run: () => void;
};

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (q.length === 0) return 0.001;
  let qi = 0;
  let lastMatch = -2;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (q[qi] === t[ti]) {
      let bonus = 1;
      if (ti === 0 || /\s/.test(t[ti - 1])) bonus += 2;
      if (lastMatch === ti - 1) bonus += 3;
      score += bonus;
      lastMatch = ti;
      qi++;
    }
  }
  if (qi < q.length) return 0;
  return score - t.length * 0.01;
}

export function CommandPalette() {
  const open = useAppStore((s) => s.paletteOpen);
  const setOpen = useAppStore((s) => s.setPaletteOpen);
  const templates = useAppStore((s) => s.templates);
  const snapshots = useAppStore((s) => s.snapshots);
  const history = useAppStore((s) => s.history);
  const runQuery = useAppStore((s) => s.runQuery);
  const loadTemplate = useAppStore((s) => s.loadTemplate);
  const loadSnapshot = useAppStore((s) => s.loadSnapshot);
  const runFromHistory = useAppStore((s) => s.runFromHistory);
  const toggleMaximizedResults = useAppStore((s) => s.toggleMaximizedResults);
  const toggleDenseTable = useAppStore((s) => s.toggleDenseTable);
  const setView = useAppStore((s) => s.setView);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);
  const importWorkspace = useAppStore((s) => s.importWorkspace);

  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const items = useMemo<CmdItem[]>(() => {
    const list: CmdItem[] = [
      {
        id: "act:run",
        group: "Actions",
        label: "Exécuter la requête",
        icon: Play,
        shortcut: "⌘↵",
        run: () => void runQuery(),
      },
      {
        id: "act:run-fresh",
        group: "Actions",
        label: "Exécuter sans cache",
        subtitle: "Ignorer le résultat en cache et refaire l'appel",
        icon: Play,
        keywords: "refresh force reload",
        run: () => void runQuery({ force: true }),
      },
      {
        id: "act:capture",
        group: "Actions",
        label: "Capturer le résultat",
        subtitle: "Figer les lignes courantes dans une capture",
        icon: Camera,
        run: () => {
          document.getElementById("btn-open-snapshot")?.click();
        },
      },
      {
        id: "act:excel",
        group: "Actions",
        label: "Exporter en Excel",
        icon: FileSpreadsheet,
        run: () => {
          document.getElementById("btn-open-excel")?.click();
        },
      },
      {
        id: "act:share",
        group: "Actions",
        label: "Partager (créer un fichier .sapwork)",
        icon: Download,
        keywords: "share export workspace",
        run: () => {
          document.getElementById("btn-open-share")?.click();
        },
      },
      {
        id: "act:import-ws",
        group: "Actions",
        label: "Importer un espace de travail",
        icon: Upload,
        run: () => void importWorkspace(),
      },
      {
        id: "act:view-table",
        group: "Vue",
        label: "Afficher la table",
        icon: Table2,
        run: () => setView("results"),
      },
      {
        id: "act:view-chart",
        group: "Vue",
        label: "Afficher le graphique",
        icon: BarChart3,
        run: () => setView("chart"),
      },
      {
        id: "act:maximize",
        group: "Vue",
        label: "Basculer plein écran",
        icon: Maximize2,
        run: () => toggleMaximizedResults(),
      },
      {
        id: "act:dense",
        group: "Vue",
        label: "Basculer mode dense",
        icon: Rows3,
        run: () => toggleDenseTable(),
      },
      {
        id: "act:connection",
        group: "Paramètres",
        label: "Paramètres de connexion",
        icon: Settings,
        run: () => {
          document.getElementById("btn-open-connection")?.click();
        },
      },
      {
        id: "act:shortcuts",
        group: "Paramètres",
        label: "Raccourcis clavier",
        icon: Keyboard,
        shortcut: "?",
        run: () => setShortcutsOpen(true),
      },
    ];
    templates.forEach((t, i) => {
      list.push({
        id: `tpl:${t.id}`,
        group: "Modèles",
        label: t.name,
        subtitle: t.description,
        icon: FileCode2,
        keywords: t.sql,
        shortcut: i < 9 ? `⌘${i + 1}` : undefined,
        run: () => {
          loadTemplate(t.id);
          setTimeout(() => void runQuery(), 40);
        },
      });
    });
    snapshots.slice(0, 30).forEach((s) => {
      list.push({
        id: `snap:${s.id}`,
        group: "Captures",
        label: s.name,
        subtitle: `${s.rows.length.toLocaleString()} lignes · ${new Date(
          s.createdAt,
        ).toLocaleDateString("fr-FR")}`,
        icon: Camera,
        run: () => loadSnapshot(s.id),
      });
    });
    history.slice(0, 15).forEach((h) => {
      list.push({
        id: `hist:${h.id}`,
        group: "Historique",
        label: summarize(h.sql),
        subtitle: `${h.rowCount} lignes · ${h.durationMs} ms · ${new Date(
          h.timestamp,
        ).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        icon: Clock,
        run: () => runFromHistory(h),
      });
    });
    return list;
  }, [
    templates,
    snapshots,
    history,
    runQuery,
    loadTemplate,
    loadSnapshot,
    runFromHistory,
    toggleMaximizedResults,
    toggleDenseTable,
    setView,
    setShortcutsOpen,
    importWorkspace,
  ]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.trim();
    const scored = items
      .map((it) => {
        const subject = [it.label, it.subtitle, it.keywords, it.group]
          .filter(Boolean)
          .join(" ");
        return { it, score: fuzzyScore(q, subject) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 60)
      .map((x) => x.it);
    return scored;
  }, [items, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, CmdItem[]>();
    for (const it of filtered) {
      const arr = map.get(it.group) ?? [];
      arr.push(it);
      map.set(it.group, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIdx(0);
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    if (selectedIdx >= filtered.length) setSelectedIdx(0);
  }, [filtered.length, selectedIdx]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `[data-idx="${selectedIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx, open]);

  const exec = (it: CmdItem) => {
    setOpen(false);
    setTimeout(() => it.run(), 30);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl glass rounded-2xl shadow-panel animate-slideUp overflow-hidden gradient-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <div className="size-7 rounded-lg bg-accent-gradient flex items-center justify-center shadow-glow">
            <Sparkles className="size-3.5 text-white" />
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIdx((i) => Math.min(filtered.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIdx((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const it = filtered[selectedIdx];
                if (it) exec(it);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Tapez une action, un modèle, une capture…"
            className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-100 placeholder:text-muted"
          />
          <kbd className="hidden md:inline text-[10px] text-muted border border-border rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>
        <ul
          ref={listRef}
          className="max-h-[60vh] overflow-auto py-2"
        >
          {filtered.length === 0 && (
            <li className="px-6 py-8 text-center text-xs text-muted">
              Aucun résultat. Essayez "capturer", "excel", un nom de modèle…
            </li>
          )}
          {grouped.map(([group, list]) => (
            <div key={group}>
              <li className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted font-semibold">
                {group}
              </li>
              {list.map((it) => {
                const idx = filtered.indexOf(it);
                const active = idx === selectedIdx;
                const Icon = it.icon;
                return (
                  <li
                    key={it.id}
                    data-idx={idx}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    onClick={() => exec(it)}
                    className={cn(
                      "mx-2 px-3 py-2 rounded-lg flex items-center gap-3 cursor-pointer transition",
                      active
                        ? "bg-accent/15 ring-1 ring-accent/40"
                        : "hover:bg-white/[0.04]",
                    )}
                  >
                    <div
                      className={cn(
                        "size-7 rounded-md flex items-center justify-center transition",
                        active
                          ? "bg-accent-gradient text-white"
                          : "bg-white/5 text-slate-300",
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-100 truncate">
                        {it.label}
                      </div>
                      {it.subtitle && (
                        <div className="text-[11px] text-muted truncate">
                          {it.subtitle}
                        </div>
                      )}
                    </div>
                    {it.shortcut && (
                      <kbd className="text-[10px] text-muted border border-border rounded px-1.5 py-0.5 font-mono">
                        {it.shortcut}
                      </kbd>
                    )}
                    {active && (
                      <ArrowRight className="size-3.5 text-accent-glow" />
                    )}
                  </li>
                );
              })}
            </div>
          ))}
        </ul>
        <div className="px-4 py-2 border-t border-white/5 flex items-center gap-3 text-[10.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <kbd className="border border-border rounded px-1.5 py-0.5">↑↓</kbd>
            Naviguer
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="border border-border rounded px-1.5 py-0.5">↵</kbd>
            Sélectionner
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Command className="size-3" />K pour rouvrir
          </span>
        </div>
      </div>
    </div>
  );
}

function summarize(sql: string): string {
  const s = sql.replace(/\s+/g, " ").trim();
  return s.length > 60 ? s.slice(0, 60) + "…" : s;
}
