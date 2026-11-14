import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type PillTone = "neutral" | "pt" | "yt" | "ok" | "warn" | "danger";

const toneStyles: Record<PillTone, string> = {
  neutral: "bg-fill-10 text-fg-80",
  pt: "bg-ice/10 text-ice shadow-pt-line",
  yt: "bg-pink/10 text-pink shadow-yt-line",
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
  danger: "bg-danger/10 text-danger",
};

type PillProps = ComponentProps<"span"> & { tone?: PillTone };

export function Pill({ tone = "neutral", className, ...rest }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill px-3 py-1.5 text-ui font-medium whitespace-nowrap",
        toneStyles[tone],
        className,
      )}
      {...rest}
    />
  );
}

export function Eyebrow({ className, ...rest }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-[10px] leading-[11px] font-bold tracking-[3px] text-pink uppercase md:text-eyebrow md:tracking-eyebrow",
        className,
      )}
      {...rest}
    />
  );
}
