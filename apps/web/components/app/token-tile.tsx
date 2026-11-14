import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type TokenTileProps = {
  kind: "pt" | "yt";
  symbol: string;
  value: string;
  caption: string;
};

export function TokenTile({ kind, symbol, value, caption }: TokenTileProps) {
  const pt = kind === "pt";
  return (
    <Card
      tone={pt ? "pt" : "yt"}
      className={cn(
        "bloom flex flex-col gap-3 p-5",
        pt ? "[--bloom-color:var(--color-ice)]" : "[--bloom-color:var(--color-pink)]",
      )}
    >
      <p className="flex items-center gap-2 text-ui font-medium text-fg-65">
        <span className={cn("size-2 rounded-pill", pt ? "bg-ice" : "bg-pink")} aria-hidden="true" />
        {pt ? "Principal token" : "Yield token"}
      </p>
      <p className={cn("num truncate text-h3 leading-[35px] font-medium", pt ? "text-ice" : "text-pink")}>{value}</p>
      <div className="flex flex-col gap-0.5">
        <p className="num truncate text-ui text-fg">{symbol}</p>
        <p className="text-ui text-fg-50">{caption}</p>
      </div>
    </Card>
  );
}
