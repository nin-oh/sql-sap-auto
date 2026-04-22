import { Sparkles, Play, Camera, Upload, Command } from "lucide-react";
import { useAppStore } from "../store/appStore";

export function EmptyState() {
  const runQuery = useAppStore((s) => s.runQuery);
  const importWorkspace = useAppStore((s) => s.importWorkspace);
  const snapshots = useAppStore((s) => s.snapshots);
  const enableDemoMode = useAppStore((s) => s.enableDemoMode);
  const templates = useAppStore((s) => s.templates);
  const loadTemplate = useAppStore((s) => s.loadTemplate);
  const demoMode = useAppStore((s) => s.demoMode);
  const setPaletteOpen = useAppStore((s) => s.setPaletteOpen);

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-6 animate-fadeIn">
      <div className="max-w-md text-center relative">
        <div className="absolute inset-0 -z-10 blur-3xl opacity-60">
          <div className="size-64 mx-auto bg-accent/40 rounded-full" />
        </div>
        <div className="size-14 mx-auto rounded-2xl bg-accent-gradient shadow-glow-lg flex items-center justify-center animate-float">
          <Sparkles className="size-6 text-white" />
        </div>
        <h2 className="mt-5 text-2xl font-bold grad-text">
          Prêt à explorer vos données
        </h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Choisissez un modèle dans la barre latérale, remplissez les variables
          puis lancez l'exécution. Vos résultats seront affichés ici avec des
          tables interactives et des graphiques.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => void runQuery()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-gradient text-white text-sm font-medium shadow-glow hover:brightness-110 transition"
          >
            <Play className="size-3.5" />
            Exécuter
          </button>
          <button
            onClick={() => setPaletteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-elev border border-border text-slate-200 text-sm font-medium hover:border-border-soft transition"
          >
            <Command className="size-3.5" />
            Palette
            <kbd className="text-[10px] text-muted border border-border rounded px-1 py-0.5 font-mono ml-1">
              ⌘K
            </kbd>
          </button>
          {!demoMode && (
            <button
              onClick={() => {
                enableDemoMode();
                const tpl = templates.find((t) =>
                  /ventes|SLS_DET/i.test(t.name),
                );
                if (tpl) {
                  loadTemplate(tpl.id);
                  setTimeout(() => void runQuery(), 40);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-elev border border-accent/30 text-accent-glow text-sm font-medium hover:border-accent transition"
              title="Explorer avec des données fictives, sans SQL"
            >
              <Sparkles className="size-3.5" />
              Essayer en démo
            </button>
          )}
          {snapshots.length === 0 && (
            <button
              onClick={() => void importWorkspace()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-elev border border-border text-slate-200 text-sm font-medium hover:border-border-soft transition"
            >
              <Upload className="size-3.5" />
              Importer un .sapwork
            </button>
          )}
        </div>
        <div className="mt-8 flex items-center justify-center gap-6 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent-glow" />
            Tables triables
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-teal" />
            Graphiques dynamiques
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-cyan" />
            Export CSV
          </span>
          <span className="flex items-center gap-1.5">
            <Camera className="size-3" />
            Partage hors ligne
          </span>
        </div>
      </div>
    </div>
  );
}
