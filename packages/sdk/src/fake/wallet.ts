import type { Account, TxPlan } from "../types";
import type { FakeChain } from "./chain";
import type { CallOutcome } from "./state";

export interface FakeStepResult {
  stepId: string;
  label: string;
  outcomes: CallOutcome[];
  ok: boolean;
}

export interface FakeSendResult {
  ok: boolean;
  steps: FakeStepResult[];
  error?: string;
}

export class FakeWallet {
  constructor(private readonly chain: FakeChain) {}

  async signAndSend(plan: TxPlan, account: Account): Promise<FakeSendResult> {
    const steps: FakeStepResult[] = [];
    for (const step of plan) {
      const outcomes: CallOutcome[] = [];
      let stepOk = true;
      for (const transaction of step.transactions) {
        for (const action of transaction.actions) {
          const outcome = this.chain.call({
            predecessor: account,
            receiver: transaction.receiverId,
            method: action.params.methodName,
            args: action.params.args,
            deposit: BigInt(action.params.deposit),
            gas: BigInt(action.params.gas),
          });
          outcomes.push(outcome);
          if (!outcome.ok) {
            stepOk = false;
            break;
          }
        }
        if (!stepOk) break;
      }
      steps.push({ stepId: step.id, label: step.label, outcomes, ok: stepOk });
      if (!stepOk) {
        const failed = outcomes[outcomes.length - 1];
        return { ok: false, steps, error: failed?.error ?? "transaction failed" };
      }
    }
    return { ok: true, steps };
  }
}
