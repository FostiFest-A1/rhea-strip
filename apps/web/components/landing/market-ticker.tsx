"use client";

import { fmtApy, fmtCountdown, ptPrice, tauYears, ytLeverage, ytPrice } from "@rhea/sdk/pricing";
import { Marquee } from "@/components/ui/marquee";
import { amount, ptSymbol } from "@/lib/format";
import { useNow, usePolled } from "@/lib/rhea/hooks";
import { useRhea } from "@/lib/rhea/context";

type TickerItem = { id: string; label: string; value: string; tone?: "pt" | "yt" };

function TickerPill({ item }: { item: TickerItem }) {
  const toneClass = item.tone === "pt" ? "text-ice" : item.tone === "yt" ? "text-pink" : "text-fg";
  return (
    <span className="inline-flex items-center gap-3 rounded-pill bg-fill-5 px-5 py-3 text-ui whitespace-nowrap shadow-card">
      <span className="text-fg-65">{item.label}</span>
      <span className={`num font-medium ${toneClass}`}>{item.value}</span>
    </span>
  );
}

export function MarketTicker() {
  const { client } = useRhea();
  const { data: series } = usePolled((c) => c.series(), 5000);
  const { data: reference } = usePolled((c) => c.mainnetReference(), 60_000);
  const now = useNow();
  const rate = client.deployment().aprBps / 10_000;

  const items: TickerItem[] = [];
  if (series) {
    const tau = tauYears(series.maturityMs, now, series.yearSecs);
    items.push(
      { id: "apy", label: "mstNEAR underlying APY (mock)", value: fmtApy(rate) },
      { id: "maturity", label: `${ptSymbol(series.maturityMs)} matures in`, value: fmtCountdown(series.maturityMs - now), tone: "pt" },
      { id: "stripped", label: "Stripped", value: `${amount(series.totalSy, 2)} mstNEAR` },
    );
    if (tau > 0) {
      items.splice(
        2,
        0,
        { id: "fixed", label: "PT fixed return at that rate", value: fmtApy(1 / ptPrice(rate, tau) - 1), tone: "pt" },
        { id: "leverage", label: "YT leverage at that rate", value: `${ytLeverage(ytPrice(rate, tau)).toFixed(1)}x`, tone: "yt" },
      );
    }
  }
  if (reference) {
    items.push({ id: "mainnet", label: "Mainnet stNEAR APY (reference)", value: fmtApy(reference.apy) });
  }
  items.push({ id: "soon", label: "Coming soon", value: "LiNEAR, RHEA LP, USDY, BUIDL" });

  return (
    <section aria-label="Live market" className="bg-ink py-6">
      <Marquee label="Live market figures" durationSeconds={48}>
        {items.map((item) => (
          <TickerPill key={item.id} item={item} />
        ))}
      </Marquee>
    </section>
  );
}
