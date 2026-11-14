import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Account, FailoverRpcProvider, JsonRpcProvider, KeyPairSigner, type KeyPairString } from "near-api-js";
import { getDeployment, type TxRequest } from "@rhea/sdk";

/** Throwaway testnet accounts the app signs for on the server. Their keys never reach the browser. */
export const DEMO_ACCOUNTS = ["rhea-strip-alice.testnet", "rhea-strip-bob.testnet"] as const;

const ALLOWED_METHODS = new Set([
  "storage_deposit",
  "faucet",
  "sync_index",
  "ft_transfer_call",
  "list_yt",
  "cancel_offer",
  "settle",
  "claim_yield",
  "withdraw_sy",
]);
const MAX_DEPOSIT = 10n ** 23n; // 0.1 NEAR
const MAX_GAS = 300n * 10n ** 12n;

function loadKey(accountId: string): KeyPairString {
  const fromEnv = process.env.RHEA_DEMO_KEYS;
  if (fromEnv) {
    const parsed = JSON.parse(fromEnv) as Record<string, string>;
    const key = parsed[accountId];
    if (key) return key as KeyPairString;
  }
  if (process.env.NODE_ENV !== "production") {
    const file = join(homedir(), ".near-credentials", "testnet", `${accountId}.json`);
    if (existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as { private_key?: string };
      if (parsed.private_key) return parsed.private_key as KeyPairString;
    }
  }
  throw new Error(`No key configured for demo account ${accountId}`);
}

export function demoAccountsAvailable(): string[] {
  return DEMO_ACCOUNTS.filter((id) => {
    try {
      loadKey(id);
      return true;
    } catch {
      return false;
    }
  });
}

export function validateDemoRequest(accountId: string, transactions: TxRequest[]): void {
  if (!(DEMO_ACCOUNTS as readonly string[]).includes(accountId)) throw new Error("Unknown demo account");
  const deployment = getDeployment();
  const contracts = new Set([deployment.underlying, deployment.pt, deployment.vault]);
  if (transactions.length === 0 || transactions.length > 4) throw new Error("Bad transaction batch");
  for (const tx of transactions) {
    if (!contracts.has(tx.receiverId)) throw new Error(`Receiver not allowed: ${tx.receiverId}`);
    if (tx.actions.length === 0 || tx.actions.length > 4) throw new Error("Bad action batch");
    for (const action of tx.actions) {
      if (action.type !== "FunctionCall") throw new Error("Only function calls are allowed");
      const { methodName, gas, deposit } = action.params;
      if (!ALLOWED_METHODS.has(methodName)) throw new Error(`Method not allowed: ${methodName}`);
      if (BigInt(deposit) > MAX_DEPOSIT) throw new Error("Deposit too large");
      if (BigInt(gas) > MAX_GAS) throw new Error("Gas too large");
    }
  }
}

export type DemoOutcome = { hash: string; failure: string | null };

export async function sendAsDemo(accountId: string, transactions: TxRequest[]): Promise<DemoOutcome[]> {
  validateDemoRequest(accountId, transactions);
  const deployment = getDeployment();
  const provider = new FailoverRpcProvider(deployment.rpcUrls.map((url) => new JsonRpcProvider({ url })));
  const account = new Account(accountId, provider, KeyPairSigner.fromSecretKey(loadKey(accountId)));
  const outcomes: DemoOutcome[] = [];
  for (const tx of transactions) {
    for (const action of tx.actions) {
      const { methodName, args, gas, deposit } = action.params;
      const result = (await account.callFunctionRaw({
        contractId: tx.receiverId,
        methodName,
        args,
        gas: BigInt(gas),
        deposit: BigInt(deposit),
      })) as unknown;
      const outcome = summarise(result);
      if (methodName === "ft_transfer_call" && typeof args.amount === "string" && outcome.failure === null) {
        const used = successValue(result);
        if (used !== null && used !== args.amount) {
          outcome.failure = `ft_transfer_call was refunded (used ${used} of ${args.amount})`;
        }
      }
      outcomes.push(outcome);
    }
  }
  return outcomes;
}

function summarise(result: unknown): DemoOutcome {
  const record = (typeof result === "object" && result !== null ? result : {}) as Record<string, unknown>;
  const transaction = record.transaction as Record<string, unknown> | undefined;
  const outcome = record.transaction_outcome as Record<string, unknown> | undefined;
  const hash = String(transaction?.hash ?? outcome?.id ?? "");
  const status = record.status as Record<string, unknown> | undefined;
  const failure = status && status.Failure !== undefined ? JSON.stringify(status.Failure) : null;
  return { hash, failure };
}

function successValue(result: unknown): string | null {
  const status = (result as { status?: { SuccessValue?: string } }).status;
  if (!status || typeof status.SuccessValue !== "string") return null;
  try {
    return String(JSON.parse(Buffer.from(status.SuccessValue, "base64").toString("utf8")));
  } catch {
    return null;
  }
}
