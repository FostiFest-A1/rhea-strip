"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { Pill } from "@/components/ui/pill";
import { Progress } from "@/components/ui/progress";
import { Row } from "@/components/ui/row";
import { ageLabel, amount, elapsedFraction, ptSymbol, ytSymbol } from "@/lib/format";
import { useBalances, useNow, useOffers, usePosition, useSeries, useTermStart } from "@/lib/rhea/hooks";
import { useRhea } from "@/lib/rhea/context";
import { useTxPlan } from "@/lib/rhea/use-tx-plan";
import { RequireAccount } from "./require-account";
import { StatCard } from "./stat-card";
import { TxPanel } from "./tx-panel";

const SCALE = 10n ** 24n;

export function PortfolioScreen() {
  const { account, deployment } = useRhea();
  const { data: series, error: seriesError } = useSeries();
  const { data: balances, loading: balancesLoading } = useBalances();
  const { data: position } = usePosition();
  const { data: offers } = useOffers();
  const now = useNow();
  const { state, run, reset, busy } = useTxPlan();
  const termStart = useTermStart(series?.maturityMs ?? deployment.maturityMs, deployment.deployedAt);

  if (seriesError) {
    return (
      <p role="alert" className="text-body text-danger">
        Could not load the series: {seriesError}
      </p>
    );
  }

  const loading = !series || balancesLoading || !balances || !position;
  const mine = (offers ?? []).filter((offer) => account !== null && offer.seller === account);
  const accrued = position ? position.ytAccruedSy + position.ytPendingSy : 0n;
  const ptWorth = series && balances ? (balances.pt * SCALE) / series.liveIndex : 0n;
  const matured = series ? series.status !== "Active" : false;

  const withdraw = () =>
    run((client, who) => client.withdraw(who), { title: "Withdrawing sale proceeds", success: "Sale proceeds withdrawn" });
  const cancel = (id: number) =>
    run((client, who) => client.cancel(who, id), { title: "Cancelling offer", success: "Offer cancelled" });

  return (
    <RequireAccount>
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-[168px] animate-skeleton rounded-3xl bg-fill-5" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="mstNEAR" value={amount(balances.sy, 4)} unit="mstNEAR" caption="Mock staked NEAR in your wallet" />
            <StatCard
              tone="pt"
              label={ptSymbol(series.maturityMs)}
              value={amount(balances.pt, 4)}
              unit="PT"
              caption={`Worth about ${amount(ptWorth, 4)} mstNEAR at today's index`}
            />
            <StatCard
              tone="yt"
              label={ytSymbol(series.maturityMs)}
              value={amount(position.ytBalance, 4)}
              unit="YT"
              caption={`${amount(position.ytLocked, 4)} listed for sale, ${amount(position.ytBalance - position.ytLocked, 4)} free`}
            />
            <StatCard
              label="Sale credit"
              value={amount(position.syCredit, 4)}
              unit="mstNEAR"
              caption="Proceeds from filled offers"
              action={
                <Button variant="white" size="sm" disabled={busy || position.syCredit === 0n} onClick={() => void withdraw()}>
                  Withdraw
                </Button>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card tone="yt" className="flex flex-col gap-4 p-6 md:p-8">
              <p className="text-ui font-medium text-fg-65">YT yield accrued</p>
              <p className="num text-[40px] leading-[48px] font-medium tracking-tightest text-pink" aria-live="off">
                {amount(accrued, 6)} <span className="text-ui font-medium text-fg-65">mstNEAR</span>
              </p>
              <p className="text-ui text-fg-65">
                Collected so far on your YT. It keeps growing until maturity and is paid out when you claim after settlement.
              </p>
            </Card>

            <Card className="flex flex-col gap-5 p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-ui font-medium text-fg-65">Maturity</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={series.status === "Active" ? "ok" : "warn"}>{series.status}</Pill>
                  {series.status === "Active" ? <Countdown remainingMs={series.maturityMs - now} /> : null}
                </div>
              </div>
              <Progress label="Series term elapsed" value={elapsedFraction(termStart, series.maturityMs, now)} tone="pink" />
              <p className="text-ui text-fg-65">
                {matured ? "The series has matured. Redeem PT and claim YT on the Settle page." : "Mock yield runs on a demo clock."}
              </p>
              {matured ? (
                <Link
                  href="/settle"
                  className="inline-flex h-12 w-fit items-center rounded-pill bg-fg px-5 text-lead font-bold tracking-tightest text-ink-card transition-[transform,box-shadow] duration-300 ease-out-expo hover:shadow-pink active:scale-[.98]"
                >
                  Go to Settle
                </Link>
              ) : null}
            </Card>
          </div>

          <section aria-labelledby="own-offers" className="flex flex-col gap-4">
            <h2 id="own-offers" className="text-h3 font-normal text-fg">
              Your open offers
            </h2>
            {mine.length === 0 ? (
              <Card className="flex flex-col items-start gap-4 p-6">
                <p className="text-body text-fg-80">You have no open offers.</p>
                <Link href="/trade" className="text-ui font-medium text-ice underline-offset-4 hover:underline">
                  Sell future yield on the Trade page
                </Link>
              </Card>
            ) : (
              <ul className="flex flex-col gap-3">
                {mine.map((offer) => (
                  <li key={offer.id}>
                    <Row className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <Pill tone={offer.kind === "Yt" ? "yt" : "pt"}>{offer.kind.toUpperCase()}</Pill>
                        <span className="num text-body text-fg">{amount(offer.amount, 4)}</span>
                      </div>
                      <span className="num text-ui text-fg-80">Ask {amount(offer.askSy, 4)} mstNEAR</span>
                      <span className="num text-ui text-fg-50">{ageLabel(offer.createdMs, now)} ago</span>
                      <Button variant="glass" size="sm" disabled={busy} onClick={() => void cancel(offer.id)}>
                        Cancel
                      </Button>
                    </Row>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {state.status !== "idle" ? <TxPanel title="Transaction steps" idleSteps={[]} state={state} onReset={reset} /> : null}
        </div>
      )}
    </RequireAccount>
  );
}
