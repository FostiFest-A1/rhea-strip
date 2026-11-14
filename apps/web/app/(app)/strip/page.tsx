import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { StripScreen } from "@/components/app/strip-screen";

export const metadata: Metadata = { title: "Strip" };

export default function StripPage() {
  return (
    <>
      <PageHeader
        eyebrow="Strip"
        title="Split mstNEAR into PT and YT."
        description="Deposit mstNEAR and receive a principal token and a yield token of equal value. Hold one, sell the other."
      />
      <StripScreen />
    </>
  );
}
