import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { PortfolioScreen } from "@/components/app/portfolio-screen";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Your PT, YT and accrued yield."
        description="Watch YT yield accrue, withdraw sale proceeds and manage open offers."
      />
      <PortfolioScreen />
    </>
  );
}
