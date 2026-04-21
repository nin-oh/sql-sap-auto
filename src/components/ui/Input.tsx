import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Props = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg bg-bg-soft border border-border px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
        "hover:border-border-soft transition-colors ring-accent",
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = "Input";
