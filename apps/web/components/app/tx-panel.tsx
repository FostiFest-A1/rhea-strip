"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stepper, type StepperStep } from "@/components/ui/stepper";
import type { TxState } from "@/lib/rhea/use-tx-plan";

type TxPanelProps = {
  title: string;
  idleSteps: StepperStep[];
  state: TxState;
  onReset: () => void;
  idleNote?: string;
};

export function TxPanel({ title, idleSteps, state, onReset, idleNote }: TxPanelProps) {
  const active = state.status !== "idle";
  const steps = active && state.steps.length > 0 ? state.steps : idleSteps;
  const heading = active && state.title ? state.title : title;

  return (
    <Card className="p-6 md:p-8">
      <h2 className="text-title font-medium text-fg">{heading}</h2>
      {state.status === "planning" ? <p className="mt-3 text-body text-fg-65">Preparing transactions</p> : null}
      <Stepper steps={steps} className="mt-6" />
      {state.status === "error" && state.error ? (
        <p role="alert" className="mt-6 rounded-xl bg-danger/10 px-4 py-3 text-ui text-danger shadow-[inset_0_0_0_1px_#ff5a4e40]">
          {state.error}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p role="status" className="mt-6 rounded-xl bg-ok/10 px-4 py-3 text-ui text-ok shadow-[inset_0_0_0_1px_#5be3a040]">
          All steps confirmed.
        </p>
      ) : null}
      {!active && idleNote ? <p className="mt-6 text-ui text-fg-50">{idleNote}</p> : null}
      {state.status === "success" || state.status === "error" ? (
        <Button variant="glass" size="sm" className="mt-6" onClick={onReset}>
          Clear
        </Button>
      ) : null}
    </Card>
  );
}
