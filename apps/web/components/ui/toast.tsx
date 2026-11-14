"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ToastTone = "info" | "success" | "error";
export type ToastInput = { message: string; tone?: ToastTone; href?: string; hrefLabel?: string };
type ToastItem = ToastInput & { id: number; tone: ToastTone };

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const dotStyles: Record<ToastTone, string> = { info: "bg-ice", success: "bg-ok", error: "bg-danger" };
const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (input: ToastInput) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { ...input, id, tone: input.tone ?? "info" }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[70] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-full animate-toast-in items-center gap-3 rounded-pill bg-[#28282c99] px-[18px] py-2.5 text-ui text-fg shadow-float backdrop-blur-[10px]"
          >
            <span className={cn("size-2 shrink-0 rounded-pill", dotStyles[toast.tone])} aria-hidden="true" />
            <span className="min-w-0 break-words">{toast.message}</span>
            {toast.href ? (
              <a
                href={toast.href}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 font-medium text-ice underline-offset-4 hover:underline"
              >
                {toast.hrefLabel ?? "View"}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-fg-65 transition-colors hover:text-fg"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3.5" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): (toast: ToastInput) => void {
  const push = useContext(ToastContext);
  if (!push) throw new Error("useToast must be used inside ToastProvider");
  return push;
}
