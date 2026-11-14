"use client";

import { fmtApy } from "@rhea/sdk/pricing";
import type { Offer, Series } from "@rhea/sdk";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Row } from "@/components/ui/row";
import { Pill } from "@/components/ui/pill";
import { ageLabel, amount, shortAccount } from "@/lib/format";
import { offerMetrics } from "@/lib/market";
import { cn } from "@/lib/cn";

type OfferTableProps = {
  kind: "Pt" | "Yt";
  offers: Offer[];
  series: Series;
  tau: number;
  now: number;
  underlyingRate: number;
  account: string | null;
  syBalance: bigint;
  bestOfferId: number | null;
  busy: boolean;
  loading: boolean;
  onBuy: (offer: Offer) => void;
  onCancel: (offer: Offer) => void;
  onList: () => void;
};

function Cell({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 xl:block", className)}>
      <dt className="text-ui text-fg-50 xl:sr-only">{label}</dt>
      <dd className="num text-ui text-fg">{children}</dd>
    </div>
  );
}

const GRID = "xl:grid xl:grid-cols-[1fr_1.1fr_1fr_1fr_1.3fr_.5fr_auto] xl:items-center xl:gap-4";

export function OfferTable({
  kind,
  offers,
  series,
  tau,
  now,
  underlyingRate,
  account,
  syBalance,
  bestOfferId,
  busy,
  loading,
  onBuy,
  onCancel,
  onList,
}: OfferTableProps) {
  const pt = kind === "Pt";
  const column = pt ? "Fixed APY" : "Implied APY";
  const extra = pt ? "Fixed return" : "Discount to fair";

  if (loading) {
    return (
      <Card className="p-6" aria-busy="true">
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-14 animate-skeleton rounded-xl bg-fill-5" />
          ))}
        </div>
      </Card>
    );
  }

  if (offers.length === 0) {
    return (
      <Card className="flex flex-col items-start gap-4 p-6 md:p-8">
        <h3 className="text-title font-medium text-fg">No open {pt ? "PT" : "YT"} offers</h3>
        <p className="max-w-[520px] text-body text-fg-80">
          Nobody is selling {pt ? "PT" : "YT"} right now. List yours above, or wait for the market maker to post a price.
        </p>
        <Button variant="glass" size="sm" onClick={onList}>
          Create an offer
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      <div className={cn("hidden px-4 pb-3 text-ui font-medium text-fg-50", GRID, "xl:grid")} aria-hidden="true">
        <span>Amount</span>
        <span>Ask (mstNEAR)</span>
        <span>{column}</span>
        <span>{extra}</span>
        <span>Seller</span>
        <span>Age</span>
        <span className="w-[120px]" />
      </div>
      <ul className="flex flex-col gap-3">
        {offers.map((offer) => {
          const metrics = offerMetrics(offer, series, tau, underlyingRate);
          const own = account !== null && offer.seller === account;
          const affordable = syBalance >= offer.askSy;
          const closed = series.status !== "Active";
          return (
            <li key={offer.id}>
              <Row className={cn("flex flex-col gap-2 p-4", GRID, own && "shadow-selected")}>
                <dl className="contents">
                  <Cell label="Amount">
                    <span className={pt ? "text-ice" : "text-pink"}>{amount(offer.amount, 4)}</span> {pt ? "PT" : "YT"}
                  </Cell>
                  <Cell label="Ask in mstNEAR">{amount(offer.askSy, 4)}</Cell>
                  <Cell label={column}>{fmtApy(metrics.impliedApy)}</Cell>
                  <Cell label={extra}>
                    {pt
                      ? metrics.fixedReturn === null
                        ? "n/a"
                        : fmtApy(metrics.fixedReturn)
                      : metrics.discountToFair === null
                        ? "n/a"
                        : fmtApy(metrics.discountToFair, 1)}
                  </Cell>
                  <Cell label="Seller">
                    {own ? <Pill tone="neutral">You</Pill> : shortAccount(offer.seller)}
                  </Cell>
                  <Cell label="Age">{ageLabel(offer.createdMs, now)}</Cell>
                </dl>
                <div className="flex items-center justify-end gap-2 xl:w-[120px]">
                  {own ? (
                    <Button variant="glass" size="sm" disabled={busy} onClick={() => onCancel(offer)}>
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      variant="white"
                      size="sm"
                      disabled={busy || !affordable || closed || account === null}
                      onClick={() => onBuy(offer)}
                      aria-label={`Buy offer ${offer.id}${offer.id === bestOfferId ? ", best price" : ""}`}
                    >
                      Buy
                    </Button>
                  )}
                </div>
                {!own && account !== null && !affordable ? (
                  <p className="text-ui text-fg-50 xl:col-span-full">You need {amount(offer.askSy, 4)} mstNEAR to fill this offer.</p>
                ) : null}
              </Row>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
