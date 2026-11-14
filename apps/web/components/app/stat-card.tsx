import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type StatCardProps = {
  label: string;
  value: string;
  unit?: string;
  caption?: ReactNode;
  tone?: "pt" | "yt" | "plain";
  action?: ReactNode;
  className?: string;
};

export function StatCard({ label, value, unit, caption, tone = "plain", action, className }: StatCardProps) {
  return (
    <Card tone={tone === "plain" ? "plain" : tone} className={cn("flex flex-col justify-between gap-5 p-6", className)}>
      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-ui font-medium text-fg-65">
          {tone !== "plain" ? (
            <span className={cn("size-2 rounded-pill", tone === "pt" ? "bg-ice" : "bg-pink")} aria-hidden="true" />
          ) : null}
          {label}
        </p>
        <p
          className={cn(
            "num flex flex-wrap items-baseline gap-x-2 text-h3 leading-[35px] font-medium",
            tone === "pt" ? "text-ice" : tone === "yt" ? "text-pink" : "text-fg",
          )}
        >
          <span className="min-w-0 break-all">{value}</span>
          {unit ? <span className="text-ui font-medium text-fg-65">{unit}</span> : null}
        </p>
        {caption ? <p className="text-ui text-fg-50">{caption}</p> : null}
      </div>
      {action}
    </Card>
  );
}
