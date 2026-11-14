"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { Pill } from "@/components/ui/pill";
import { Stepper, type StepperStep } from "@/components/ui/stepper";
import { amount } from "@/lib/format";
import { useBalances, useNow, usePosition, useSeries } from "@/lib/rhea/hooks";
import { useRhea } from "@/lib/rhea/context";
import { useTxPlan } from "@/lib/rhea/use-tx-plan";
import { RequireAccount } from "./require-account";
import { StatCard } from "./stat-card";
import { TxPanel } from "./tx-panel";

const SCALE = 10n ** 24n;

type Totals = { redeemed: bigint; claimed: bigint; withdrawn: bigint };

export function SettleScreen() {
  const { account } = useRhea();
  const { data: series, error: seriesError } = useSeries();
  const { data: balances } = useBalances();
  const { data: position } = usePosition();
  const now = useNow();
  const { state, run, reset, busy } = useTxPlan();
  const [totals, setTotals] = useState<Totals>({ redeemed: 0n, claimed: 0n, withdrawn: 0n });
  const autoSettled = useRef(false);

  const status = series?.status;

  useEffect(() => {
    if (status !== "Matured" || !account || autoSettled.current) return;
    autoSettled.current = true;
    void run((client, who) => client.settle(who), { title: "Settling the series", success: "Series settled" });
  }, [status, account, run]);

  if (seriesError) {
    return (
      <p role="alert" className="text-body text-danger">
        Could not load the series: {seriesError}
      </p>
    );
  }
  if (!series || !balances || !position) {
    return <div className="h-[360px] animate-skeleton rounded-3xl bg-fill-5" aria-busy="true" />;
  }

  const settled = series.status === "Settled" && series.maturityIndex !== null;
  const redeemable = settled && series.maturityIndex ? (balances.pt * SCALE) / series.maturityIndex : 0n;
  const claimable = position.ytAccruedSy + position.ytPendingSy;
  const nothingLeft = settled && balances.pt === 0n && position.ytBalance === 0n && position.syCredit === 0n;
  const touched = totals.redeemed + totals.claimed + totals.withdrawn > 0n;

  const lifecycle: StepperStep[] = [
    { id: "active", label: "Active until maturity", state: series.status === "Active" ? "active" : "done" },
    {
      id: "settle",
      label: "Settle the series and freeze the index",
      state: settled ? "done" : series.status === "Matured" ? "active" : "idle",
    },
    { id: "payout", label: "Redeem PT and claim YT", state: nothingLeft ? "done" : settled ? "active" : "idle" },
  ];

  const retrySettle = () => run((client, who) => client.settle(who), { title: "Settling the series", success: "Series settled" });

  const redeem = async () => {
    const expected = redeemable;
    const ok = await run((client, who) => client.redeem(who, balances.pt), {
      title: "Redeeming PT",
      success: "PT redeemed for mstNEAR",
    });
    if (ok) setTotals((current) => ({ ...current, redeemed: current.redeemed + expected }));
  };

  const claim = async () => {
    const expected = claimable;
    const ok = await run((client, who) => client.claim(who), { title: "Claiming YT yield", success: "YT yield claimed" });
    if (ok) setTotals((current) => ({ ...current, claimed: current.claimed + expected }));
  };

  const withdraw = async () => {
    const expected = position.syCredit;
    const ok = await run((client, who) => client.withdraw(who), {
      title: "Withdrawing sale proceeds",
      success: "Sale proceeds withdrawn",
    });
    if (ok) setTotals((current) => ({ ...current, withdrawn: current.withdrawn + expected }));
  };

  return (
    <RequireAccount>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-6 p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-h3 font-normal text-fg">Series status</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone={series.status === "Settled" ? "ok" : series.status === "Matured" ? "warn" : "neutral"}>{series.status}</Pill>
                {series.status === "Active" ? <Countdown remainingMs={series.maturityMs - now} /> : null}
              </div>
            </div>
            <Stepper steps={lifecycle} />
            {series.status === "Active" ? (
              <p className="text-body text-fg-80">
                Settling, redeeming and claiming open after maturity. Until then you can keep trading on the{" "}
                <Link href="/trade" className="text-ice underline-offset-4 hover:underline">
                  Trade
                </Link>{" "}
                page.
              </p>
            ) : null}
            {series.status === "Matured" ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-body text-fg-80">
                  The series has matured. Settling freezes the index so PT and YT can be paid out. It runs automatically, and
                  anyone can trigger it.
                </p>
                {state.status === "error" ? (
                  <Button variant="white" size="sm" disabled={busy} onClick={() => void retrySettle()}>
                    Retry settle
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              tone="pt"
              label="PT to redeem"
              value={amount(balances.pt, 4)}
              unit="PT"
              caption={settled ? `Pays ${amount(redeemable, 4)} mstNEAR at the frozen index` : "Available after settlement"}
              action={
                <Button variant="white" size="sm" disabled={!settled || busy || balances.pt === 0n} onClick={() => void redeem()}>
                  Redeem PT
                </Button>
              }
            />
            <StatCard
              tone="yt"
              label="YT yield to claim"
              value={amount(claimable, 4)}
              unit="mstNEAR"
              caption={settled ? "Your YT is burned when you claim" : "Available after settlement"}
              action={
                <Button variant="pink" size="sm" disabled={!settled || busy || position.ytBalance === 0n} onClick={() => void claim()}>
                  Claim YT
                </Button>
              }
            />
            <StatCard
              label="Sale credit"
              value={amount(position.syCredit, 4)}
              unit="mstNEAR"
              caption="Proceeds from filled offers"
              action={
                <Button variant="glass" size="sm" disabled={busy || position.syCredit === 0n} onClick={() => void withdraw()}>
                  Withdraw
                </Button>
              }
            />
          </div>

          {nothingLeft ? (
            <Card className="flex flex-col gap-4 p-6 md:p-8">
              <h2 className="text-h3 font-normal text-fg">All settled</h2>
              <p className="text-body text-fg-80">
                PT and YT are paid out. Your mstNEAR balance is{" "}
                <span className="num font-medium text-fg">{amount(balances.sy, 4)}</span>.
              </p>
              {touched ? (
                <dl className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <dt className="text-ui text-fg-65">Redeemed from PT</dt>
                    <dd className="num text-title font-medium text-ice">{amount(totals.redeemed, 4)}</dd>
                  </div>
                  <div>
                    <dt className="text-ui text-fg-65">Claimed from YT</dt>
                    <dd className="num text-title font-medium text-pink">{amount(totals.claimed, 4)}</dd>
                  </div>
                  <div>
                    <dt className="text-ui text-fg-65">Withdrawn sale proceeds</dt>
                    <dd className="num text-title font-medium text-fg">{amount(totals.withdrawn, 4)}</dd>
                  </div>
                </dl>
              ) : null}
              <ButtonLink href="/portfolio" variant="glass" size="sm" className="w-fit">
                View portfolio
              </ButtonLink>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <TxPanel
            title="Transaction steps"
            idleSteps={[]}
            state={state}
            onReset={reset}
            idleNote="Settle, redeem and claim steps appear here as they run."
          />
        </div>
      </div>
    </RequireAccount>
  );
}
