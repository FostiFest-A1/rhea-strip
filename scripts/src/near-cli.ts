import { spawnSync } from "node:child_process";
import { z } from "zod";
import { rawRpc } from "@rhea/sdk";
import { sleep } from "./common";

const NETWORK = "testnet";

export interface CliResult {
  stdout: string;
  stderr: string;
}

export function near(args: string[]): CliResult {
  const result = spawnSync("near", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error !== undefined) throw new Error(`failed to run near: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`near ${args.slice(0, 4).join(" ")} failed (exit ${result.status}): ${result.stderr || result.stdout}`);
  }
  return { stdout: result.stdout, stderr: result.stderr };
}

const TRANSIENT = /error sending request|connection (reset|refused|closed)|timed? ?out|temporarily unavailable|too many requests|\b(429|502|503|504)\b|dns error|broken pipe/i;
const RETRY_ATTEMPTS = 4;

function nearRetry(args: string[]): CliResult {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return near(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt >= RETRY_ATTEMPTS || !TRANSIENT.test(message)) throw error;
      process.stdout.write(`transient near-cli error, retry ${attempt}/${RETRY_ATTEMPTS - 1}: ${message.split("\n")[0].slice(0, 160)}\n`);
      sleepSync(1500 * attempt);
    }
  }
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function nearAvailable(): boolean {
  const result = spawnSync("near", ["--version"], { encoding: "utf8" });
  return result.error === undefined && result.status === 0;
}

export function parseTxHash(output: string): string {
  const match = /Transaction ID:\s*([1-9A-HJ-NP-Za-km-z]{40,50})/.exec(output) ?? /transactions\/([1-9A-HJ-NP-Za-km-z]{40,50})/.exec(output);
  if (match === null) throw new Error(`could not find a transaction hash in near output:\n${output}`);
  return match[1];
}

export function accountExists(accountId: string): boolean {
  const result = spawnSync("near", ["account", "view-account-summary", accountId, "network-config", NETWORK, "now"], {
    encoding: "utf8",
  });
  return result.status === 0 && !/does not exist|UnknownAccount/i.test(result.stdout + result.stderr);
}

export function keychainHasKey(accountId: string): boolean {
  const result = spawnSync("near", ["account", "get-public-key", "from-keychain", accountId, "network-config", NETWORK], {
    encoding: "utf8",
  });
  return result.status === 0;
}

export function createAccountByFaucet(accountId: string): void {
  near([
    "account",
    "create-account",
    "sponsor-by-faucet-service",
    accountId,
    "autogenerate-new-keypair",
    "save-to-keychain",
    "network-config",
    NETWORK,
    "create",
  ]);
}

export function createSubAccount(accountId: string, parent: string, balanceNear: string): void {
  near([
    "account",
    "create-account",
    "fund-myself",
    accountId,
    `${balanceNear} NEAR`,
    "autogenerate-new-keypair",
    "save-to-keychain",
    "sign-as",
    parent,
    "network-config",
    NETWORK,
    "sign-with-keychain",
    "send",
  ]);
}

export function deleteAccount(accountId: string, beneficiary: string): void {
  near(["account", "delete-account", accountId, "beneficiary", beneficiary, "network-config", NETWORK, "sign-with-keychain", "send"]);
}

export function deployWasm(
  accountId: string,
  wasmPath: string,
  init: { method: string; args: Record<string, unknown>; gasTgas: number } | null,
): string {
  const base = ["contract", "deploy", accountId, "use-file", wasmPath];
  const tail = ["network-config", NETWORK, "sign-with-keychain", "send"];
  const args =
    init === null
      ? [...base, "without-init-call", ...tail]
      : [
          ...base,
          "with-init-call",
          init.method,
          "json-args",
          JSON.stringify(init.args),
          "prepaid-gas",
          `${init.gasTgas} Tgas`,
          "attached-deposit",
          "0 NEAR",
          ...tail,
        ];
  const output = near(args);
  return parseTxHash(output.stdout + output.stderr);
}

export interface SentTx {
  hash: string;
}

export function sendCall(params: {
  signer: string;
  contract: string;
  method: string;
  args: Record<string, unknown>;
  gas: bigint;
  deposit: bigint;
}): SentTx {
  const gasTgas = Number(params.gas / 10n ** 12n);
  const output = nearRetry([
    "contract",
    "call-function",
    "as-transaction",
    params.contract,
    params.method,
    "json-args",
    JSON.stringify(params.args),
    "prepaid-gas",
    `${gasTgas} Tgas`,
    "attached-deposit",
    `${params.deposit} yoctoNEAR`,
    "sign-as",
    params.signer,
    "network-config",
    NETWORK,
    "sign-with-keychain",
    "send",
  ]);
  return { hash: parseTxHash(output.stdout + output.stderr) };
}

const outcomeSchema = z.object({
  status: z.union([z.object({ SuccessValue: z.string().optional() }).passthrough(), z.object({ Failure: z.unknown() }).passthrough()]),
  receipts_outcome: z.array(z.object({ outcome: z.object({ status: z.record(z.string(), z.unknown()) }) })),
});

export interface FinalOutcome {
  successValue: string | null;
}

export async function waitFinal(rpcUrl: string, hash: string, signer: string, fetchImpl: typeof fetch): Promise<FinalOutcome> {
  let lastError = "";
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const raw = await rawRpc<unknown>(fetchImpl, rpcUrl, "tx", { tx_hash: hash, sender_account_id: signer, wait_until: "FINAL" });
      const parsed = outcomeSchema.parse(raw);
      if ("Failure" in parsed.status) throw new Error(`transaction ${hash} failed: ${JSON.stringify(parsed.status.Failure)}`);
      for (const receipt of parsed.receipts_outcome) {
        if ("Failure" in receipt.outcome.status) {
          throw new Error(`receipt of ${hash} failed: ${JSON.stringify(receipt.outcome.status.Failure)}`);
        }
      }
      const value = parsed.status.SuccessValue;
      return { successValue: value === undefined || value === "" ? null : new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0))) };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (lastError.includes("failed:")) throw error;
      await sleep(1500);
    }
  }
  throw new Error(`timed out waiting for ${hash}: ${lastError}`);
}
