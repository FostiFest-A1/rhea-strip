import { existsSync, statSync } from "node:fs";
import { RpcViews, type Deployment } from "@rhea/sdk";
import { z } from "zod";
import { WASM, log, ptSymbol, sleep, writeDeployment } from "./common";
import {
  accountExists,
  createAccountByFaucet,
  createSubAccount,
  deleteAccount,
  deployWasm,
  keychainHasKey,
  sendCall,
  waitFinal,
} from "./near-cli";

const YOCTO = 10n ** 24n;
const DEPLOY_GAS_TGAS = 100;
const MIN_STRIP = (YOCTO / 100n).toString();
const STORAGE_DEPOSIT = 1_250_000_000_000_000_000_000n;
const MAKER_FAUCET_CALLS = 5;
export const RPC_URLS = ["https://test.rpc.fastnear.com", "https://testnet-rpc.intea.rs"];
export const EXPLORER_URL = "https://testnet.nearblocks.io";

export interface SeriesOptions {
  root: string;
  minutes: number;
  aprBps: number;
  yearSecs: number;
}

export interface SubAccounts {
  mstnear: string;
  pt: string;
  strip: string;
  maker: string;
}

export function subAccounts(root: string): SubAccounts {
  return { mstnear: `mstnear.${root}`, pt: `pt.${root}`, strip: `strip.${root}`, maker: `maker.${root}` };
}

async function initialized(views: RpcViews, contract: string, method: string): Promise<boolean> {
  try {
    await views.view(contract, method, {}, z.unknown());
    return true;
  } catch {
    return false;
  }
}

export async function waitForWasm(path: string, timeoutMs: number): Promise<void> {
  const started = Date.now();
  let announced = -1;
  while (!existsSync(path)) {
    const waited = Math.floor((Date.now() - started) / 60_000);
    if (waited !== announced) {
      announced = waited;
      log(`waiting for ${path} (${waited} min of ${Math.round(timeoutMs / 60_000)})`);
    }
    if (Date.now() - started > timeoutMs) throw new Error(`blocker: ${path} did not appear within ${Math.round(timeoutMs / 60_000)} minutes`);
    await sleep(30_000);
  }
}

function near(amount: number): bigint {
  return (BigInt(Math.round(amount * 100)) * YOCTO) / 100n;
}

function balanceFor(wasm: string, buffer: bigint): bigint {
  const storage = BigInt(statSync(wasm).size) * 10n ** 19n;
  return storage + buffer;
}

function formatNear(yocto: bigint): string {
  const whole = yocto / YOCTO;
  const frac = ((yocto % YOCTO) / (YOCTO / 100n)).toString().padStart(2, "0");
  return `${whole}.${frac}`;
}

function ceilNear(yocto: bigint): string {
  const cent = YOCTO / 100n;
  return formatNear(((yocto + cent - 1n) / cent) * cent);
}

export async function ensureRoot(root: string, views: RpcViews, requiredYocto: bigint): Promise<void> {
  if (!accountExists(root)) {
    log(`creating ${root} through the faucet service`);
    createAccountByFaucet(root);
  } else if (!keychainHasKey(root)) {
    throw new Error(`blocker: ${root} exists but its key is not in the OS keychain; use RHEA_ROOT_ACCOUNT with a keychain account`);
  }
  const balance = await views.nearBalance(root);
  if (balance < requiredYocto) {
    throw new Error(
      `blocker: ${root} holds ${formatNear(balance)} NEAR but deploying needs about ${formatNear(requiredYocto)} NEAR; fund it from a testnet faucet and rerun`,
    );
  }
}

async function ensureSub(account: string, parent: string, balance: bigint, fresh: boolean): Promise<void> {
  if (accountExists(account)) {
    if (!fresh) return;
    log(`deleting ${account} to reset its state`);
    deleteAccount(account, parent);
    await sleep(3000);
  }
  log(`creating ${account} with ${ceilNear(balance)} NEAR`);
  createSubAccount(account, parent, ceilNear(balance));
}

export async function deploySeries(options: SeriesOptions, mode: "full" | "series"): Promise<Deployment> {
  const accounts = subAccounts(options.root);
  const views = new RpcViews(RPC_URLS);
  await waitForWasm(WASM.mstnear, 5 * 60_000);
  await waitForWasm(WASM.pt, 5 * 60_000);
  await waitForWasm(WASM.vault, 25 * 60_000);

  const needs = {
    mstnear: balanceFor(WASM.mstnear, near(0.15)),
    pt: balanceFor(WASM.pt, near(0.15)),
    strip: balanceFor(WASM.vault, near(1.2)),
    maker: near(1.0),
  };
  let total = 0n;
  if (mode === "full") {
    for (const key of ["mstnear", "pt", "strip", "maker"] as const) {
      if (!accountExists(accounts[key])) total += needs[key];
    }
  }
  let refundable = 0n;
  if (mode === "series") {
    for (const key of ["pt", "strip"] as const) {
      if (accountExists(accounts[key])) refundable += await views.nearBalance(accounts[key]);
    }
    total = needs.pt + needs.strip > refundable ? needs.pt + needs.strip - refundable : 0n;
  }
  await ensureRoot(options.root, views, total + near(mode === "series" ? 0.1 : 0.4));

  const maturityMs = Date.now() + options.minutes * 60_000;
  const fresh = mode === "series";
  if (mode === "full") await ensureSub(accounts.mstnear, options.root, needs.mstnear, false);
  await ensureSub(accounts.pt, options.root, needs.pt, fresh);
  await ensureSub(accounts.strip, options.root, needs.strip, fresh);
  if (mode === "full") await ensureSub(accounts.maker, options.root, needs.maker, false);

  const underlyingReady = await initialized(views, accounts.mstnear, "get_params");
  if (mode === "full" && !underlyingReady) {
    log(`deploying mock-stnear to ${accounts.mstnear}`);
    deployWasm(accounts.mstnear, WASM.mstnear, {
      method: "new",
      args: { owner: options.root, apr_bps: options.aprBps, year_secs: String(options.yearSecs) },
      gasTgas: DEPLOY_GAS_TGAS,
    });
  }
  if (await initialized(views, accounts.pt, "get_minter")) {
    throw new Error(`${accounts.pt} is already initialized; use pnpm new-series to create a fresh series`);
  }
  log(`deploying pt-token to ${accounts.pt}`);
  deployWasm(accounts.pt, WASM.pt, {
    method: "new",
    args: {
      minter: accounts.strip,
      name: "Rhea Principal Token (mstNEAR)",
      symbol: ptSymbol(maturityMs),
      maturity_ms: String(maturityMs),
    },
    gasTgas: DEPLOY_GAS_TGAS,
  });
  log(`deploying strip-vault to ${accounts.strip}`);
  deployWasm(accounts.strip, WASM.vault, {
    method: "new",
    args: {
      owner: options.root,
      underlying: accounts.mstnear,
      pt: accounts.pt,
      maturity_ms: String(maturityMs),
      year_secs: String(options.yearSecs),
      min_strip: MIN_STRIP,
    },
    gasTgas: DEPLOY_GAS_TGAS,
  });
  await sleep(4000);

  for (const token of [accounts.mstnear, accounts.pt]) {
    const registered = await views.view(token, "storage_balance_of", { account_id: accounts.strip }, z.unknown());
    if (registered === null) {
      log(`registering ${accounts.strip} on ${token}`);
      const sent = sendCall({ signer: options.root, contract: token, method: "storage_deposit", args: { account_id: accounts.strip, registration_only: true }, gas: 30n * 10n ** 12n, deposit: STORAGE_DEPOSIT });
      await waitFinal(RPC_URLS[0], sent.hash, options.root, fetch);
    }
  }

  await prepareMaker(accounts, views);

  const deployment: Deployment = {
    network: "testnet",
    deployed: true,
    rootAccount: options.root,
    underlying: accounts.mstnear,
    pt: accounts.pt,
    vault: accounts.strip,
    maker: accounts.maker,
    maturityMs,
    yearSecs: options.yearSecs,
    aprBps: options.aprBps,
    rpcUrls: RPC_URLS,
    explorerUrl: EXPLORER_URL,
    mainnetStNear: "meta-pool.near",
    deployedAt: new Date().toISOString(),
  };
  writeDeployment(deployment);
  log(`wrote deployments/testnet.json and packages/sdk/src/deployments/testnet.ts (maturity ${new Date(maturityMs).toISOString()})`);
  return deployment;
}

async function prepareMaker(accounts: SubAccounts, views: RpcViews): Promise<void> {
  const balance = await views.view(accounts.mstnear, "ft_balance_of", { account_id: accounts.maker }, z.unknown());
  const have = typeof balance === "string" ? BigInt(balance) : 0n;
  if (have < 200n * YOCTO) {
    for (let i = 0; i < MAKER_FAUCET_CALLS; i += 1) {
      const sent = sendCall({ signer: accounts.maker, contract: accounts.mstnear, method: "faucet", args: {}, gas: 30n * 10n ** 12n, deposit: 0n });
      await waitFinal(RPC_URLS[0], sent.hash, accounts.maker, fetch);
    }
    log(`funded ${accounts.maker} with ${MAKER_FAUCET_CALLS * 100} mstNEAR`);
  }
  for (const token of [accounts.pt, accounts.strip]) {
    const registered = await views.view(token, "storage_balance_of", { account_id: accounts.maker }, z.unknown());
    if (registered === null) {
      const sent = sendCall({ signer: accounts.maker, contract: token, method: "storage_deposit", args: { registration_only: true }, gas: 30n * 10n ** 12n, deposit: STORAGE_DEPOSIT });
      await waitFinal(RPC_URLS[0], sent.hash, accounts.maker, fetch);
    }
  }
}
