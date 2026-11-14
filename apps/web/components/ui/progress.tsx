import { cn } from "@/lib/cn";

type ProgressProps = {
  value: number;
  tone?: "pink" | "ice" | "white";
  label: string;
  className?: string;
};

const toneStyles = { pink: "bg-pink", ice: "bg-ice", white: "bg-fg" } as const;

export function Progress({ value, tone = "pink", label, className }: ProgressProps) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      className={cn("h-1.5 w-full overflow-hidden rounded-pill bg-fill-10", className)}
    >
      <div
        className={cn("h-full origin-left rounded-pill transition-transform duration-700 ease-out-expo", toneStyles[tone])}
        style={{ transform: `scaleX(${clamped})` }}
      />
    </div>
  );
}
