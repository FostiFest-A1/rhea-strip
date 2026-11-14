import { Card } from "@/components/ui/card";

export function PricingNote({ side }: { side: "yt" | "pt" }) {
  const yt = side === "yt";
  return (
    <Card className="flex flex-col gap-4 p-6 md:p-8">
      <h2 className="text-title font-medium text-fg">How the price is set</h2>
      <ul className="flex flex-col gap-3 text-body text-fg-80">
        <li>
          You choose an implied APY. The ask follows from it and from the time left to maturity.
        </li>
        <li>
          {yt
            ? "A lower implied APY sells your YT for less. YT value trends toward zero as maturity approaches."
            : "A higher fixed APY sells your PT for less, because the buyer earns more by holding it to maturity."}
        </li>
        <li>Offers fill completely or not at all. Cancel before someone buys.</li>
        <li>Sale proceeds land as a credit you withdraw from the Portfolio page.</li>
      </ul>
    </Card>
  );
}
