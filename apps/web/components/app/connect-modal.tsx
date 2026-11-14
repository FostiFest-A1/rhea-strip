"use client";

import { Modal } from "@/components/ui/modal";
import { shortAccount } from "@/lib/format";
import { useRhea } from "@/lib/rhea/context";

const DISPLAY_NAMES: Record<string, string> = {
  "rhea-strip-alice.testnet": "Alice",
  "rhea-strip-bob.testnet": "Bob",
};

const optionClass =
  "flex w-full flex-col items-start gap-1 rounded-xl bg-fill-10 px-4 py-3 text-left shadow-glass transition-[background-color,transform] duration-300 ease-out-expo hover:bg-fill-20 active:scale-[.98] disabled:pointer-events-none disabled:opacity-60";

export function ConnectModal() {
  const { mode, pickerOpen, closePicker, demoAccounts, connectDemo, connectWallet } = useRhea();
  if (mode !== "testnet") return null;

  return (
    <Modal open={pickerOpen} onClose={closePicker} title="Connect to Rhea Strip" className="!bg-ink-card">
      <div className="flex flex-col gap-3 px-3 pb-3">
        <p className="text-body text-fg-80">
          Everything runs on NEAR testnet. Pick a ready-funded demo account, or sign with your own testnet wallet.
        </p>

        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-medium tracking-wide text-fg-65 uppercase">Demo account</p>
          {demoAccounts.length === 0 ? (
            <p className="rounded-xl bg-warn/10 px-4 py-3 text-ui text-warn">
              Demo accounts are not configured on this server. Connect your own wallet instead.
            </p>
          ) : (
            demoAccounts.map((account) => (
              <button key={account} type="button" className={optionClass} onClick={() => connectDemo(account)}>
                <span className="text-lead font-bold text-fg">{DISPLAY_NAMES[account] ?? shortAccount(account)} (demo)</span>
                <span className="num text-ui text-fg-65">{account}. No popup, signed for you on testnet.</span>
              </button>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-medium tracking-wide text-fg-65 uppercase">Your wallet</p>
          <button type="button" className={optionClass} onClick={() => void connectWallet()}>
            <span className="text-lead font-bold text-fg">Connect wallet</span>
            <span className="text-ui text-fg-65">Meteor, Intear or another NEAR testnet wallet. You sign each transaction.</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
