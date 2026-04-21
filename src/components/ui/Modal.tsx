import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`glass rounded-2xl shadow-panel w-full ${width} animate-slideUp`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-white/5 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
