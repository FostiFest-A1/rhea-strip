import { FailoverRpcProvider, JsonRpcProvider } from "near-api-js";
import { z } from "zod";

export const u128Schema = z
  .string()
  .regex(/^\d+$/)
  .transform((value) => BigInt(value));

export const u64Schema = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((value) => Number(value));

export const accountSchema = z.string().min(1);

export class RpcViews {
  private readonly provider: FailoverRpcProvider;

  constructor(urls: string[]) {
    if (urls.length === 0) throw new Error("no RPC urls configured");
    this.provider = new FailoverRpcProvider(urls.map((url) => new JsonRpcProvider({ url })));
  }

  async view<T>(contractId: string, method: string, args: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
    const raw = await this.provider.callFunction({ contractId, method, args });
    return schema.parse(raw);
  }

  async nearBalance(accountId: string): Promise<bigint> {
    try {
      const view = await this.provider.viewAccount({ accountId });
      return BigInt(view.amount);
    } catch {
      return 0n;
    }
  }
}

interface JsonRpcEnvelope<T> {
  result?: T;
  error?: { message?: string; data?: unknown };
}

export async function rawRpc<T>(
  fetchImpl: typeof fetch,
  url: string,
  method: string,
  params: unknown,
): Promise<T> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "rhea", method, params }),
  });
  if (!response.ok) throw new Error(`RPC ${method} failed with HTTP ${response.status}`);
  const envelope = (await response.json()) as JsonRpcEnvelope<T>;
  if (envelope.error !== undefined || envelope.result === undefined) {
    throw new Error(`RPC ${method} error: ${envelope.error?.message ?? "empty result"}`);
  }
  return envelope.result;
}

const callResultSchema = z.object({ result: z.array(z.number()) });
const blockSchema = z.object({
  header: z.object({ height: z.number(), timestamp_nanosec: z.string() }),
});

export async function rawView(
  fetchImpl: typeof fetch,
  url: string,
  contractId: string,
  method: string,
  blockRef: { finality: "final" } | { block_id: number },
): Promise<unknown> {
  const argsBase64 = btoa("{}");
  const result = callResultSchema.parse(
    await rawRpc(fetchImpl, url, "query", {
      request_type: "call_function",
      account_id: contractId,
      method_name: method,
      args_base64: argsBase64,
      ...blockRef,
    }),
  );
  return JSON.parse(new TextDecoder().decode(new Uint8Array(result.result)));
}

export async function rawBlock(
  fetchImpl: typeof fetch,
  url: string,
  blockRef: { finality: "final" } | { block_id: number },
): Promise<{ height: number; timestampMs: number }> {
  const block = blockSchema.parse(await rawRpc(fetchImpl, url, "block", blockRef));
  return {
    height: block.header.height,
    timestampMs: Number(BigInt(block.header.timestamp_nanosec) / 1_000_000n),
  };
}
