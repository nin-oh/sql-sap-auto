import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  Loader2,
  Camera,
  Database,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Badge } from "./ui/Badge";
import { useAppStore } from "../store/appStore";
import type { Snapshot } from "../lib/types";
import { cn } from "../lib/cn";

type ExportItem = {
  kind: "live" | "snapshot";
  id: string;
  snapshot?: Snapshot;
};

export function ExcelExportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const snapshots = useAppStore((s) => s.snapshots);
  const rows = useAppStore((s) => s.rows);
  const columns = useAppStore((s) => s.columns);
  const sql = useAppStore((s) => s.sql);
  const values = useAppStore((s) => s.values);
  const variables = useAppStore((s) => s.variables);
  const activeTemplateId = useAppStore((s) => s.activeTemplateId);
  const templates = useAppStore((s) => s.templates);

  const liveAvailable = rows.length > 0;
  const liveName = useMemo(() => {
    const t = templates.find((x) => x.id === activeTemplateId);
    return t?.name || "Résultat actuel";
  }, [templates, activeTemplateId]);

  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const d = new Date();
    setTitle(
      `Export SAP — ${d.toLocaleDateString("fr-FR", { dateStyle: "long" })}`,
    );
    setError(null);
    setSavedPath(null);
    const next: Record<string, boolean> = {};
    if (liveAvailable) next["live"] = true;
    setSelected(next);
  }, [open, liveAvailable]);

  const toggle = (key: string) =>
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectedCount =
    (liveAvailable && selected["live"] ? 1 : 0) +
    snapshots.filter((s) => selected[s.id]).length;

  const allSelected =
    (liveAvailable ? selected["live"] : true) &&
    snapshots.every((s) => selected[s.id]);

  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    if (!allSelected) {
      if (liveAvailable) next["live"] = true;
      for (const s of snapshots) next[s.id] = true;
    }
    setSelected(next);
  };

  const onExport = async () => {
    setError(null);
    setSavedPath(null);
    const items: Parameters<typeof window.sap.exportExcel>[0]["items"] = [];
    const filtersFor = (
      vars?: Array<{
        name: string;
        filterColumn?: string;
        filterOperator?: "eq" | "likeOrAll" | "gte" | "lte";
      }>,
    ) =>
      (vars ?? [])
        .filter((v) => v.filterColumn && v.filterOperator)
        .map((v) => ({
          paramName: v.name,
          column: v.filterColumn!,
          operator: v.filterOperator!,
        }));
    if (liveAvailable && selected["live"]) {
      const params: Record<string, unknown> = {};
      for (const v of variables) {
        const raw = values[v.name] ?? v.default ?? "";
        params[v.name] = v.type === "number" ? Number(raw) : String(raw);
      }
      items.push({
        name: liveName,
        sql,
        params,
        columns,
        rows,
        filters: filtersFor(variables),
      });
    }
    for (const snap of snapshots) {
      if (selected[snap.id]) {
        items.push({
          name: snap.name,
          description: snap.description,
          sql: snap.sql,
          params: snap.params,
          columns: snap.columns,
          rows: snap.rows,
          filters: filtersFor(snap.variables),
        });
      }
    }
    if (items.length === 0) {
      setError("Sélectionnez au moins une table à exporter.");
      return;
    }
    setBusy(true);
    try {
      const r = await window.sap.exportExcel({
        items,
        title: title.trim() || undefined,
        defaultFileName: `${sanitizeFileName(title)}.xlsx`,
      });
      if (r.success && r.filePath) {
        setSavedPath(r.filePath);
        setTimeout(() => onClose(), 1200);
      } else if (!r.canceled) {
        setError(r.error ?? "Échec de l'export.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exporter en Excel"
      width="max-w-2xl"
      footer={
        <>
          <span className="text-[11px] text-muted mr-auto">
            {selectedCount} table{selectedCount > 1 ? "s" : ""} sélectionnée
            {selectedCount > 1 ? "s" : ""}
          </span>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={onExport}
            disabled={busy || selectedCount === 0}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-3.5" />
            )}
            Exporter
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">
              Titre du classeur
            </span>
            <Input
              className="mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Ventes Q1 2026"
            />
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              Tables à inclure
            </span>
            <button
              className="text-[11px] text-accent-glow hover:text-white transition"
              onClick={toggleAll}
            >
              {allSelected ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <ul className="max-h-80 overflow-auto divide-y divide-border/60">
              {liveAvailable && (
                <SelectRow
                  checked={!!selected["live"]}
                  onToggle={() => toggle("live")}
                  icon={<Database className="size-3.5 text-accent-glow" />}
                  title={liveName}
                  badge={
                    <Badge tone="success">
                      {rows.length.toLocaleString()} lignes
                    </Badge>
                  }
                  note="Résultat en cours"
                />
              )}
              {snapshots.length === 0 && !liveAvailable && (
                <li className="px-4 py-6 text-center text-[11px] text-muted">
                  Aucune table disponible. Exécutez une requête ou importez un
                  espace de travail.
                </li>
              )}
              {snapshots.map((s) => (
                <SelectRow
                  key={s.id}
                  checked={!!selected[s.id]}
                  onToggle={() => toggle(s.id)}
                  icon={<Camera className="size-3.5 text-accent-glow" />}
                  title={s.name}
                  badge={
                    <Badge tone="accent">
                      {s.rows.length.toLocaleString()} lignes
                    </Badge>
                  }
                  note={s.description || "Capture"}
                />
              ))}
            </ul>
          </div>
          <p className="text-[11px] text-muted mt-2 leading-relaxed">
            Un onglet <span className="text-accent-glow font-semibold">Accueil</span> sera
            créé avec le sommaire et les paramètres, puis une feuille par table
            avec entête stylée, filtres automatiques, lignes alternées et
            colonnes auto-ajustées.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/5 border border-danger/20">
            <AlertTriangle className="size-4 text-danger flex-shrink-0 mt-0.5" />
            <span className="text-xs text-slate-200">{error}</span>
          </div>
        )}

        {savedPath && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-success/5 border border-success/20">
            <Check className="size-4 text-success flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="text-success font-semibold">Export réussi</p>
              <p className="text-slate-300 mt-0.5 font-mono text-[10.5px] break-all">
                {savedPath}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function SelectRow({
  checked,
  onToggle,
  icon,
  title,
  badge,
  note,
}: {
  checked: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  note?: string;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition",
        checked ? "bg-accent/10" : "hover:bg-white/[0.03]",
      )}
      onClick={onToggle}
    >
      <div
        className={cn(
          "size-4 rounded border flex items-center justify-center transition",
          checked
            ? "bg-accent border-accent shadow-[0_0_0_3px_rgba(124,92,255,0.15)]"
            : "border-border",
        )}
      >
        {checked && <Check className="size-3 text-white" strokeWidth={3} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium text-slate-100 truncate">
            {title}
          </span>
          {badge}
        </div>
        {note && (
          <p className="text-[11px] text-muted mt-0.5 truncate">{note}</p>
        )}
      </div>
    </li>
  );
}

function sanitizeFileName(s: string): string {
  return (
    s
      .replace(/[\\/?*\[\]:<>|"]+/g, "")
      .trim()
      .replace(/\s+/g, "_") || `export_sap_${Date.now()}`
  );
}
