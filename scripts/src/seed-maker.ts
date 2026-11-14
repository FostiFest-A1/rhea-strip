import { assertTestnet, log } from "./common";
import { nearAvailable } from "./near-cli";
import { seedMaker } from "./seed";

async function main(): Promise<void> {
  assertTestnet();
  if (!nearAvailable()) throw new Error("blocker: near-cli-rs (`near`) is not installed; run cargo install --locked near-cli-rs");
  await seedMaker();
}

main().catch((error: unknown) => {
  log(`seed-maker failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
