import { useEffect, useMemo, useState } from "react";
import {
  Share2,
  Loader2,
  Camera,
  Database,
  Check,
  Clock,
  FileCode2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Badge } from "./ui/Badge";
import { useAppStore } from "../store/appStore";
import { cn } from "../lib/cn";
import type { Snapshot } from "../lib/types";

export function WorkspaceShareDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const templates = useAppStore((s) => s.templates);
  const snapshots = useAppStore((s) => s.snapshots);
  const activeTemplateId = useAppStore((s) => s.activeTemplateId);
  const rows = useAppStore((s) => s.rows);
  const columns = useAppStore((s) => s.columns);
  const sql = useAppStore((s) => s.sql);
  const values = useAppStore((s) => s.values);
  const variables = useAppStore((s) => s.variables);

  const liveAvailable = rows.length > 0;
  const liveName = useMemo(() => {
    const t = templates.find((x) => x.id === activeTemplateId);
    return t?.name || "Résultat actuel";
  }, [templates, activeTemplateId]);

  const [title, setTitle] = useState("");
  const [includeLive, setIncludeLive] = useState(true);
  const [snapshotSel, setSnapshotSel] = useState<Record<string, boolean>>({});
  const [templateSel, setTemplateSel] = useState<Record<string, boolean>>({});
  const [includeHistory, setIncludeHistory] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [counts, setCounts] = useState<{
    templates: number;
    snapshots: number;
    history: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    const d = new Date();
    setTitle(`sap-workspace-${d.toISOString().slice(0, 10)}`);
    setError(null);
    setSavedPath(null);
    setCounts(null);
    setIncludeLive(liveAvailable);
    const sSel: Record<string, boolean> = {};
    for (const s of snapshots) sSel[s.id] = true;
    setSnapshotSel(sSel);
    const tSel: Record<string, boolean> = {};
    for (const t of templates) tSel[t.id] = true;
    setTemplateSel(tSel);
    setIncludeHistory(true);
  }, [open, liveAvailable, snapshots, templates]);

  const selectedSnapshotCount = useMemo(
    () => snapshots.filter((s) => snapshotSel[s.id]).length,
    [snapshots, snapshotSel],
  );
  const selectedTemplateCount = useMemo(
    () => templates.filter((t) => templateSel[t.id]).length,
    [templates, templateSel],
  );

  const totalDataTables =
    (includeLive && liveAvailable ? 1 : 0) + selectedSnapshotCount;

  const doShare = async () => {
    setError(null);
    setSavedPath(null);
    setBusy(true);
    try {
      const extraSnapshots: Snapshot[] = [];
      if (includeLive && liveAvailable) {
        const params: Record<string, unknown> = {};
        for (const v of variables) {
          const raw = values[v.name] ?? v.default ?? "";
          params[v.name] =
            v.type === "number" ? Number(raw) : String(raw);
        }
        extraSnapshots.push({
          id: `snap_live_${Date.now().toString(36)}`,
          name: liveName,
          description: "Résultat inclus lors du partage",
          sql,
          params,
          columns,
          rows,
          createdAt: Date.now(),
        });
      }
      const r = await window.sap.exportWorkspace({
        title: title.trim() || undefined,
        templateIds: templates
          .filter((t) => templateSel[t.id])
          .map((t) => t.id),
        snapshotIds: snapshots
          .filter((s) => snapshotSel[s.id])
          .map((s) => s.id),
        extraSnapshots,
        includeHistory,
      });
      if (r.success && r.filePath) {
        setSavedPath(r.filePath);
        setCounts(r.counts ?? null);
      } else if (!r.canceled) {
        setError(r.error ?? "Échec de l'export");
      }
    } finally {
      setBusy(false);
    }
  };

  const noData = totalDataTables === 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Partager avec un collègue"
      width="max-w-2xl"
      footer={
        <>
          <span className="text-[11px] text-muted mr-auto">
            {totalDataTables} table{totalDataTables !== 1 ? "s" : ""} de données ·{" "}
            {selectedTemplateCount} modèle
            {selectedTemplateCount !== 1 ? "s" : ""}
          </span>
          <Button variant="ghost" onClick={onClose}>
            Fermer
          </Button>
          <Button
            variant="primary"
            onClick={doShare}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Share2 className="size-3.5" />
            )}
            Créer le fichier .sapwork
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-slate-300">
            Nom du fichier
          </span>
          <Input
            className="mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        {noData && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warn/5 border border-warn/30">
            <AlertTriangle className="size-4 text-warn flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-200">
              <p className="font-semibold text-warn">
                Aucune donnée sélectionnée
              </p>
              <p className="text-[11px] mt-0.5">
                Sans capture ni résultat, votre collègue recevra seulement les
                requêtes SQL. Il aura besoin d'accès à la base pour voir les
                données.
              </p>
            </div>
          </div>
        )}

        <Section
          title="Données (tables que votre collègue pourra consulter sans SQL)"
          icon={<Database className="size-3.5 text-accent-glow" />}
        >
          {!liveAvailable && snapshots.length === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-soft border border-border text-[11px] text-muted">
              <Info className="size-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Aucune donnée à partager. Exécutez une requête puis revenez ici,
                ou utilisez <b>Capturer</b> pour figer un résultat.
              </span>
            </div>
          )}
          {liveAvailable && (
            <SelectRow
              checked={includeLive}
              onToggle={() => setIncludeLive((v) => !v)}
              icon={<Database className="size-3.5 text-accent-glow" />}
              title={liveName}
              badge={
                <Badge tone="success">
                  {rows.length.toLocaleString()} lignes
                </Badge>
              }
              note="Résultat actuel — sera figé dans le fichier"
            />
          )}
          {snapshots.map((s) => (
            <SelectRow
              key={s.id}
              checked={!!snapshotSel[s.id]}
              onToggle={() =>
                setSnapshotSel((p) => ({ ...p, [s.id]: !p[s.id] }))
              }
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
        </Section>

        <Section
          title="Modèles de requêtes"
          icon={<FileCode2 className="size-3.5 text-accent-glow" />}
        >
          {templates.map((t) => (
            <SelectRow
              key={t.id}
              checked={!!templateSel[t.id]}
              onToggle={() =>
                setTemplateSel((p) => ({ ...p, [t.id]: !p[t.id] }))
              }
              icon={<FileCode2 className="size-3.5 text-accent-glow" />}
              title={t.name}
              note={t.description || "Modèle"}
            />
          ))}
        </Section>

        <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeHistory}
            onChange={(e) => setIncludeHistory(e.target.checked)}
            className="accent-accent"
          />
          <Clock className="size-3.5 text-accent-glow" />
          Inclure l'historique des requêtes (SQL + paramètres, pas les données)
        </label>

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
              <p className="text-success font-semibold">Fichier créé</p>
              {counts && (
                <p className="text-slate-200 mt-0.5">
                  {counts.templates} modèle{counts.templates !== 1 ? "s" : ""} ·{" "}
                  {counts.snapshots} table{counts.snapshots !== 1 ? "s" : ""} de
                  données · {counts.history} historique
                  {counts.history !== 1 ? "s" : ""}
                </p>
              )}
              <p className="text-slate-400 mt-0.5 font-mono text-[10.5px] break-all">
                {savedPath}
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-200">
          {title}
        </span>
      </div>
      <div className="rounded-xl border border-border overflow-hidden max-h-60 overflow-y-auto divide-y divide-border/60">
        {children}
      </div>
    </div>
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
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition",
        checked ? "bg-accent/10" : "hover:bg-white/[0.03]",
      )}
      onClick={onToggle}
    >
      <div
        className={cn(
          "size-4 rounded border flex items-center justify-center transition flex-shrink-0",
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
        {note && <p className="text-[11px] text-muted mt-0.5 truncate">{note}</p>}
      </div>
    </div>
  );
}
