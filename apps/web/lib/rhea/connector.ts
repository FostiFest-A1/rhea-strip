import type { NearConnector } from "@hot-labs/near-connect";

const TESTNET_PROVIDERS = ["https://test.rpc.fastnear.com", "https://testnet-rpc.intea.rs"];

let pending: Promise<NearConnector> | null = null;

export function loadConnector(): Promise<NearConnector> {
  if (pending === null) {
    pending = import("@hot-labs/near-connect").then(
      ({ NearConnector: Connector }) => new Connector({ network: "testnet", providers: { testnet: TESTNET_PROVIDERS } }),
    );
  }
  return pending;
}
