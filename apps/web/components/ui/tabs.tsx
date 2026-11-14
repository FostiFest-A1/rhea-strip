"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabOption<T extends string> = { value: T; label: string; tone?: "pt" | "yt" };

type TabsProps<T extends string> = {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  children: ReactNode;
};

export function Tabs<T extends string>({ options, value, onChange, label, children }: TabsProps<T>) {
  const baseId = useId();

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const step = event.key === "ArrowRight" ? 1 : -1;
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    document.getElementById(`${baseId}-tab-${next.value}`)?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label={label} className="inline-flex gap-1 rounded-pill bg-fill-5 p-1 shadow-card">
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              id={`${baseId}-tab-${option.value}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "h-10 rounded-pill px-6 text-body font-bold tracking-tightest transition-[background-color,color,transform] duration-300 ease-out-expo active:scale-[.98]",
                selected ? "bg-fg text-ink-card" : "text-fg-80 hover:bg-fill-10 hover:text-fg",
              )}
            >
              <span className="inline-flex items-center gap-2">
                {option.tone ? (
                  <span className={cn("size-2 rounded-pill", option.tone === "pt" ? "bg-ice" : "bg-pink")} aria-hidden="true" />
                ) : null}
                {option.label}
              </span>
            </button>
          );
        })}
      </div>
      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${value}`} className="mt-8">
        {children}
      </div>
    </div>
  );
}
