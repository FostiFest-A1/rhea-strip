import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type InputProps = ComponentProps<"input">;

export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md bg-fill-5 px-3 text-ui text-fg shadow-input outline-none",
        "transition-shadow duration-150 placeholder:text-fg-40 focus:shadow-input-focus",
        className,
      )}
      {...rest}
    />
  );
}

type AmountFieldProps = Omit<ComponentProps<"input">, "size"> & {
  label: string;
  unit: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  invalid?: boolean;
};

export function AmountField({ label, unit, hint, action, invalid, id, className, ...rest }: AmountFieldProps) {
  const inputId = id ?? `amount-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3 text-ui font-medium text-fg-65">
        <label htmlFor={inputId}>{label}</label>
        {hint ? <span className="num">{hint}</span> : null}
      </div>
      <div
        className={cn(
          "flex h-14 items-center gap-3 rounded-xl bg-fill-5 pr-3 pl-4 shadow-input transition-shadow duration-150 focus-within:shadow-input-focus",
          invalid && "shadow-[inset_0_0_0_1px_#ff5a4e99] focus-within:shadow-[inset_0_0_0_1px_#ff5a4e]",
        )}
      >
        <input
          id={inputId}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          className="num min-w-0 flex-1 bg-transparent text-title text-fg outline-none placeholder:text-fg-40"
          {...rest}
        />
        {action}
        <span className="shrink-0 rounded-pill bg-fill-10 px-3 py-1.5 text-ui font-medium text-fg shadow-glass">
          {unit}
        </span>
      </div>
    </div>
  );
}
