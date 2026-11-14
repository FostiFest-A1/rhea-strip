import type { FakeWallet } from "@rhea/sdk/fake";
import type { Account, TxPlan, TxStep } from "@rhea/sdk";
import { PlanError } from "./errors";

export type StepObserver = {
  onStepStart: (index: number) => void;
  onStepDone: (index: number, hashes: string[]) => void;
};

export interface PlanExecutor {
  execute(plan: TxPlan, account: Account, observer: StepObserver): Promise<void>;
}

const FAKE_STEP_DELAY_MS = 450;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function createFakeExecutor(wallet: FakeWallet): PlanExecutor {
  return {
    async execute(plan, account, observer) {
      for (let index = 0; index < plan.length; index += 1) {
        const step = plan[index];
        if (!step) continue;
        observer.onStepStart(index);
        await pause(FAKE_STEP_DELAY_MS);
        const result = await wallet.signAndSend([step], account);
        if (!result.ok) throw new PlanError(result.error ?? "Transaction failed", index);
        const hashes = result.steps.flatMap((entry) => entry.outcomes.map((outcome) => outcome.hash));
        observer.onStepDone(index, hashes);
      }
    },
  };
}

export type WalletLike = {
  signAndSendTransactions(params: { transactions: TxStep["transactions"] }): Promise<unknown>;
};

function hashOf(outcome: unknown): string | null {
  if (typeof outcome !== "object" || outcome === null) return null;
  const record = outcome as Record<string, unknown>;
  const transaction = record.transaction;
  if (typeof transaction === "object" && transaction !== null) {
    const hash = (transaction as Record<string, unknown>).hash;
    if (typeof hash === "string") return hash;
  }
  const transactionOutcome = record.transaction_outcome;
  if (typeof transactionOutcome === "object" && transactionOutcome !== null) {
    const id = (transactionOutcome as Record<string, unknown>).id;
    if (typeof id === "string") return id;
  }
  return null;
}

function failureOf(outcome: unknown): string | null {
  if (typeof outcome !== "object" || outcome === null) return null;
  const status = (outcome as Record<string, unknown>).status;
  if (typeof status !== "object" || status === null) return null;
  const failure = (status as Record<string, unknown>).Failure;
  if (failure === undefined) return null;
  return JSON.stringify(failure);
}

export function createWalletExecutor(getWallet: () => Promise<WalletLike>): PlanExecutor {
  return {
    async execute(plan, _account, observer) {
      const wallet = await getWallet();
      for (let index = 0; index < plan.length; index += 1) {
        const step = plan[index];
        if (!step) continue;
        observer.onStepStart(index);
        let outcomes: unknown;
        try {
          outcomes = await wallet.signAndSendTransactions({ transactions: step.transactions });
        } catch (cause) {
          throw new PlanError(cause instanceof Error ? cause.message : "The wallet rejected the request", index);
        }
        const list = Array.isArray(outcomes) ? outcomes : [outcomes];
        for (const outcome of list) {
          const failure = failureOf(outcome);
          if (failure) throw new PlanError(failure, index);
        }
        const hashes = list.map(hashOf).filter((hash): hash is string => hash !== null);
        observer.onStepDone(index, hashes);
      }
    },
  };
}

type DemoResponse = { outcomes?: { hash: string; failure: string | null }[]; error?: string };

/** Signs on the server for a throwaway demo account; the browser never sees the key. */
export function createDemoExecutor(): PlanExecutor {
  return {
    async execute(plan, account, observer) {
      for (let index = 0; index < plan.length; index += 1) {
        const step = plan[index];
        if (!step) continue;
        observer.onStepStart(index);
        let body: DemoResponse;
        try {
          const response = await fetch("/api/demo/send", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ accountId: account, transactions: step.transactions }),
          });
          body = (await response.json()) as DemoResponse;
          if (!response.ok) throw new Error(body.error ?? `Demo signer returned ${response.status}`);
        } catch (cause) {
          throw new PlanError(cause instanceof Error ? cause.message : "Demo transaction failed", index);
        }
        const outcomes = body.outcomes ?? [];
        const failed = outcomes.find((outcome) => outcome.failure);
        if (failed?.failure) throw new PlanError(failed.failure, index);
        observer.onStepDone(index, outcomes.map((outcome) => outcome.hash).filter(Boolean));
      }
    },
  };
}
