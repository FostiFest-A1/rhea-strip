import { createTestnetClient, fmtCountdown } from "@rhea/sdk";
import { assertTestnet, loadDeployment, log, retryAsync, sleep } from "./common";
import { runFlow } from "./flow";
import { accountExists, createAccountByFaucet, keychainHasKey, nearAvailable } from "./near-cli";
import { TestnetExecutor } from "./testnet-exec";

const MIN_REMAINING_MS = 4 * 60_000;

function ensureAccount(accountId: string): void {
  if (!accountExists(accountId)) {
    log(`creating ${accountId} through the faucet service`);
    createAccountByFaucet(accountId);
  } else if (!keychainHasKey(accountId)) {
    throw new Error(`blocker: ${accountId} exists but its key is not in the OS keychain`);
  }
}

async function main(): Promise<void> {
  assertTestnet();
  if (!nearAvailable()) throw new Error("blocker: near-cli-rs (`near`) is not installed; run cargo install --locked near-cli-rs");
  const deployment = loadDeployment();
  const client = createTestnetClient({ deployment });
  const series = await retryAsync(() => client.series(), 4, 2000);
  const remaining = series.maturityMs - client.nowMs();
  if (series.status !== "Active" || remaining < MIN_REMAINING_MS) {
    throw new Error(`series is ${series.status} with ${fmtCountdown(remaining)} left; run pnpm new-series -- --minutes 10 first`);
  }
  const prefix = deployment.rootAccount.replace(/\.testnet$/, "");
  const alice = `${prefix}-alice.testnet`;
  const bob = `${prefix}-bob.testnet`;
  ensureAccount(alice);
  ensureAccount(bob);
  const table = await runFlow({
    client,
    exec: new TestnetExecutor(deployment, fetch),
    alice,
    bob,
    watch: [alice, bob, deployment.maker],
    strict: false,
    pause: (ms) => sleep(Math.min(ms, 20_000)),
    waitForMaturity: async () => {
      for (;;) {
        const left = (await retryAsync(() => client.series(), 4, 2000)).maturityMs - client.nowMs();
        if (left <= 1000) return;
        log(`waiting for maturity: ${fmtCountdown(left)}`);
        await sleep(Math.min(left + 1500, 15_000));
      }
    },
  });
  log(`${table}\n\ne2e:testnet OK (all five PRD success criteria on ${deployment.vault})`);
}

main().catch((error: unknown) => {
  log(`e2e:testnet FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
