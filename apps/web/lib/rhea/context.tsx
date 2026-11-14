"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient, type Account, type Deployment, type Mode, type RheaClient, type TxPlan } from "@rhea/sdk";
import { asFakeClient, FAKE_ACCOUNTS } from "@rhea/sdk/fake";
import { loadConnector } from "./connector";
import { createDemoExecutor, createFakeExecutor, createWalletExecutor, type PlanExecutor, type StepObserver } from "./executors";

export type WalletStatus = "ready" | "connecting" | "disconnected";

export type ClockControls = {
  advance: (ms: number) => void;
  toMaturity: () => void;
};

export interface RheaSession {
  client: RheaClient;
  mode: Mode;
  deployment: Deployment;
  version: number;
  accounts: readonly Account[];
  account: Account | null;
  selectAccount: (account: Account) => void;
  walletStatus: WalletStatus;
  /** Opens the connect picker (demo account or own wallet). */
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  identity: "demo" | "wallet" | null;
  pickerOpen: boolean;
  closePicker: () => void;
  demoAccounts: readonly Account[];
  connectDemo: (account: Account) => void;
  connectWallet: () => Promise<void>;
  execute: (plan: TxPlan, observer: StepObserver) => Promise<void>;
  refresh: () => void;
  clock: ClockControls | null;
  notice: string | null;
}

const DEMO_STORAGE_KEY = "rhea.demoAccount";

const RheaContext = createContext<RheaSession | null>(null);

type ClientBuild = { client: RheaClient; mode: Mode; notice: string | null };

function buildClient(mode: Mode): ClientBuild {
  try {
    return { client: createClient({ mode }), mode, notice: null };
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : "unknown error";
    return {
      client: createClient({ mode: "fake" }),
      mode: "fake",
      notice: `The testnet client is not available (${reason}). Showing the in-memory demo instead.`,
    };
  }
}

export function RheaProvider({ mode: requestedMode, children }: { mode: Mode; children: ReactNode }) {
  const [build] = useState(() => buildClient(requestedMode));
  const { client, mode } = build;
  const fake = useMemo(() => asFakeClient(client), [client]);

  const [version, setVersion] = useState(0);
  const [fakeAccount, setFakeAccount] = useState<Account>(FAKE_ACCOUNTS[0]);
  const [walletAccount, setWalletAccount] = useState<Account | null>(null);
  const [demoAccount, setDemoAccount] = useState<Account | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<readonly Account[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>(mode === "fake" ? "ready" : "connecting");
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    if (mode !== "testnet") return;
    let cancelled = false;
    let detach: (() => void) | null = null;

    loadConnector()
      .then(async (connector) => {
        if (cancelled) return;
        const onSignIn = (payload: { accounts: { accountId: string }[] }) => {
          setWalletAccount(payload.accounts[0]?.accountId ?? null);
          setWalletStatus(payload.accounts.length > 0 ? "ready" : "disconnected");
        };
        const onSignOut = () => {
          setWalletAccount(null);
          setWalletStatus("disconnected");
        };
        connector.on("wallet:signIn", onSignIn);
        connector.on("wallet:signOut", onSignOut);
        detach = () => {
          connector.off("wallet:signIn", onSignIn);
          connector.off("wallet:signOut", onSignOut);
        };
        const { accounts } = await connector.getConnectedWallet();
        if (cancelled) return;
        setWalletAccount(accounts[0]?.accountId ?? null);
        setWalletStatus(accounts.length > 0 ? "ready" : "disconnected");
      })
      .catch(() => {
        if (!cancelled) setWalletStatus("disconnected");
      });

    return () => {
      cancelled = true;
      detach?.();
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "testnet") return;
    let cancelled = false;
    fetch("/api/demo/accounts")
      .then((response) => response.json() as Promise<{ accounts: string[] }>)
      .then(({ accounts }) => {
        if (cancelled) return;
        setDemoAccounts(accounts);
        try {
          const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
          if (saved && accounts.includes(saved)) setDemoAccount(saved);
        } catch {
          // storage unavailable: start disconnected
        }
      })
      .catch(() => {
        if (!cancelled) setDemoAccounts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  const signIn = useCallback(async () => {
    if (mode !== "testnet") return;
    setPickerOpen(true);
  }, [mode]);

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const connectDemo = useCallback((account: Account) => {
    setDemoAccount(account);
    setPickerOpen(false);
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, account);
    } catch {
      // storage unavailable: session only
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setPickerOpen(false);
    setDemoAccount(null);
    try {
      window.localStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      // ignore
    }
    const connector = await loadConnector();
    await connector.connect();
  }, []);

  const signOut = useCallback(async () => {
    if (mode !== "testnet") return;
    if (demoAccount) {
      setDemoAccount(null);
      try {
        window.localStorage.removeItem(DEMO_STORAGE_KEY);
      } catch {
        // ignore
      }
      return;
    }
    const connector = await loadConnector();
    await connector.disconnect();
  }, [mode, demoAccount]);

  const executor = useMemo<PlanExecutor>(() => {
    if (fake) return createFakeExecutor(fake.wallet);
    if (demoAccount) return createDemoExecutor();
    return createWalletExecutor(async () => {
      const connector = await loadConnector();
      return connector.wallet();
    });
  }, [fake, demoAccount]);

  const execute = useCallback(
    async (plan: TxPlan, observer: StepObserver) => {
      const account = fake ? fakeAccount : (demoAccount ?? walletAccount);
      if (!account) throw new Error("Connect a wallet first");
      try {
        await executor.execute(plan, account, observer);
      } finally {
        refresh();
      }
    },
    [executor, fake, fakeAccount, demoAccount, walletAccount, refresh],
  );

  const clock = useMemo<ClockControls | null>(() => {
    if (!fake) return null;
    return {
      advance: (ms) => {
        fake.chain.advance(ms);
        refresh();
      },
      toMaturity: () => {
        fake.chain.advanceToMaturity(1000);
        refresh();
      },
    };
  }, [fake, refresh]);

  const value = useMemo<RheaSession>(
    () => ({
      client,
      mode,
      deployment: client.deployment(),
      version,
      accounts: fake ? FAKE_ACCOUNTS : demoAccount ? [demoAccount] : walletAccount ? [walletAccount] : [],
      account: fake ? fakeAccount : (demoAccount ?? walletAccount),
      selectAccount: setFakeAccount,
      walletStatus: !fake && demoAccount ? "ready" : walletStatus,
      signIn,
      signOut,
      identity: fake ? null : demoAccount ? "demo" : walletAccount ? "wallet" : null,
      pickerOpen,
      closePicker,
      demoAccounts,
      connectDemo,
      connectWallet,
      execute,
      refresh,
      clock,
      notice: build.notice,
    }),
    [client, mode, version, fake, fakeAccount, demoAccount, walletAccount, walletStatus, signIn, signOut, pickerOpen, closePicker, demoAccounts, connectDemo, connectWallet, execute, refresh, clock, build.notice],
  );

  return <RheaContext.Provider value={value}>{children}</RheaContext.Provider>;
}

export function useRhea(): RheaSession {
  const session = useContext(RheaContext);
  if (!session) throw new Error("useRhea must be used inside RheaProvider");
  return session;
}
