import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { SettleScreen } from "@/components/app/settle-screen";

export const metadata: Metadata = { title: "Settle" };

export default function SettlePage() {
  return (
    <>
      <PageHeader
        eyebrow="Settle"
        title="Settle, redeem and claim."
        description="At maturity the index is frozen. Redeem your PT for mstNEAR and claim the yield your YT collected."
      />
      <SettleScreen />
    </>
  );
}
