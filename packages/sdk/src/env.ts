import type { Mode } from "./types";
import { testnetDeployment } from "./deployments/testnet";
import type { Deployment } from "./types";

declare const process: { env: Record<string, string | undefined> } | undefined;

export function getMode(): Mode {
  const raw = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_RHEA_MODE : undefined;
  if (raw === "fake" || raw === "testnet") return raw;
  return testnetDeployment.deployed ? "testnet" : "fake";
}

export function getDeployment(): Deployment {
  return testnetDeployment;
}
