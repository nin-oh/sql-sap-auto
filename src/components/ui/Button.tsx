import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 ring-accent disabled:opacity-50 disabled:cursor-not-allowed select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-accent to-[#6b4ff0] text-white shadow-glow hover:brightness-110 active:brightness-95",
  secondary:
    "bg-bg-elev text-slate-100 border border-border hover:bg-[#202739] hover:border-border-soft",
  ghost: "text-slate-300 hover:text-white hover:bg-white/5",
  danger:
    "bg-danger/90 text-white hover:bg-danger shadow-[0_0_0_1px_rgba(239,68,68,0.4)]",
};

const sizes: Record<Size, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-4 py-2.5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = "secondary", size = "md", ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    />
  ),
);
Button.displayName = "Button";
