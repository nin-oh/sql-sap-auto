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

  const [connOpen, setConnOpen] = useState(false);
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [sidebarTab, setSidebarTab] = useState<
    "templates" | "snapshots" | "history"
  >("templates");
  const [snapOpen, setSnapOpen] = useState(false);
  const [snapName, setSnapName] = useState("");
  const [snapDesc, setSnapDesc] = useState("");

  useEffect(() => {
    void initialize();
    window.sap.getConnection().then((c) => {
      setHasConnection(!!c);
    });
  }, [initialize]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void runQuery();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runQuery]);

  return (
    <div className="h-screen w-screen flex flex-col text-slate-100">
      <Header
        onOpenSettings={() => setConnOpen(true)}
        hasConnection={hasConnection}
        onExport={() => void exportWorkspace()}
        onImport={() => void importWorkspace()}
      />

      <div className="flex-1 min-h-0 grid grid-cols-[280px_1fr] gap-0">
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
                className={cn(
                  "flex-1 text-xs font-medium rounded-md px-2 py-1.5 transition",
                  sidebarTab === t.id
                    ? "bg-accent/15 text-accent-glow"
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

        <main className="p-4 min-h-0 overflow-hidden flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-gradient-to-br from-accent to-[#6b4ff0] flex items-center justify-center shadow-glow">
                  <Database className="size-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold">Éditeur de requête</span>
                <Badge tone="accent">SQL Server</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden md:flex items-center gap-1 text-[11px] text-muted">
                  <Keyboard className="size-3" />
                  Ctrl/Cmd + Enter
                </span>
                <Button
                  variant="primary"
                  onClick={() => void runQuery()}
                  disabled={running}
                >
                  {running ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  Exécuter
                </Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <div className="h-[220px]">
                <QueryEditor />
              </div>
              <div className="px-5 py-4 border-t border-white/5">
                <VariablePanel />
              </div>
            </CardBody>
          </Card>

          <Card className="flex-1 min-h-0 flex flex-col">
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
                {durationMs != null && <Badge>{durationMs} ms</Badge>}
                {activeSnapshotId && (
                  <Badge tone="accent">Capture · hors ligne</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {rows.length > 0 && !activeSnapshotId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSnapOpen(true)}
                  >
                    <Camera className="size-3.5" />
                    Capturer
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
}: {
  onOpenSettings: () => void;
  hasConnection: boolean | null;
  onExport: () => void;
  onImport: () => void;
}) {
  return (
    <header className="titlebar-drag flex items-center justify-between px-5 h-12 border-b border-white/5 bg-bg-panel/70 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="size-7 rounded-lg bg-gradient-to-br from-accent via-[#6b4ff0] to-[#4a2dcf] flex items-center justify-center shadow-glow animate-pulseGlow">
          <Database className="size-4 text-white" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">SAP Query Desktop</div>
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
          title="Exporter votre espace de travail à partager"
        >
          <Download className="size-3.5" />
          Exporter
        </Button>
        <Button variant="secondary" size="sm" onClick={onOpenSettings}>
          <Settings className="size-3.5" />
          Connexion
        </Button>
      </div>
    </header>
  );
}
