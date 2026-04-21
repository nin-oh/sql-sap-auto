import { useAppStore } from "../store/appStore";
import { Clock, AlertCircle, CheckCircle2, Trash2, Play } from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString([], {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}

function summary(sql: string): string {
  const s = sql.replace(/\s+/g, " ").trim();
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
}

export function HistoryPanel() {
  const history = useAppStore((s) => s.history);
  const runFromHistory = useAppStore((s) => s.runFromHistory);
  const clearHistory = useAppStore((s) => s.clearHistory);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Clock className="size-4 text-accent-glow" />
          Historique
        </div>
        {history.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearHistory}>
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-auto px-2 py-2">
        {history.length === 0 ? (
          <div className="text-xs text-muted px-3 py-6 text-center">
            Aucune requête dans l'historique.
          </div>
        ) : (
          <ul className="space-y-1">
            {history.map((h) => (
              <li
                key={h.id}
                className="group px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-border transition"
                onClick={() => runFromHistory(h)}
                title="Charger cette requête"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {h.success ? (
                      <CheckCircle2 className="size-3.5 text-success flex-shrink-0" />
                    ) : (
                      <AlertCircle className="size-3.5 text-danger flex-shrink-0" />
                    )}
                    <span className="text-[11px] text-muted">
                      {formatTime(h.timestamp)}
                    </span>
                  </div>
                  <Play className="size-3 opacity-0 group-hover:opacity-100 text-accent-glow transition" />
                </div>
                <p className="text-xs text-slate-300 mt-1 line-clamp-2 font-mono">
                  {summary(h.sql)}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {h.success && (
                    <Badge tone="success">{h.rowCount} lignes</Badge>
                  )}
                  <Badge>{h.durationMs} ms</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
