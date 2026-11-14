"use client";

import { useState } from "react";
import {
  askSyForPt,
  askSyForYt,
  buyerBreakEvenApy,
  fairYtPrice,
  fmtApy,
  ptFixedReturn,
  ptPrice,
  ytLeverage,
  ytPrice,
} from "@rhea/sdk/pricing";
import type { Series } from "@rhea/sdk";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AmountField } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { amount as formatAmount } from "@/lib/format";
import { toInputText, tryParse } from "@/lib/amount";

type ListOfferCardProps = {
  kind: "Pt" | "Yt";
  available: bigint;
  series: Series;
  tau: number;
  underlyingRate: number;
  busy: boolean;
  onList: (amount: bigint, askSy: bigint) => Promise<boolean>;
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-ui text-fg-65">{label}</dt>
      <dd className="num text-lead font-medium text-fg">{value}</dd>
    </div>
  );
}

export function ListOfferCard({ kind, available, series, tau, underlyingRate, busy, onList }: ListOfferCardProps) {
  const yt = kind === "Yt";
  const [text, setText] = useState("");
  const [apyPercent, setApyPercent] = useState(() => Math.round(underlyingRate * 1000) / 10);
  const rate = apyPercent / 100;

  const parsed = tryParse(text);
  const valid = parsed !== null && parsed > 0n && parsed <= available;
  const units = valid ? parsed : 0n;
  const askSy = yt ? askSyForYt(units, rate, tau, series.liveIndex) : askSyForPt(units, rate, tau, series.liveIndex);
  const pricePt = ptPrice(rate, tau);
  const priceYt = ytPrice(rate, tau);
  const fair = fairYtPrice(underlyingRate, tau);
  const active = series.status === "Active";
  const problem =
    parsed === null && text !== ""
      ? "Enter a valid number."
      : parsed !== null && parsed > available
        ? `You only have ${formatAmount(available, 4)} available.`
        : null;

  const submit = async () => {
    if (!valid || askSy <= 0n) return;
    const ok = await onList(units, askSy);
    if (ok) setText("");
  };

  return (
    <Card tone={yt ? "yt" : "pt"} className="flex flex-col gap-6 p-6 md:p-8">
      <div>
        <h2 className="text-h3 font-normal text-fg">
          {yt ? (
            <>
              Sell <span className="serif-accent text-pink">future</span> yield
            </>
          ) : (
            "Sell PT for a fixed price"
          )}
        </h2>
        <p className="mt-2 max-w-[560px] text-body text-fg-80">
          {yt
            ? "Pick how much YT to sell and the implied APY you will accept. You receive mstNEAR now, and the buyer collects the yield until maturity."
            : "Pick how much PT to sell and the fixed APY you will give the buyer. You receive mstNEAR now."}
        </p>
      </div>

      <AmountField
        label={yt ? "YT to sell" : "PT to sell"}
        unit={yt ? "YT" : "PT"}
        value={text}
        placeholder="0.0"
        invalid={problem !== null}
        onChange={(event) => setText(event.target.value)}
        hint={`Available ${formatAmount(available, 4)}`}
        action={
          <button
            type="button"
            disabled={available === 0n}
            onClick={() => setText(toInputText(available))}
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

      <Slider
        label={yt ? "Implied APY you accept" : "Fixed APY you offer"}
        valueLabel={fmtApy(rate, 1)}
        tone={yt ? "pink" : "ice"}
        min={0}
        max={30}
        step={0.1}
        value={apyPercent}
        onChange={(event) => setApyPercent(Number(event.target.value))}
        disabled={!active}
      />

      <dl className="grid grid-cols-2 gap-6 rounded-xl bg-fill-5 p-5 shadow-input md:grid-cols-3">
        <div className="flex flex-col gap-1">
          <dt className="text-ui text-fg-65">You receive now</dt>
          <dd className="num text-title font-medium text-fg">{formatAmount(askSy, 4)} mstNEAR</dd>
        </div>
        {yt ? (
          <>
            <Metric label="Price per YT" value={`${priceYt.toFixed(4)} NEAR`} />
            <Metric label="Fair value at mock APY" value={`${fair.toFixed(4)} NEAR`} />
            <Metric label="Buyer leverage" value={`${ytLeverage(priceYt).toFixed(1)}x`} />
            <Metric label="Buyer break-even APY" value={fmtApy(buyerBreakEvenApy(priceYt, tau), 1)} />
          </>
        ) : (
          <>
            <Metric label="Price per PT" value={`${pricePt.toFixed(4)} NEAR`} />
            <Metric label="Buyer fixed return" value={fmtApy(ptFixedReturn(pricePt), 2)} />
          </>
        )}
      </dl>

      <Button
        variant={yt ? "pink" : "white"}
        size="lg"
        disabled={!valid || askSy <= 0n || busy || !active}
        onClick={() => void submit()}
      >
        {busy ? "Working" : yt ? "List YT" : "List PT"}
      </Button>
      {!active ? (
        <p role="status" className="text-ui text-warn">
          Offers cannot be created after maturity.
        </p>
      ) : null}
    </Card>
  );
}
