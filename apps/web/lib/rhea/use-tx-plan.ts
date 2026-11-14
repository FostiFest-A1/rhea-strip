"use client";

import { useCallback, useState } from "react";
import type { RheaClient, TxPlan } from "@rhea/sdk";
import type { StepperStep } from "@/components/ui/stepper";
import { useToast } from "@/components/ui/toast";
import { txUrl } from "@/lib/format";
import { describeError, PlanError } from "./errors";
import { useRhea } from "./context";

export type TxStatus = "idle" | "planning" | "running" | "success" | "error";

export type TxState = {
  status: TxStatus;
  title: string | null;
  steps: StepperStep[];
  error: string | null;
};

const IDLE: TxState = { status: "idle", title: null, steps: [], error: null };

export type RunOptions = {
  title: string;
  success: string;
};

export function useTxPlan() {
  const { client, account, execute, deployment, mode } = useRhea();
  const toast = useToast();
  const [state, setState] = useState<TxState>(IDLE);

  const reset = useCallback(() => setState(IDLE), []);

  const run = useCallback(
    async (plan: (client: RheaClient, account: string) => Promise<TxPlan>, options: RunOptions): Promise<boolean> => {
      if (!account) {
        toast({ message: "Connect a wallet first", tone: "error" });
        return false;
      }
      setState({ status: "planning", title: options.title, steps: [], error: null });

      let planned: TxPlan;
      try {
        planned = await plan(client, account);
      } catch (cause) {
        const message = describeError(cause);
        setState({ status: "error", title: options.title, steps: [], error: message });
        toast({ message, tone: "error" });
        return false;
      }

      const steps: StepperStep[] = planned.map((step) => ({ id: step.id, label: step.label, state: "idle" }));
      setState({ status: "running", title: options.title, steps, error: null });

      const patch = (index: number, change: Partial<StepperStep>) =>
        setState((current) => ({
          ...current,
          steps: current.steps.map((entry, position) => (position === index ? { ...entry, ...change } : entry)),
        }));

      try {
        await execute(planned, {
          onStepStart: (index) => patch(index, { state: "active" }),
          onStepDone: (index, hashes) => {
            const hash = hashes[hashes.length - 1];
            patch(index, {
              state: "done",
              href: mode === "testnet" && hash ? txUrl(deployment.explorerUrl, hash) : undefined,
              detail: mode === "fake" && hash ? `Simulated tx ${hash.slice(0, 10)}` : undefined,
            });
          },
        });
      } catch (cause) {
        const message = describeError(cause);
        const failedAt = cause instanceof PlanError ? cause.stepIndex : -1;
        if (failedAt >= 0) patch(failedAt, { state: "error", detail: message });
        setState((current) => ({ ...current, status: "error", error: message }));
        toast({ message, tone: "error" });
        return false;
      }

      setState((current) => ({ ...current, status: "success" }));
      toast({ message: options.success, tone: "success" });
      return true;
    },
    [account, client, deployment.explorerUrl, execute, mode, toast],
  );

  return { state, run, reset, busy: state.status === "planning" || state.status === "running" };
}
