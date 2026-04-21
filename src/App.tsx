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
} from "lucide-react";
import { Button } from "./components/ui/Button";
import { Badge } from "./components/ui/Badge";
import { Card, CardBody, CardHeader } from "./components/ui/Card";
import { QueryEditor } from "./components/QueryEditor";
import { VariablePanel } from "./components/VariablePanel";
import { ResultsTable } from "./components/ResultsTable";
import { ChartView } from "./components/ChartView";
import { HistoryPanel } from "./components/HistoryPanel";
import { TemplatesPanel } from "./components/TemplatesPanel";
import { ConnectionDialog } from "./components/ConnectionDialog";
import { useAppStore } from "./store/appStore";
import { cn } from "./lib/cn";

export default function App() {
  const initialize = useAppStore((s) => s.initialize);
  const running = useAppStore((s) => s.running);
  const error = useAppStore((s) => s.error);
  const durationMs = useAppStore((s) => s.durationMs);
  const rows = useAppStore((s) => s.rows);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const runQuery = useAppStore((s) => s.runQuery);

  const [connOpen, setConnOpen] = useState(false);
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"templates" | "history">(
    "templates",
  );

  useEffect(() => {
    void initialize();
    window.sap.getConnection().then((c) => {
      setHasConnection(!!c);
      if (!c) setConnOpen(true);
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
      />

      <div className="flex-1 min-h-0 grid grid-cols-[280px_1fr] gap-0">
        <aside className="border-r border-white/5 bg-bg-panel/50 flex flex-col min-h-0">
          <div className="flex items-center gap-1 p-2 border-b border-white/5">
            <button
              onClick={() => setSidebarTab("templates")}
              className={cn(
                "flex-1 text-xs font-medium rounded-md px-2 py-1.5 transition",
                sidebarTab === "templates"
                  ? "bg-accent/15 text-accent-glow"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
            >
              Modèles
            </button>
            <button
              onClick={() => setSidebarTab("history")}
              className={cn(
                "flex-1 text-xs font-medium rounded-md px-2 py-1.5 transition",
                sidebarTab === "history"
                  ? "bg-accent/15 text-accent-glow"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
              )}
            >
              Historique
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {sidebarTab === "templates" ? <TemplatesPanel /> : <HistoryPanel />}
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
                {durationMs != null && (
                  <Badge>{durationMs} ms</Badge>
                )}
              </div>
            </CardHeader>
            <CardBody className="flex-1 min-h-0 flex flex-col">
              {error ? (
                <div className="flex items-start gap-3 p-4 bg-danger/5 border border-danger/20 rounded-xl">
                  <AlertTriangle className="size-5 text-danger flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-danger font-semibold">
                      Erreur d'exécution
                    </p>
                    <p className="text-slate-300 mt-1 font-mono text-xs whitespace-pre-wrap">
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
    </div>
  );
}

function Header({
  onOpenSettings,
  hasConnection,
}: {
  onOpenSettings: () => void;
  hasConnection: boolean | null;
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
        <Button variant="secondary" size="sm" onClick={onOpenSettings}>
          <Settings className="size-3.5" />
          Connexion
        </Button>
      </div>
    </header>
  );
}
