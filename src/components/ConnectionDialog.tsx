import { useEffect, useState } from "react";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Loader2, CheckCircle2, AlertTriangle, Database } from "lucide-react";
import type { ConnectionConfig } from "../lib/types";

const EMPTY: ConnectionConfig = {
  server: "192.168.1.240",
  database: "DATAWAREHOUSE",
  user: "",
  password: "",
  port: 1433,
  encrypt: false,
  trustServerCertificate: true,
};

export function ConnectionDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cfg, setCfg] = useState<ConnectionConfig>(EMPTY);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<
    | { success: true; version: string }
    | { success: false; error: string }
    | null
  >(null);

  useEffect(() => {
    if (!open) return;
    window.sap.getConnection().then((c) => {
      if (c) setCfg({ ...EMPTY, ...c });
    });
    setResult(null);
  }, [open]);

  const update = (patch: Partial<ConnectionConfig>) =>
    setCfg((c) => ({ ...c, ...patch }));

  const test = async () => {
    setTesting(true);
    setResult(null);
    const r = await window.sap.testConnection(cfg);
    setTesting(false);
    setResult(
      r.success
        ? { success: true, version: r.version ?? "" }
        : { success: false, error: r.error ?? "Unknown error" },
    );
  };

  const save = async () => {
    await window.sap.saveConnection(cfg);
    onSaved();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connexion à la base SQL Server"
      width="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="secondary" onClick={test} disabled={testing}>
            {testing ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Database className="size-3.5" />
            )}
            Tester
          </Button>
          <Button variant="primary" onClick={save}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2">
          <span className="text-xs font-semibold text-slate-300">Serveur</span>
          <Input
            className="mt-1"
            value={cfg.server}
            onChange={(e) => update({ server: e.target.value })}
            placeholder="192.168.1.240"
          />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-300">Port</span>
          <Input
            className="mt-1"
            type="number"
            value={cfg.port ?? 1433}
            onChange={(e) => update({ port: Number(e.target.value) })}
          />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-300">
            Base de données
          </span>
          <Input
            className="mt-1"
            value={cfg.database}
            onChange={(e) => update({ database: e.target.value })}
          />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-300">
            Utilisateur
          </span>
          <Input
            className="mt-1"
            value={cfg.user}
            onChange={(e) => update({ user: e.target.value })}
            autoComplete="username"
          />
        </label>
        <label>
          <span className="text-xs font-semibold text-slate-300">
            Mot de passe
          </span>
          <Input
            className="mt-1"
            type="password"
            value={cfg.password}
            onChange={(e) => update({ password: e.target.value })}
            autoComplete="current-password"
          />
        </label>
        <label className="flex items-center gap-2 col-span-2 mt-1 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={cfg.encrypt ?? false}
            onChange={(e) => update({ encrypt: e.target.checked })}
            className="accent-accent"
          />
          Chiffrer la connexion (TLS)
        </label>
        <label className="flex items-center gap-2 col-span-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={cfg.trustServerCertificate ?? true}
            onChange={(e) =>
              update({ trustServerCertificate: e.target.checked })
            }
            className="accent-accent"
          />
          Faire confiance au certificat du serveur
        </label>
      </div>

      {result && (
        <div className="mt-4">
          {result.success ? (
            <div className="flex items-start gap-2 p-3 bg-success/5 border border-success/20 rounded-lg">
              <CheckCircle2 className="size-4 text-success flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="text-success font-semibold">Connexion réussie</p>
                <p className="text-slate-300 mt-1 font-mono text-[10.5px] break-all">
                  {result.version.slice(0, 200)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/20 rounded-lg">
              <AlertTriangle className="size-4 text-danger flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="text-danger font-semibold">Échec de connexion</p>
                <p className="text-slate-300 mt-1 font-mono text-[10.5px] break-all">
                  {result.error}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 text-[11px] text-muted flex items-center gap-1.5">
        <Badge tone="accent">Sécurisé</Badge>
        Le mot de passe est chiffré via le trousseau du système d'exploitation.
      </div>
    </Modal>
  );
}
