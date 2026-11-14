"use client";

import { useEffect, useRef, useState } from "react";
import { fmtCountdown } from "@rhea/sdk/pricing";
import { Button } from "@/components/ui/button";
import { useNow } from "@/lib/rhea/hooks";
import { useRhea } from "@/lib/rhea/context";

export function DevClock() {
  const { clock, deployment, client } = useRhea();
  const [open, setOpen] = useState(false);
  const now = useNow();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!clock) return null;
  const remaining = deployment.maturityMs - now;

  return (
    <div className="fixed bottom-16 left-4 z-40 flex w-40 flex-col items-start gap-2">
      {open ? (
        <div id="dev-clock-panel" className="glass flex w-full animate-pop-in flex-col gap-2 rounded-2xl bg-ink-glass p-3">
          <p className="text-ui text-fg-65">
            {remaining > 0 ? (
              <>
                Matures in <span className="num text-fg">{fmtCountdown(remaining)}</span>
              </>
            ) : (
              "The series has matured"
            )}
          </p>
          <Button size="sm" variant="glass" onClick={() => clock.advance(60_000)}>
            +1 minute
          </Button>
          <Button size="sm" variant="glass" onClick={() => clock.advance(5 * 60_000)}>
            +5 minutes
          </Button>
          <Button size="sm" variant="spark" onClick={clock.toMaturity} disabled={remaining <= 0}>
            Jump to maturity
          </Button>
          <p className="num text-ui text-fg-50">{new Date(client.nowMs()).toISOString().slice(11, 19)} UTC</p>
        </div>
      ) : null}
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls="dev-clock-panel"
        onClick={() => setOpen((value) => !value)}
        className="glass inline-flex h-8 items-center gap-2 rounded-pill px-3 text-ui font-medium text-fg transition-transform duration-160 ease-out-expo active:scale-[.98]"
      >
        <span className="size-1.5 rounded-pill bg-warn" aria-hidden="true" />
        Demo clock
      </button>
    </div>
  );
}
