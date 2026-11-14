"use client";

import { useRhea } from "@/lib/rhea/context";

export function NetworkNotice() {
  const { notice, mode, deployment } = useRhea();
  const message =
    notice ??
    (mode === "testnet" && !deployment.deployed ? "The testnet contracts are not deployed yet, so reads and transactions will fail." : null);

  if (!message) return null;
  return (
    <p role="status" className="mb-6 rounded-xl bg-warn/10 px-4 py-3 text-ui text-warn shadow-[inset_0_0_0_1px_#ffc85740]">
      {message}
    </p>
  );
}
