import { createFakeClient, type FakeClient } from "@rhea/sdk/fake";
import type { Account, TxPlan } from "@rhea/sdk";
import { runFlow, type Executor, type TxRecord } from "./flow";

class FakeExecutor implements Executor {
  constructor(private readonly client: FakeClient) {}

  async send(plan: TxPlan, account: Account): Promise<TxRecord[]> {
    const result = await this.client.wallet.signAndSend(plan, account);
    if (!result.ok) throw new Error(`plan failed for ${account}: ${result.error ?? "unknown"}`);
    const records: TxRecord[] = [];
    for (const step of result.steps) {
      for (const outcome of step.outcomes) {
        if (outcome.refunded !== undefined && outcome.refunded > 0n) {
          throw new Error(`${outcome.method} refunded ${outcome.refunded} (${outcome.refundReason ?? "unknown"})`);
        }
        records.push({
          stepId: step.stepId,
          label: step.label,
          receiverId: outcome.receiver,
          method: outcome.method,
          hash: outcome.hash,
        });
      }
    }
    return records;
  }

  link(): string | null {
    return null;
  }
}

async function main(): Promise<void> {
  const client = createFakeClient({ realtime: false, seed: false, startMs: Date.parse("2026-11-14T00:00:00.000Z") });
  const table = await runFlow({
    client,
    exec: new FakeExecutor(client),
    alice: "alice.testnet",
    bob: "bob.testnet",
    watch: ["alice.testnet", "bob.testnet"],
    strict: true,
    pause: async (ms) => {
      client.chain.advance(ms);
    },
    waitForMaturity: async () => {
      client.chain.advanceToMaturity(1000);
    },
  });
  process.stdout.write(`${table}\n\ne2e:fake OK (all five PRD success criteria, conservation and attribution asserted)\n`);
}

main().catch((error: unknown) => {
  process.stdout.write(`e2e:fake FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
