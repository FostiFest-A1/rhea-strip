import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Deployment } from "@rhea/sdk";

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, "..", "..");
export const DEPLOYMENT_JSON = join(REPO_ROOT, "deployments", "testnet.json");
export const DEPLOYMENT_TS = join(REPO_ROOT, "packages", "sdk", "src", "deployments", "testnet.ts");
export const CONTRACTS_TARGET = join(REPO_ROOT, "contracts", "target", "near");

export const WASM = {
  mstnear: join(CONTRACTS_TARGET, "mock_stnear", "mock_stnear.wasm"),
  pt: join(CONTRACTS_TARGET, "pt_token", "pt_token.wasm"),
  vault: join(CONTRACTS_TARGET, "strip_vault", "strip_vault.wasm"),
} as const;

export const DEFAULT_ROOT_ACCOUNT = "rhea-strip.testnet";

export function parseFlags(argv: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const name = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      flags.set(name, "true");
    } else {
      flags.set(name, next);
      i += 1;
    }
  }
  return flags;
}

export function intFlag(flags: Map<string, string>, name: string, fallback: number): number {
  const raw = flags.get(name);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`--${name} must be a positive integer`);
  return parsed;
}

export function rootAccount(flags: Map<string, string>): string {
  const value = flags.get("root") ?? process.env.RHEA_ROOT_ACCOUNT ?? DEFAULT_ROOT_ACCOUNT;
  if (!value.endsWith(".testnet")) throw new Error(`root account must end with .testnet: ${value}`);
  return value;
}

export function assertTestnet(): void {
  const env = process.env.RHEA_NEAR_ENV;
  if (env !== undefined && env !== "testnet") throw new Error("RHEA_NEAR_ENV must be testnet");
}

export function loadDeployment(): Deployment {
  if (!existsSync(DEPLOYMENT_JSON)) throw new Error("deployments/testnet.json is missing; run pnpm deploy:testnet first");
  const parsed = JSON.parse(readFileSync(DEPLOYMENT_JSON, "utf8")) as Deployment;
  if (!parsed.deployed) throw new Error("deployments/testnet.json has deployed:false; run pnpm deploy:testnet first");
  return parsed;
}

function tsLiteral(value: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  const inner = "  ".repeat(indent + 1);
  if (Array.isArray(value)) {
    return `[${value.map((item) => tsLiteral(item, indent)).join(", ")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value).map(([key, item]) => `${inner}${key}: ${tsLiteral(item, indent + 1)},`);
    return `{\n${entries.join("\n")}\n${pad}}`;
  }
  return JSON.stringify(value);
}

export function writeDeployment(deployment: Deployment): void {
  mkdirSync(dirname(DEPLOYMENT_JSON), { recursive: true });
  writeFileSync(DEPLOYMENT_JSON, `${JSON.stringify(deployment, null, 2)}\n`);
  const source = `import type { Deployment } from "../types";\n\nexport const testnetDeployment: Deployment = ${tsLiteral(deployment, 0)};\n`;
  writeFileSync(DEPLOYMENT_TS, source);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((done) => {
    setTimeout(done, ms);
  });
}

export async function retryAsync<T>(task: () => Promise<T>, attempts: number, delayMs: number): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= attempts) throw error;
      log(`transient error, retry ${attempt}/${attempts - 1}: ${error instanceof Error ? error.message.slice(0, 160) : String(error)}`);
      await sleep(delayMs * attempt);
    }
  }
}

export function log(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function ptSymbol(maturityMs: number): string {
  const date = new Date(maturityMs);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `PT-mstNEAR-${day}${months[date.getUTCMonth()]}${date.getUTCFullYear()}`;
}
