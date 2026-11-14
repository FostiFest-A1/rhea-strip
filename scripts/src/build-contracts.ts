import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { REPO_ROOT, log } from "./common";

const CRATES = ["mock-stnear", "pt-token", "strip-vault"];

function main(): void {
  for (const crate of CRATES) {
    log(`building ${crate}`);
    const result = spawnSync("cargo", ["near", "build", "non-reproducible-wasm"], {
      cwd: join(REPO_ROOT, "contracts", crate),
      stdio: "inherit",
    });
    if (result.status !== 0) {
      log(`build of ${crate} failed with exit code ${result.status}`);
      process.exit(1);
    }
  }
  log("all contracts built under contracts/target/near");
}

main();
