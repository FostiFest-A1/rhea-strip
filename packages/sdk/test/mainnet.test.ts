import { describe, expect, it } from "vitest";
import { MainnetReferenceCache, lastKnownMainnet } from "../src/mainnet";

interface RpcBody {
  method: string;
  params: Record<string, unknown>;
}

function priceBytes(price: bigint): number[] {
  return [...new TextEncoder().encode(JSON.stringify(price.toString()))];
}

function mockFetch(calls: { count: number }, fail = false): typeof fetch {
  const now = 1_800_000_000_000;
  const priceNow = 1_514_411_535_945_873_749_259_456n;
  const priceThen = 1_509_000_000_000_000_000_000_000n;
  return (async (_url: unknown, init?: RequestInit) => {
    calls.count += 1;
    if (fail) return new Response("down", { status: 503 });
    const body = JSON.parse(String(init?.body)) as RpcBody;
    let result: unknown;
    if (body.method === "block") {
      const blockId = body.params.block_id;
      const height = typeof blockId === "number" ? blockId : 100_000_000;
      const ms = typeof blockId === "number" ? now - (100_000_000 - blockId) * 600 : now;
      result = { header: { height, timestamp_nanosec: (BigInt(ms) * 1_000_000n).toString() } };
    } else {
      const isArchival = typeof body.params.block_id === "number";
      result = { result: priceBytes(isArchival ? priceThen : priceNow) };
    }
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: "rhea", result }), { status: 200 });
  }) as typeof fetch;
}

describe("mainnet reference", () => {
  it("samples price and derives an APY, then serves from cache for 10 minutes", async () => {
    const calls = { count: 0 };
    let clock = 1_000;
    const cache = new MainnetReferenceCache({ fetch: mockFetch(calls), stNearAccount: "meta-pool.near", now: () => clock });
    const first = await cache.get();
    expect(first.price).toBe(1_514_411_535_945_873_749_259_456n);
    expect(first.apy).toBeGreaterThan(0.03);
    expect(first.apy).toBeLessThan(0.06);
    const used = calls.count;
    clock += 5 * 60_000;
    await cache.get();
    expect(calls.count).toBe(used);
    clock += 6 * 60_000;
    await cache.get();
    expect(calls.count).toBeGreaterThan(used);
  });

  it("falls back to the last known constants marked stale when the RPC fails", async () => {
    const calls = { count: 0 };
    const cache = new MainnetReferenceCache({ fetch: mockFetch(calls, true), stNearAccount: "meta-pool.near", now: () => 0 });
    const value = await cache.get();
    expect(value.price).toBe(lastKnownMainnet.price);
    expect(value.apy).toBe(lastKnownMainnet.apy);
    expect(value.sampledAt.startsWith("stale:")).toBe(true);
    const again = await cache.get();
    expect(again.sampledAt.startsWith("stale:stale:")).toBe(false);
  });
});
