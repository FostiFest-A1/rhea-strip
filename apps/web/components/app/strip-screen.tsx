"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { AmountField } from "@/components/ui/input";
import { Pill } from "@/components/ui/pill";
import type { StepperStep } from "@/components/ui/stepper";
import { amount as formatAmount, ptSymbol, ytSymbol } from "@/lib/format";
import { pyFromSy, toInputText, tryParse } from "@/lib/amount";
import { useBalances, useNow, useSeries } from "@/lib/rhea/hooks";
import { useRhea } from "@/lib/rhea/context";
import { useTxPlan } from "@/lib/rhea/use-tx-plan";
import { RequireAccount } from "./require-account";
import { TokenTile } from "./token-tile";
import { TxPanel } from "./tx-panel";

const IDLE_STEPS: StepperStep[] = [
  { id: "sync", label: "Sync the index", state: "idle" },
  { id: "register", label: "Register PT and YT for your account", state: "idle" },
  { id: "deposit", label: "Deposit mstNEAR and receive PT and YT", state: "idle" },
];

type Receipt = { pt: bigint; yt: bigint };

export function StripScreen() {
  const { client, account, mode } = useRhea();
  const { data: series, error: seriesError } = useSeries(mode === "fake" ? 1000 : undefined);
  const { data: balances } = useBalances();
  const now = useNow();
  const { state, run, reset, busy } = useTxPlan();
  const [text, setText] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const parsed = tryParse(text);
  const index = series?.liveIndex ?? 0n;
  const preview = parsed !== null && series ? pyFromSy(parsed, series.liveIndex) : 0n;
  const syBalance = balances?.sy ?? 0n;
  const minStrip = series?.minStrip ?? 0n;
  const active = series?.status === "Active";

  const problem =
    parsed === null && text !== ""
      ? "Enter a valid number."
      : parsed !== null && parsed > syBalance
        ? "That is more than your mstNEAR balance."
        : parsed !== null && parsed < minStrip
          ? `The minimum is ${formatAmount(minStrip, 4)} mstNEAR.`
          : null;

  const canStrip = Boolean(series) && active && parsed !== null && parsed > 0n && problem === null && !busy;
  const needsFaucet = balances !== undefined && balances !== null && syBalance < minStrip;

  const onStrip = async () => {
    if (parsed === null || !account) return;
    const before = await client.balances(account).catch(() => null);
    const ok = await run((planner, who) => planner.strip(who, parsed), {
      title: "Stripping mstNEAR",
      success: "Stripped into PT and YT",
    });
    if (!ok) return;
    const after = await client.balances(account).catch(() => null);
    if (before && after) {
      setReceipt({ pt: after.pt - before.pt, yt: after.yt - before.yt });
    } else {
      const fresh = await client.series().catch(() => null);
      const minted = pyFromSy(parsed, fresh?.liveIndex ?? index);
      setReceipt({ pt: minted, yt: minted });
    }
    setText("");
  };

  const onFaucet = () =>
    run((client, account) => client.faucet(account), { title: "Getting test mstNEAR", success: "100 test mstNEAR received" });

  return (
    <RequireAccount>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
        <Card className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-h3 font-normal text-fg">Deposit</h2>
            <div className="flex flex-wrap gap-2">
              <Pill tone="warn">Mock stNEAR, demo clock</Pill>
              {series ? <Countdown remainingMs={series.maturityMs - now} /> : null}
            </div>
          </div>

          {seriesError ? <p role="alert" className="text-body text-danger">Could not load the series: {seriesError}</p> : null}

          <AmountField
            label="Amount to strip"
            unit="mstNEAR"
            value={text}
            placeholder="0.0"
            invalid={problem !== null}
            onChange={(event) => {
              setText(event.target.value);
              if (receipt) setReceipt(null);
            }}
            hint={`Balance ${formatAmount(syBalance, 4)}`}
            action={
              <button
                type="button"
                onClick={() => setText(toInputText(syBalance))}
                disabled={syBalance === 0n}
                className="rounded-pill px-2.5 py-1 text-ui font-medium text-fg-80 transition-colors hover:bg-fill-10 hover:text-fg disabled:opacity-40"
              >
                Max
              </button>
            }
          />
          {problem ? (
            <p role="alert" className="-mt-3 text-ui text-danger">
              {problem}
            </p>
          ) : null}

          {needsFaucet ? (
            <div className="flex flex-col gap-3 rounded-xl bg-fill-5 p-4 shadow-input md:flex-row md:items-center md:justify-between">
              <p className="text-ui text-fg-80">You need test mstNEAR before you can strip. The faucet mints 100 per call.</p>
              <Button variant="glass" size="sm" disabled={busy} onClick={() => void onFaucet()}>
                Get test mstNEAR
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TokenTile
              kind="pt"
              symbol={series ? ptSymbol(series.maturityMs) : "PT"}
              value={formatAmount(preview, 4)}
              caption="Redeems for the same value after maturity"
            />
            <TokenTile
              kind="yt"
              symbol={series ? ytSymbol(series.maturityMs) : "YT"}
              value={formatAmount(preview, 4)}
              caption="Collects yield until maturity"
            />
          </div>
          <p className="text-ui text-fg-65">
            {preview > 0n ? (
              <>
                You receive PT and YT worth <span className="num text-fg">{formatAmount(preview, 4)}</span> NEAR each, at an index of{" "}
                <span className="num text-fg">{(Number(index) / 1e24).toFixed(6)}</span>.
              </>
            ) : (
              "Enter an amount to see how much PT and YT you receive."
            )}{" "}
            The mock yield runs on a demo clock.
          </p>

          <Button variant="pink" size="lg" disabled={!canStrip} onClick={() => void onStrip()}>
            {busy ? "Working" : "Strip mstNEAR"}
          </Button>
          {series && !active ? (
            <p role="status" className="text-ui text-warn">
              This series has matured, so stripping is closed. Continue on the Settle page.
            </p>
          ) : null}
        </Card>

        <div className="flex flex-col gap-6">
          <TxPanel
            title="Transaction steps"
            idleSteps={IDLE_STEPS}
            state={state}
            onReset={reset}
            idleNote="Wallets sign each step in order. The first step refreshes the price index when it is out of date."
          />
          {receipt && state.status === "success" ? (
            <Card className="p-6 md:p-8">
              <h2 className="text-title font-medium text-fg">You received</h2>
              <p className="num mt-4 text-h3 leading-[35px] font-medium text-ice">{formatAmount(receipt.pt, 4)} PT</p>
              <p className="num mt-2 text-h3 leading-[35px] font-medium text-pink">{formatAmount(receipt.yt, 4)} YT</p>
              <p className="mt-4 text-ui text-fg-65">Sell the YT on the Trade page to receive mstNEAR today.</p>
            </Card>
          ) : null}
        </div>
      </div>
    </RequireAccount>
  );
}
