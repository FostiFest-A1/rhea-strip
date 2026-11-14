import { fmtCountdown } from "@rhea/sdk/pricing";
import { cn } from "@/lib/cn";

type CountdownProps = {
  remainingMs: number;
  label?: string;
  className?: string;
};

export function Countdown({ remainingMs, label = "Maturity in", className }: CountdownProps) {
  const matured = remainingMs <= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill bg-fill-10 px-4 py-2 text-ui font-medium text-fg-80 shadow-glass",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-pill", matured ? "bg-ok" : "bg-pink")} aria-hidden="true" />
      {matured ? null : <span>{label}</span>}
      <span className="num text-fg">{fmtCountdown(remainingMs)}</span>
    </span>
  );
}
