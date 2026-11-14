"use client";

import { fmtApy } from "@rhea/sdk/pricing";
import { usePolled } from "@/lib/rhea/hooks";
import { amount } from "@/lib/format";

export function MainnetReferenceStat() {
  const { data, error } = usePolled((client) => client.mainnetReference(), 60_000);

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-xl bg-fill-5 p-4 text-ui shadow-input">
      <div>
        <dt className="text-fg-65">Mainnet stNEAR price</dt>
        <dd className="num mt-1 text-lead font-medium text-fg">
          {data ? `${amount(data.price, 4)} NEAR` : error ? "Unavailable" : "Loading"}
        </dd>
      </div>
      <div>
        <dt className="text-fg-65">Mainnet APY</dt>
        <dd className="num mt-1 text-lead font-medium text-fg">{data ? fmtApy(data.apy) : error ? "n/a" : "Loading"}</dd>
      </div>
    </dl>
  );
}
