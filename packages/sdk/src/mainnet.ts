import { DEFAULT_P0 } from "./constants";
import { rawBlock, rawView, u128Schema } from "./rpc";
import type { MainnetReference } from "./types";

export const MAINNET_RPC_URL = "https://free.rpc.fastnear.com";
export const MAINNET_ARCHIVAL_RPC_URL = "https://archival-rpc.mainnet.fastnear.com";
export const MAINNET_CACHE_MS = 10 * 60_000;
const SAMPLE_WINDOW_MS = 30 * 86_400_000;
const YEAR_MS = 365 * 86_400_000;
const ESTIMATED_BLOCK_MS = 600;

export const lastKnownMainnet: MainnetReference = {
  price: DEFAULT_P0,
  apy: 0.041,
  sampledAt: "2026-11-09T13:14:00.000Z",
};

export interface MainnetSamplerOptions {
  fetch: typeof fetch;
  stNearAccount: string;
  rpcUrl?: string;
  archivalUrl?: string;
  now?: () => number;
}

async function priceAt(
  options: MainnetSamplerOptions,
  url: string,
  ref: { finality: "final" } | { block_id: number },
): Promise<bigint> {
  const raw = await rawView(options.fetch, url, options.stNearAccount, "get_st_near_price", ref);
  return u128Schema.parse(raw);
}

export async function sampleMainnet(options: MainnetSamplerOptions): Promise<MainnetReference> {
  const rpcUrl = options.rpcUrl ?? MAINNET_RPC_URL;
  const archivalUrl = options.archivalUrl ?? MAINNET_ARCHIVAL_RPC_URL;
  const now = options.now ?? Date.now;
  const head = await rawBlock(options.fetch, rpcUrl, { finality: "final" });
  const priceNow = await priceAt(options, rpcUrl, { finality: "final" });
  const targetMs = head.timestampMs - SAMPLE_WINDOW_MS;
  let height = head.height - Math.round(SAMPLE_WINDOW_MS / ESTIMATED_BLOCK_MS);
  let sample = await rawBlock(options.fetch, archivalUrl, { block_id: height });
  const correction = Math.round((sample.timestampMs - targetMs) / ESTIMATED_BLOCK_MS);
  if (correction !== 0) {
    height -= correction;
    sample = await rawBlock(options.fetch, archivalUrl, { block_id: height });
  }
  const priceThen = await priceAt(options, archivalUrl, { block_id: sample.height });
  const elapsedMs = head.timestampMs - sample.timestampMs;
  if (priceThen === 0n || elapsedMs <= 0) throw new Error("mainnet sample is unusable");
  const growth = Number((priceNow * 10n ** 12n) / priceThen) / 1e12;
  const apy = Math.pow(growth, YEAR_MS / elapsedMs) - 1;
  return { price: priceNow, apy, sampledAt: new Date(now()).toISOString() };
}

export class MainnetReferenceCache {
  private cached: { at: number; value: MainnetReference } | null = null;
  private lastGood: MainnetReference = lastKnownMainnet;

  constructor(private readonly options: MainnetSamplerOptions) {}

  async get(): Promise<MainnetReference> {
    const now = (this.options.now ?? Date.now)();
    if (this.cached !== null && now - this.cached.at < MAINNET_CACHE_MS) return this.cached.value;
    try {
      const value = await sampleMainnet(this.options);
      this.cached = { at: now, value };
      this.lastGood = value;
      return value;
    } catch {
      const base = this.lastGood.sampledAt.startsWith("stale:")
        ? this.lastGood.sampledAt.slice("stale:".length)
        : this.lastGood.sampledAt;
      return { ...this.lastGood, sampledAt: `stale:${base}` };
    }
  }
}
