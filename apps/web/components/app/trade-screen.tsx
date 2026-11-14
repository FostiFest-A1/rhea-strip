"use client";

import { useState } from "react";
import { tauYears } from "@rhea/sdk/pricing";
import type { Offer } from "@rhea/sdk";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { bestOffer, offerMetrics } from "@/lib/market";
import { useBalances, useNow, useOffers, usePosition, useSeries } from "@/lib/rhea/hooks";
import { useRhea } from "@/lib/rhea/context";
import { useTxPlan } from "@/lib/rhea/use-tx-plan";
import { PricingNote } from "./pricing-note";
import { YieldChart } from "./yield-chart";
import { ListOfferCard } from "./list-offer-card";
import { OfferTable } from "./offer-table";
import { ConnectCard } from "./require-account";
import { TxPanel } from "./tx-panel";

type Side = "yt" | "pt";

export function TradeScreen() {
  const { account, deployment } = useRhea();
  const { data: series, error: seriesError } = useSeries();
  const { data: balances } = useBalances();
  const { data: position } = usePosition();
  const { data: offers, loading: offersLoading } = useOffers();
  const now = useNow();
  const { state, run, reset, busy } = useTxPlan();
  const [side, setSide] = useState<Side>("yt");

  if (seriesError) {
    return (
      <p role="alert" className="text-body text-danger">
        Could not load the series: {seriesError}
      </p>
    );
  }

  const kind = side === "yt" ? "Yt" : "Pt";
  const tau = series ? tauYears(series.maturityMs, now, series.yearSecs) : 0;
  const rate = deployment.aprBps / 10_000;
  const sideOffers: Offer[] = (offers ?? []).filter((offer) => offer.kind === kind);
  const best = bestOffer(sideOffers, account);
  const ytAvailable = position ? position.ytBalance - position.ytLocked : 0n;
  const ptAvailable = balances?.pt ?? 0n;
  const syBalance = balances?.sy ?? 0n;

  const buy = (offer: Offer) =>
    run((client, who) => client.buy(who, offer.id), {
      title: `Buying ${offer.kind.toUpperCase()}`,
      success: `Bought ${offer.kind.toUpperCase()} offer`,
    });

  const cancel = (offer: Offer) =>
    run((client, who) => client.cancel(who, offer.id), { title: "Cancelling offer", success: "Offer cancelled" });

  const list = (amount: bigint, askSy: bigint) =>
    run((client, who) => (side === "yt" ? client.listYt(who, amount, askSy) : client.listPt(who, amount, askSy)), {
      title: side === "yt" ? "Listing YT" : "Listing PT",
      success: side === "yt" ? "YT listed for sale" : "PT listed for sale",
    });

  const scrollToForm = () => document.getElementById("list-offer")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <Tabs
        label="Token"
        value={side}
        onChange={(next) => {
          setSide(next);
          reset();
        }}
        options={[
          { value: "yt", label: "YT", tone: "yt" },
          { value: "pt", label: "PT", tone: "pt" },
        ]}
      >
        {series ? (
          <div className="flex flex-col gap-10">
            <div id="list-offer" className="grid scroll-mt-32 grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
              {account ? (
                <ListOfferCard
                  key={side}
                  kind={kind}
                  available={side === "yt" ? ytAvailable : ptAvailable}
                  series={series}
                  tau={tau}
                  underlyingRate={rate}
                  busy={busy}
                  onList={list}
                />
              ) : (
                <ConnectCard
                  title="Connect wallet to trade"
                  description="You can browse the open offers below without a wallet. Connect a NEAR testnet wallet to buy, list or cancel offers."
                />
              )}
              {state.status !== "idle" ? (
                <TxPanel title="Transaction steps" idleSteps={[]} state={state} onReset={reset} />
              ) : (
                <PricingNote side={side} />
              )}
            </div>

            <section aria-labelledby="offers-title" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="offers-title" className="text-h3 font-normal text-fg">
                  Open {side === "yt" ? "YT" : "PT"} offers
                </h2>
                {best ? (
                  <Button variant="pink" size="sm" disabled={busy || account === null || syBalance < best.askSy || series.status !== "Active"} onClick={() => void buy(best)}>
                    Quick fill best offer
                  </Button>
                ) : null}
              </div>
              {sideOffers.length > 0 ? (
                <YieldChart
                  tone={side}
                  underlying={rate}
                  points={sideOffers.map((offer) => ({ id: offer.id, apy: offerMetrics(offer, series, tau, rate).impliedApy }))}
                />
              ) : null}
              <OfferTable
                kind={kind}
                offers={sideOffers}
                series={series}
                tau={tau}
                now={now}
                underlyingRate={rate}
                account={account}
                syBalance={syBalance}
                bestOfferId={best?.id ?? null}
                busy={busy}
                loading={offersLoading}
                onBuy={(offer) => void buy(offer)}
                onCancel={(offer) => void cancel(offer)}
                onList={scrollToForm}
              />
            </section>
          </div>
        ) : (
          <div className="h-[420px] animate-skeleton rounded-3xl bg-fill-5" aria-busy="true" />
        )}
      </Tabs>
    </>
  );
}
