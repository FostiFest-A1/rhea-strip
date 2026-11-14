import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { TradeScreen } from "@/components/app/trade-screen";

export const metadata: Metadata = { title: "Trade" };

export default function TradePage() {
  return (
    <>
      <PageHeader
        eyebrow="Trade"
        title="Sell future yield. Buy it back cheaper."
        description="Set the implied APY you will accept and list your YT. Or fill an open offer in one click."
      />
      <TradeScreen />
    </>
  );
}
