import { DEFAULT_APR_BPS, DEFAULT_YEAR_SECS } from "@rhea/sdk";
import { assertTestnet, intFlag, log, parseFlags, rootAccount } from "./common";
import { nearAvailable } from "./near-cli";
import { deploySeries } from "./series";

async function main(): Promise<void> {
  assertTestnet();
  if (!nearAvailable()) throw new Error("blocker: near-cli-rs (`near`) is not installed; run cargo install --locked near-cli-rs");
  const flags = parseFlags(process.argv.slice(2));
  const deployment = await deploySeries(
    {
      root: rootAccount(flags),
      minutes: intFlag(flags, "minutes", 60),
      aprBps: intFlag(flags, "apr-bps", DEFAULT_APR_BPS),
      yearSecs: intFlag(flags, "year-secs", DEFAULT_YEAR_SECS),
    },
    "full",
  );
  log(`deployed: underlying ${deployment.underlying}, pt ${deployment.pt}, vault ${deployment.vault}, maker ${deployment.maker}`);
}

main().catch((error: unknown) => {
  log(`deploy failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
