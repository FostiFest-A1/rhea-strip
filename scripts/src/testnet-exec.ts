import type { Account, Deployment, TxPlan } from "@rhea/sdk";
import type { Executor, TxRecord } from "./flow";
import { sendCall, waitFinal } from "./near-cli";

export class TestnetExecutor implements Executor {
  constructor(
    private readonly deployment: Deployment,
    private readonly fetchImpl: typeof fetch,
  ) {}

  async send(plan: TxPlan, account: Account): Promise<TxRecord[]> {
    const records: TxRecord[] = [];
    for (const step of plan) {
      for (const transaction of step.transactions) {
        for (const action of transaction.actions) {
          const { methodName, args, gas, deposit } = action.params;
          const sent = sendCall({
            signer: account,
            contract: transaction.receiverId,
            method: methodName,
            args,
            gas: BigInt(gas),
            deposit: BigInt(deposit),
          });
          const outcome = await waitFinal(this.deployment.rpcUrls[0], sent.hash, account, this.fetchImpl);
          if (methodName === "ft_transfer_call" && typeof args.amount === "string") {
            const used = outcome.successValue === null ? "0" : String(JSON.parse(outcome.successValue));
            if (used !== args.amount) {
              throw new Error(`${methodName} on ${transaction.receiverId} was refunded (used ${used} of ${args.amount}); see ${this.link(sent.hash) ?? sent.hash}`);
            }
          }
          records.push({ stepId: step.id, label: step.label, receiverId: transaction.receiverId, method: methodName, hash: sent.hash });
        }
      }
    }
    return records;
  }

  link(hash: string): string | null {
    return `${this.deployment.explorerUrl}/txns/${hash}`;
  }
}
