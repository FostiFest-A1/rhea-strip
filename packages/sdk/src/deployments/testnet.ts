import type { Deployment } from "../types";

export const testnetDeployment: Deployment = {
  network: "testnet",
  deployed: true,
  rootAccount: "rhea-strip.testnet",
  underlying: "mstnear.rhea-strip.testnet",
  pt: "pt.rhea-strip.testnet",
  vault: "strip.rhea-strip.testnet",
  maker: "maker.rhea-strip.testnet",
  maturityMs: 1794672509911,
  yearSecs: 3600,
  aprBps: 800,
  rpcUrls: ["https://test.rpc.fastnear.com", "https://testnet-rpc.intea.rs"],
  explorerUrl: "https://testnet.nearblocks.io",
  mainnetStNear: "meta-pool.near",
  deployedAt: "2026-11-14T15:57:36.531Z",
};
