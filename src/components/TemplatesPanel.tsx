import { useState } from "react";
import { useAppStore } from "../store/appStore";
import {
  BookmarkPlus,
  FileCode2,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";

export function TemplatesPanel() {
  const templates = useAppStore((s) => s.templates);
  const active = useAppStore((s) => s.activeTemplateId);
  const loadTemplate = useAppStore((s) => s.loadTemplate);
  const deleteTemplate = useAppStore((s) => s.deleteTemplate);
  const save = useAppStore((s) => s.saveCurrentAsTemplate);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const onSave = async () => {
    if (!name.trim()) return;
    await save(name.trim(), description.trim() || undefined);
    setOpen(false);
    setName("");
    setDescription("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Star className="size-4 text-accent-glow" />
          Modèles
        </div>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <BookmarkPlus className="size-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto px-2 py-2">
        <ul className="space-y-1">
          {templates.map((t) => (
            <li
              key={t.id}
              className={`group px-3 py-2.5 rounded-lg cursor-pointer border transition ${
                active === t.id
                  ? "bg-accent/10 border-accent/30"
                  : "border-transparent hover:bg-white/5 hover:border-border"
              }`}
              onClick={() => loadTemplate(t.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode2 className="size-3.5 text-accent-glow flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-100 truncate">
                    {t.name}
                  </span>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-danger transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteTemplate(t.id);
                  }}
                  title="Supprimer"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {t.description && (
                <p className="text-[11px] text-muted mt-1 line-clamp-2">
                  {t.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Enregistrer comme modèle"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={onSave}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">Nom</span>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ventes mensuelles par vendeur"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-300">
              Description
            </span>
            <Input
              className="mt-1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionnel"
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
