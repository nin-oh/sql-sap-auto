import { Camera, Trash2, Table2 } from "lucide-react";
import { useAppStore } from "../store/appStore";
import { Badge } from "./ui/Badge";

function formatDate(ts: number) {
  return new Date(ts).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SnapshotsPanel() {
  const snapshots = useAppStore((s) => s.snapshots);
  const active = useAppStore((s) => s.activeSnapshotId);
  const loadSnapshot = useAppStore((s) => s.loadSnapshot);
  const deleteSnapshot = useAppStore((s) => s.deleteSnapshot);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Camera className="size-4 text-accent-glow" />
          Captures de données
        </div>
      </div>
      <div className="flex-1 overflow-auto px-2 py-2">
        {snapshots.length === 0 ? (
          <div className="text-[11px] text-muted px-3 py-6 text-center leading-relaxed">
            Aucune capture.
            <br />
            Exécutez une requête puis cliquez sur "Capturer" pour la partager
            avec un collègue sans accès SQL.
          </div>
        ) : (
          <ul className="space-y-1">
            {snapshots.map((s) => (
              <li
                key={s.id}
                className={`group px-3 py-2.5 rounded-lg cursor-pointer border transition ${
                  active === s.id
                    ? "bg-accent/10 border-accent/30"
                    : "border-transparent hover:bg-white/5 hover:border-border"
                }`}
                onClick={() => loadSnapshot(s.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Table2 className="size-3.5 text-accent-glow flex-shrink-0" />
                    <span className="text-xs font-medium text-slate-100 truncate">
                      {s.name}
                    </span>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteSnapshot(s.id);
                    }}
                    title="Supprimer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {s.description && (
                  <p className="text-[11px] text-muted mt-1 line-clamp-2">
                    {s.description}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge tone="accent">
                    {s.rows.length.toLocaleString()} lignes
                  </Badge>
                  <span className="text-[10px] text-muted">
                    {formatDate(s.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
