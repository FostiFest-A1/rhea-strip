import { createTestnetClient } from "@rhea/sdk";
import { assertTestnet, loadDeployment, log, parseFlags, sleep } from "./common";
import { nearAvailable } from "./near-cli";
import { TestnetExecutor } from "./testnet-exec";

const SYNC_EVERY_MS = 15_000;

async function main(): Promise<void> {
  assertTestnet();
  if (!nearAvailable()) throw new Error("blocker: near-cli-rs (`near`) is not installed; run cargo install --locked near-cli-rs");
  const flags = parseFlags(process.argv.slice(2));
  const deployment = loadDeployment();
  const account = flags.get("account") ?? deployment.maker;
  const once = flags.has("once");
  const client = createTestnetClient({ deployment });
  const exec = new TestnetExecutor(deployment, fetch);
  log(`keeper running as ${account} on ${deployment.vault}`);
  for (;;) {
    const series = await client.series();
    if (series.status === "Settled") {
      log("series settled; keeper done");
      return;
    }
    const now = client.nowMs();
    if (series.status === "Matured" || now >= series.maturityMs) {
      log("matured: calling settle");
      await exec.send(await client.settle(account), account);
    } else if (now - series.indexTsMs >= SYNC_EVERY_MS) {
      const records = await exec.send([
        {
          id: "sync_index",
          label: "Sync index",
          waitFor: "final",
          transactions: [
            {
              receiverId: deployment.vault,
              actions: [{ type: "FunctionCall", params: { methodName: "sync_index", args: {}, gas: "50000000000000", deposit: "0" } }],
            },
          ],
        },
      ], account);
      log(`sync_index ${exec.link(records[0].hash) ?? records[0].hash}`);
    }
    if (once) return;
    await sleep(SYNC_EVERY_MS);
  }
}

main().catch((error: unknown) => {
  log(`keeper failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
