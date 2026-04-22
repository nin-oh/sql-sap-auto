import { Modal } from "./ui/Modal";
import { useAppStore } from "../store/appStore";

type Entry = { keys: string[]; label: string };

const SHORTCUTS: Array<{ group: string; items: Entry[] }> = [
  {
    group: "Général",
    items: [
      { keys: ["⌘/Ctrl", "K"], label: "Ouvrir la palette de commandes" },
      { keys: ["?"], label: "Afficher cette aide" },
      { keys: ["Esc"], label: "Fermer la boîte de dialogue courante" },
    ],
  },
  {
    group: "Requêtes",
    items: [
      { keys: ["⌘/Ctrl", "↵"], label: "Exécuter la requête" },
      { keys: ["⌘/Ctrl", "Shift", "↵"], label: "Exécuter sans cache" },
      { keys: ["⌘/Ctrl", "1–9"], label: "Charger le modèle N°1 à 9" },
    ],
  },
  {
    group: "Vue",
    items: [
      { keys: ["⌘/Ctrl", "M"], label: "Basculer plein écran" },
      { keys: ["⌘/Ctrl", "D"], label: "Basculer mode dense" },
    ],
  },
];

export function ShortcutsOverlay() {
  const open = useAppStore((s) => s.shortcutsOpen);
  const setOpen = useAppStore((s) => s.setShortcutsOpen);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Raccourcis clavier"
      width="max-w-lg"
    >
      <div className="space-y-5">
        {SHORTCUTS.map((sec) => (
          <div key={sec.group}>
            <h4 className="text-[10.5px] font-semibold uppercase tracking-wider text-accent-glow mb-2">
              {sec.group}
            </h4>
            <ul className="space-y-1.5">
              {sec.items.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 text-sm py-1.5 px-2 rounded-md hover:bg-white/[0.03]"
                >
                  <span className="text-slate-200">{e.label}</span>
                  <div className="flex items-center gap-1">
                    {e.keys.map((k, j) => (
                      <kbd
                        key={j}
                        className="text-[10.5px] text-slate-200 bg-bg-soft border border-border rounded px-1.5 py-0.5 font-mono shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Modal>
  );
}
