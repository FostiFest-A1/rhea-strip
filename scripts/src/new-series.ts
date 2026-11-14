import { log, intFlag, loadDeployment, parseFlags } from "./common";
import { assertTestnet } from "./common";
import { nearAvailable } from "./near-cli";
import { seedMaker } from "./seed";
import { deploySeries } from "./series";

async function main(): Promise<void> {
  assertTestnet();
  if (!nearAvailable()) throw new Error("blocker: near-cli-rs (`near`) is not installed; run cargo install --locked near-cli-rs");
  const flags = parseFlags(process.argv.slice(2));
  const current = loadDeployment();
  const deployment = await deploySeries(
    {
      root: current.rootAccount,
      minutes: intFlag(flags, "minutes", 10),
      aprBps: current.aprBps,
      yearSecs: current.yearSecs,
    },
    "series",
  );
  log(`new series matures at ${new Date(deployment.maturityMs).toISOString()}; vault ${deployment.vault}, pt ${deployment.pt}`);
  if (flags.has("seed")) {
    await seedMaker();
    log("seeded maker offers on the new series");
  } else {
    log("run pnpm seed-maker to list maker offers on the new series");
  }
}

main().catch((error: unknown) => {
  log(`new-series failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
