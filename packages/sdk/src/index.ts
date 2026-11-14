import { createFakeClient } from "./fake";
import { getDeployment } from "./env";
import { createTestnetClient } from "./testnet";
import type { Mode, RheaClient } from "./types";

export * from "./types";
export * from "./constants";
export * from "./pricing";
export { getDeployment, getMode } from "./env";
export { testnetDeployment } from "./deployments/testnet";
export { TxPlanner, fnCall } from "./planner";
export type { PlannerReads } from "./planner";
export { composeClient } from "./client";
export { RpcViews, rawRpc } from "./rpc";
export { MainnetReferenceCache, sampleMainnet, lastKnownMainnet } from "./mainnet";
export { createTestnetClient } from "./testnet";
export type { TestnetClientOptions } from "./testnet";

export function createClient(opts: { mode: Mode; fetch?: typeof fetch }): RheaClient {
  if (opts.mode === "fake") return createFakeClient();
  const deployment = getDeployment();
  if (!deployment.deployed) throw new Error("testnet deployment is not available: deployed is false");
  return createTestnetClient({ deployment, fetch: opts.fetch });
}
