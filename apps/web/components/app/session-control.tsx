"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { shortAccount } from "@/lib/format";
import { useRhea } from "@/lib/rhea/context";

const DISPLAY_NAMES: Record<string, string> = {
  "alice.testnet": "Alice",
  "bob.testnet": "Bob",
  "maker.testnet": "Maker",
};

export function SessionControl() {
  const { mode, accounts, account, selectAccount, walletStatus, signIn, signOut, identity } = useRhea();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setAboutOpen(true)}
        aria-label="About this demo"
        className="hidden size-[33px] items-center justify-center rounded-pill bg-fill-10 text-[13px] font-bold text-fg transition-transform duration-160 ease-out-expo active:scale-[.94] md:flex"
      >
        ?
      </button>

      {mode === "fake" ? (
        <label className="relative flex items-center">
          <span className="sr-only">Acting as</span>
          <select
            value={account ?? ""}
            onChange={(event) => selectAccount(event.target.value)}
            className="h-[33px] cursor-pointer appearance-none rounded-pill bg-fill-10 pr-8 pl-4 text-[13px] font-medium text-fg shadow-glass outline-none transition-colors hover:bg-fill-20 focus-visible:outline-2 focus-visible:outline-offset-3"
          >
            {accounts.map((entry) => (
              <option key={entry} value={entry} className="bg-ink-glass text-fg">
                {DISPLAY_NAMES[entry] ?? shortAccount(entry)} (demo)
              </option>
            ))}
          </select>
          <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" className="pointer-events-none absolute right-3 size-3 text-fg-65">
            <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
          </svg>
        </label>
      ) : walletStatus === "ready" && account ? (
        <>
          <button
            type="button"
            onClick={() => void signIn()}
            aria-label="Switch account"
            className="num hidden h-[33px] items-center gap-2 rounded-pill bg-fill-10 px-4 text-[13px] font-medium text-fg shadow-glass transition-colors hover:bg-fill-20 md:inline-flex"
          >
            {identity === "demo" ? <span className="text-fg-65">Demo</span> : null}
            {shortAccount(account)}
          </button>
          <Button size="sm" variant="glass" onClick={() => void signOut()}>
            Disconnect
          </Button>
        </>
      ) : (
        <Button size="sm" variant="white" disabled={walletStatus === "connecting"} onClick={() => void signIn()}>
          {walletStatus === "connecting" ? "Connecting" : "Connect"}
        </Button>
      )}

      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About this demo">
        <div className="flex flex-col gap-3 px-3 pb-3 text-body text-fg-80">
          <p>Rhea Strip is a hackathon MVP running on NEAR testnet. It has not been audited.</p>
          <p>
            mstNEAR is a mock staked token whose price rises on a schedule. Time runs on a compressed demo clock, so a
            year of yield fits into about an hour.
          </p>
          <p>
            {mode === "fake"
              ? "This session runs on an in-memory simulation. Use the account switcher to act as Alice, Bob or the market maker."
              : "Transactions are real NEAR testnet transactions, signed either by a demo account or by your own wallet."}
          </p>
        </div>
      </Modal>
    </div>
  );
}
