import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type CardTone = "plain" | "pt" | "yt";

const toneStyles: Record<CardTone, string> = {
  plain: "shadow-card",
  pt: "shadow-pt-line",
  yt: "shadow-yt-line",
};

type CardProps = ComponentProps<"div"> & { tone?: CardTone };

export function Card({ tone = "plain", className, ...rest }: CardProps) {
  return <div className={cn("relative overflow-hidden rounded-3xl bg-ink", toneStyles[tone], className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: ComponentProps<"h2">) {
  return <h2 className={cn("text-h3 font-normal text-fg", className)} {...rest} />;
}
