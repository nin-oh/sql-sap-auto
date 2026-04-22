import { useEffect, useState } from "react";
import {
  Database,
  Play,
  Settings,
  Table2,
  BarChart3,
  Loader2,
  AlertTriangle,
  Keyboard,
  Wifi,
  Camera,
  Upload,
  Download,
  FileSpreadsheet,
  Maximize2,
  Minimize2,
  Rows3,
  Command,
  Square,
  X,
} from "lucide-react";
import { Button } from "./components/ui/Button";
import { Badge } from "./components/ui/Badge";
import { Card, CardBody, CardHeader } from "./components/ui/Card";
import { Input } from "./components/ui/Input";
import { Modal } from "./components/ui/Modal";
import { QueryEditor } from "./components/QueryEditor";
import { VariablePanel } from "./components/VariablePanel";
import { ResultsTable } from "./components/ResultsTable";
import { ChartView } from "./components/ChartView";
import { HistoryPanel } from "./components/HistoryPanel";
import { TemplatesPanel } from "./components/TemplatesPanel";
import { SnapshotsPanel } from "./components/SnapshotsPanel";
import { ConnectionDialog } from "./components/ConnectionDialog";
import { ExcelExportDialog } from "./components/ExcelExportDialog";
import { CommandPalette } from "./components/CommandPalette";
import { ShortcutsOverlay } from "./components/ShortcutsOverlay";
import { SkeletonRows } from "./components/SkeletonRows";
import { Aurora } from "./components/Aurora";
import { KpiStrip } from "./components/KpiStrip";
import { EmptyState } from "./components/EmptyState";
import { useAppStore } from "./store/appStore";
import { cn } from "./lib/cn";

export default function App() {
  const initialize = useAppStore((s) => s.initialize);
  const running = useAppStore((s) => s.running);
  const error = useAppStore((s) => s.error);
  const errorHint = useAppStore((s) => s.errorHint);
  const errorKind = useAppStore((s) => s.errorKind);
  const durationMs = useAppStore((s) => s.durationMs);
  const rows = useAppStore((s) => s.rows);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const runQuery = useAppStore((s) => s.runQuery);
  const activeSnapshotId = useAppStore((s) => s.activeSnapshotId);
  const saveCurrentAsSnapshot = useAppStore((s) => s.saveCurrentAsSnapshot);
  const exportWorkspace = useAppStore((s) => s.exportWorkspace);
  const importWorkspace = useAppStore((s) => s.importWorkspace);
  const importMessage = useAppStore((s) => s.importMessage);
  const clearImportMessage = useAppStore((s) => s.clearImportMessage);
  const maximizedResults = useAppStore((s) => s.maximizedResults);
  const toggleMaximizedResults = useAppStore((s) => s.toggleMaximizedResults);
  const denseTable = useAppStore((s) => s.denseTable);
  const toggleDenseTable = useAppStore((s) => s.toggleDenseTable);
  const columns = useAppStore((s) => s.columns);
  const cacheHit = useAppStore((s) => s.cacheHit);
  const cacheAge = useAppStore((s) => s.cacheAge);
  const demoMode = useAppStore((s) => s.demoMode);
  const templates = useAppStore((s) => s.templates);
  const loadTemplate = useAppStore((s) => s.loadTemplate);
  const setPaletteOpen = useAppStore((s) => s.setPaletteOpen);
  const setShortcutsOpen = useAppStore((s) => s.setShortcutsOpen);
  const streamingProgress = useAppStore((s) => s.streamingProgress);
  const cancelQuery = useAppStore((s) => s.cancelQuery);

  const [connOpen, setConnOpen] = useState(false);
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [sidebarTab, setSidebarTab] = useState<
    "templates" | "snapshots" | "history"
  >("templates");
  const [snapOpen, setSnapOpen] = useState(false);
  const [snapName, setSnapName] = useState("");
  const [snapDesc, setSnapDesc] = useState("");
  const [excelOpen, setExcelOpen] = useState(false);

  useEffect(() => {
    void initialize();
    window.sap.getConnection().then((c) => {
      setHasConnection(!!c);
    });
  }, [initialize]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (isMeta && e.key === "Enter") {
        e.preventDefault();
        void runQuery({ force: e.shiftKey });
        return;
      }
      if (isMeta && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (isMeta && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        toggleMaximizedResults();
        return;
      }
      if (isMeta && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        toggleDenseTable();
        return;
      }
      if (isMeta && /^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        const tpl = templates[idx];
        if (tpl) {
          e.preventDefault();
          loadTemplate(tpl.id);
          setTimeout(() => void runQuery(), 40);
        }
        return;
      }
      if (!typing && e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    runQuery,
    setPaletteOpen,
    toggleMaximizedResults,
    toggleDenseTable,
    templates,
    loadTemplate,
    setShortcutsOpen,
  ]);

  return (
    <div className="h-screen w-screen flex flex-col text-slate-100 relative">
      <Aurora />
      <Header
        onOpenSettings={() => setConnOpen(true)}
        hasConnection={hasConnection}
        onExport={() => void exportWorkspace()}
        onImport={() => void importWorkspace()}
        onOpenExcel={() => setExcelOpen(true)}
        setPaletteOpen={setPaletteOpen}
      />

      <div className="flex-1 min-h-0 grid grid-cols-[280px_1fr] gap-0 relative z-10">
        <aside className="border-r border-white/5 bg-bg-panel/50 flex flex-col min-h-0">
          <div className="flex items-center gap-1 p-2 border-b border-white/5">
            {(
              [
                { id: "templates", label: "Modèles" },
                { id: "snapshots", label: "Captures" },
                { id: "history", label: "Historique" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setSidebarTab(t.id)}
                data-active={sidebarTab === t.id}
                className={cn(
                  "tab-pill flex-1 text-xs font-medium rounded-md px-2 py-1.5 transition",
                  sidebarTab === t.id
                    ? "text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0">
            {sidebarTab === "templates" ? (
              <TemplatesPanel />
            ) : sidebarTab === "snapshots" ? (
              <SnapshotsPanel />
            ) : (
              <HistoryPanel />
            )}
          </div>
        </aside>

        <main className="p-4 min-h-0 overflow-hidden flex flex-col gap-3">
          {!maximizedResults && (
          <Card className="relative overflow-hidden">
            {running && <div className="scanbar" />}
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-lg bg-accent-gradient flex items-center justify-center shadow-glow">
                  <Database className="size-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold grad-text">
                  Éditeur de requête
                </span>
                <Badge tone="accent">SQL Server</Badge>
              </div>
              <div className="flex items-center gap-2">
                {running && streamingProgress > 0 && (
                  <span className="text-[11px] text-accent-glow tabular-nums font-mono">
                    {streamingProgress.toLocaleString()} lignes…
                  </span>
                )}
                <span className="hidden md:flex items-center gap-1 text-[11px] text-muted">
                  <Keyboard className="size-3" />
                  Ctrl/Cmd + Enter
                </span>
                {running ? (
                  <Button
                    variant="secondary"
                    onClick={cancelQuery}
                    className="border-danger/40 text-danger hover:bg-danger/10"
                  >
                    <Square className="size-3.5 fill-current" />
                    Annuler
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => void runQuery()}
                  >
                    <Play className="size-3.5" />
                    Exécuter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="h-[170px]">
                <QueryEditor />
              </div>
              <div className="px-5 py-3 border-t border-white/5">
                <VariablePanel />
              </div>
            </CardBody>
          </Card>
          )}

          {!maximizedResults && rows.length > 0 && !error && <KpiStrip />}

          <Card className="flex-1 min-h-0 flex flex-col glass-lift">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-bg-soft border border-border rounded-lg p-1">
                  <button
                    onClick={() => setView("results")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition",
                      view === "results"
                        ? "bg-accent/20 text-accent-glow"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                    )}
                  >
                    <Table2 className="size-3.5" />
                    Table
                  </button>
                  <button
                    onClick={() => setView("chart")}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition",
                      view === "chart"
                        ? "bg-accent/20 text-accent-glow"
                        : "text-slate-400 hover:text-white hover:bg-white/5",
                    )}
                  >
                    <BarChart3 className="size-3.5" />
                    Graphique
                  </button>
                </div>
                {rows.length > 0 && (
                  <Badge tone="success">
                    {rows.length.toLocaleString()} résultats
                  </Badge>
                )}
                {durationMs != null && !cacheHit && (
                  <Badge>{durationMs} ms</Badge>
                )}
                {cacheHit && cacheAge != null && (
                  <button
                    onClick={() => void runQuery({ force: true })}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border bg-accent/10 text-accent-glow border-accent/30 hover:bg-accent/20 transition"
                    title="Ce résultat vient du cache local. Cliquez pour forcer un rafraîchissement."
                  >
                    <span className="size-1.5 rounded-full bg-accent-glow animate-pulse" />
                    Cache · {cacheAge}s · Actualiser
                  </button>
                )}
                {activeSnapshotId && (
                  <Badge tone="accent">Capture · hors ligne</Badge>
                )}
                {demoMode && <Badge tone="warn">Mode démo</Badge>}
              </div>
              <div className="flex items-center gap-2">
                {rows.length > 0 && !activeSnapshotId && (
                  <Button
                    id="btn-open-snapshot"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSnapOpen(true)}
                  >
                    <Camera className="size-3.5" />
                    Capturer
                  </Button>
                )}
                {rows.length > 0 && view === "results" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleDenseTable}
                    title={denseTable ? "Mode confortable" : "Mode dense"}
                  >
                    <Rows3 className="size-3.5" />
                  </Button>
                )}
                {rows.length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={toggleMaximizedResults}
                    title={
                      maximizedResults
                        ? "Réduire (afficher l'éditeur)"
                        : "Plein écran"
                    }
                  >
                    {maximizedResults ? (
                      <>
                        <Minimize2 className="size-3.5" />
                        Réduire
                      </>
                    ) : (
                      <>
                        <Maximize2 className="size-3.5" />
                        Plein écran
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody className="flex-1 min-h-0 flex flex-col">
              {error ? (
                <div
                  className={`flex items-start gap-3 p-4 rounded-xl border ${
                    errorKind === "network"
                      ? "bg-warn/5 border-warn/30"
                      : "bg-danger/5 border-danger/20"
                  }`}
                >
                  {errorKind === "network" ? (
                    <Wifi className="size-5 text-warn flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="size-5 text-danger flex-shrink-0" />
                  )}
                  <div className="text-sm">
                    <p
                      className={`font-semibold ${
                        errorKind === "network" ? "text-warn" : "text-danger"
                      }`}
                    >
                      {errorKind === "network"
                        ? "Serveur SQL injoignable"
                        : errorKind === "auth"
                          ? "Authentification refusée"
                          : errorKind === "database"
                            ? "Base inaccessible"
                            : "Erreur d'exécution"}
                    </p>
                    {errorHint && (
                      <p className="text-slate-200 mt-1 text-[13px]">
                        {errorHint}
                      </p>
                    )}
                    <p className="text-slate-400 mt-2 font-mono text-[11px] whitespace-pre-wrap">
                      {error}
                    </p>
                  </div>
                </div>
              ) : running && rows.length === 0 ? (
                <SkeletonRows columns={columns} />
              ) : rows.length === 0 && !running ? (
                <EmptyState />
              ) : view === "results" ? (
                <ResultsTable />
              ) : (
                <ChartView />
              )}
            </CardBody>
          </Card>
        </main>
      </div>

      <ConnectionDialog
        open={connOpen}
        onClose={() => setConnOpen(false)}
        onSaved={() => setHasConnection(true)}
      />

      <ExcelExportDialog
        open={excelOpen}
        onClose={() => setExcelOpen(false)}
      />

      <CommandPalette />
      <ShortcutsOverlay />

      <Modal
        open={snapOpen}
        onClose={() => setSnapOpen(false)}
        title="Capturer les résultats"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSnapOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!snapName.trim()) return;
                await saveCurrentAsSnapshot(
                  snapName.trim(),
                  snapDesc.trim() || undefined,
                );
                setSnapName("");
                setSnapDesc("");
                setSnapOpen(false);
              }}
            >
              <Camera className="size-3.5" />
              Enregistrer
            </Button>
          </>
        }
      >
        <p className="text-xs text-muted mb-3">
          Les lignes actuelles et leurs colonnes sont figées et sauvegardées
          localement. Exportez ensuite votre espace de travail pour partager ce
          jeu de données avec un collègue qui n'a pas d'accès SQL.
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Nom</span>
            <Input
              className="mt-1"
              value={snapName}
              onChange={(e) => setSnapName(e.target.value)}
              placeholder="Ex: Ventes Q1 — vendeur 12"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">
              Description
            </span>
            <Input
              className="mt-1"
              value={snapDesc}
              onChange={(e) => setSnapDesc(e.target.value)}
              placeholder="Optionnel"
            />
          </label>
        </div>
      </Modal>

      {importMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
          <div className="glass rounded-xl shadow-panel border border-border px-4 py-3 flex items-start gap-3 max-w-md">
            <div className="text-xs text-slate-200">{importMessage}</div>
            <button
              className="text-muted hover:text-white"
              onClick={clearImportMessage}
              aria-label="Fermer"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({
  onOpenSettings,
  hasConnection,
  onExport,
  onImport,
  onOpenExcel,
  setPaletteOpen,
}: {
  onOpenSettings: () => void;
  hasConnection: boolean | null;
  onExport: () => void;
  onImport: () => void;
  onOpenExcel: () => void;
  setPaletteOpen: (open: boolean) => void;
}) {
  return (
    <header className="titlebar-drag relative z-20 flex items-center justify-between px-5 h-12 border-b border-white/5 bg-bg-panel/60 backdrop-blur-xl">
      <div
        className="absolute inset-x-0 -bottom-px h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(124,92,255,0.4), rgba(34,211,238,0.2), transparent)",
        }}
      />
      <div className="flex items-center gap-2.5">
        <div className="size-7 rounded-lg bg-accent-gradient flex items-center justify-center shadow-glow animate-pulseGlow">
          <Database className="size-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold grad-text">
            SAP Query Desktop
          </div>
          <div className="text-[10.5px] text-muted">
            Interrogez votre datawarehouse SAP en toute simplicité
          </div>
        </div>
      </div>
      <div className="titlebar-nodrag flex items-center gap-2">
        {hasConnection === true ? (
          <Badge tone="success">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            Connecté
          </Badge>
        ) : hasConnection === false ? (
          <Badge tone="warn">
            <span className="size-1.5 rounded-full bg-warn" />
            Non connecté
          </Badge>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={onImport}
          title="Importer un fichier .sapwork d'un collègue"
        >
          <Upload className="size-3.5" />
          Importer
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          title="Exporter votre espace de travail (.sapwork)"
        >
          <Download className="size-3.5" />
          Partager
        </Button>
        <Button
          id="btn-open-excel"
          variant="secondary"
          size="sm"
          onClick={onOpenExcel}
          title="Exporter en Excel avec un onglet Accueil et une feuille par table"
          className="bg-accent-gradient text-white border-0 shadow-glow hover:brightness-110"
        >
          <FileSpreadsheet className="size-3.5" />
          Excel
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPaletteOpen(true)}
          title="Palette de commandes"
          className="text-slate-200"
        >
          <Command className="size-3.5" />
          <kbd className="text-[10px] text-muted border border-border rounded px-1 py-0.5 font-mono ml-0.5">
            K
          </kbd>
        </Button>
        <Button id="btn-open-connection" variant="secondary" size="sm" onClick={onOpenSettings}>
          <Settings className="size-3.5" />
          Connexion
        </Button>
      </div>
    </header>
  );
}
