import {
  DEFAULT_APR_BPS,
  DEFAULT_MIN_STRIP,
  DEFAULT_P0,
  DEFAULT_YEAR_SECS,
  FAUCET_AMOUNT,
  FAUCET_CAP,
  INDEX_STALE_CONTRACT_MS,
  MAX_OPEN_OFFERS,
  SCALE,
  STORAGE_DEPOSIT_YOCTO,
  U128_MAX,
  YOCTO_PER_NEAR,
} from "../constants";
import { maxBig, minBig, mulDiv } from "../math";
import { askSyForPt, askSyForYt, tauYears, ytAccruedSy } from "../pricing";
import type { Balances, Deployment, MainnetReference, Offer, Position, Series } from "../types";
import { ContractPanic, panic } from "./errors";
import {
  emptyFt,
  emptyLedger,
  type CallOutcome,
  type CallRequest,
  type FtState,
  type WorldState,
  type YtLedger,
} from "./state";

export interface FakeChainOptions {
  startMs?: number;
  maturityInMs?: number;
  yearSecs?: number;
  aprBps?: number;
  p0?: bigint;
  minStrip?: bigint;
  realtime?: boolean;
  keeper?: boolean;
  seed?: boolean;
  accounts?: string[];
}

export const FAKE_ROOT = "rhea.testnet";
export const FAKE_MAKER = "maker.testnet";
export const FAKE_KEEPER = "keeper.testnet";
const FAKE_NEAR_START = 100n * YOCTO_PER_NEAR;

export const fakeDeployment: Deployment = {
  network: "testnet",
  deployed: false,
  rootAccount: FAKE_ROOT,
  underlying: `mstnear.${FAKE_ROOT}`,
  pt: `pt.${FAKE_ROOT}`,
  vault: `strip.${FAKE_ROOT}`,
  maker: FAKE_MAKER,
  maturityMs: 0,
  yearSecs: DEFAULT_YEAR_SECS,
  aprBps: DEFAULT_APR_BPS,
  rpcUrls: [],
  explorerUrl: "https://testnet.nearblocks.io",
  mainnetStNear: "meta-pool.near",
  deployedAt: "fake",
};

export const fakeMainnetReference: MainnetReference = {
  price: DEFAULT_P0,
  apy: 0.041,
  sampledAt: "2026-11-09T00:00:00.000Z",
};

function parseU128(value: unknown, field: string): bigint {
  if (typeof value !== "string" || !/^\d+$/.test(value)) panic("E_BAD_MSG", `${field} must be a U128 string`);
  const parsed = BigInt(value);
  if (parsed > U128_MAX) panic("E_BAD_MSG", `${field} exceeds U128`);
  return parsed;
}

function parseString(value: unknown, field: string): string {
  if (typeof value !== "string" || value === "") panic("E_BAD_MSG", `${field} must be a string`);
  return value;
}

function parseId(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  const parsed = parseU128(value, field);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) panic("E_BAD_MSG", `${field} too large`);
  return Number(parsed);
}

function requireOneYocto(deposit: bigint): void {
  if (deposit !== 1n) panic("E_DEPOSIT", "Requires attached deposit of exactly 1 yoctoNEAR");
}

function eventLog(event: string, data: Record<string, string>[]): string {
  return `EVENT_JSON:${JSON.stringify({ standard: "rhea_strip", version: "1.0.0", event, data })}`;
}

export class FakeChain {
  readonly deployment: Deployment;
  private state: WorldState;
  private baseMs: number;
  private offsetMs = 0;
  private readonly startedReal: number;
  private readonly realtime: boolean;
  private keeper: boolean;
  private txCounter = 0;
  private callLogs: string[] = [];
  private refundNote: { reason: string; amount: bigint } | null = null;

  constructor(options: FakeChainOptions = {}) {
    this.baseMs = options.startMs ?? Date.now();
    this.realtime = options.realtime ?? false;
    this.keeper = options.keeper ?? false;
    this.startedReal = Date.now();
    const yearSecs = options.yearSecs ?? DEFAULT_YEAR_SECS;
    const aprBps = options.aprBps ?? DEFAULT_APR_BPS;
    const p0 = options.p0 ?? DEFAULT_P0;
    const maturityMs = this.baseMs + (options.maturityInMs ?? 10 * 60_000);
    this.deployment = { ...fakeDeployment, maturityMs, yearSecs, aprBps, deployedAt: new Date(this.baseMs).toISOString() };
    const near = new Map<string, bigint>();
    const accounts = options.accounts ?? ["alice.testnet", "bob.testnet", FAKE_MAKER, FAKE_KEEPER];
    for (const account of accounts) near.set(account, FAKE_NEAR_START);
    near.set(FAKE_ROOT, FAKE_NEAR_START);
    this.state = {
      near,
      mst: {
        ft: emptyFt(),
        owner: FAKE_ROOT,
        p0,
        aprBps,
        yearSecs,
        startedMs: this.baseMs,
        faucetMinted: new Map(),
      },
      pt: { ft: emptyFt(), minter: this.deployment.vault },
      vault: {
        owner: FAKE_ROOT,
        maturityMs,
        yearSecs,
        minStrip: options.minStrip ?? DEFAULT_MIN_STRIP,
        ytRegistered: new Set(),
        ledgers: new Map(),
        offers: new Map(),
        nextOfferId: 1,
        index: p0,
        indexTsMs: this.baseMs,
        maturityIndex: null,
        totalSy: 0n,
        ytSupply: 0n,
      },
    };
    this.state.mst.ft.registered.add(this.deployment.vault);
    this.state.pt.ft.registered.add(this.deployment.vault);
    if (options.seed ?? false) this.seedMarket();
  }

  nowMs(): number {
    const real = this.realtime ? Date.now() - this.startedReal : 0;
    return this.baseMs + this.offsetMs + real;
  }

  advance(ms: number): void {
    if (ms < 0) throw new Error("cannot move the clock backwards");
    const target = this.nowMs() + ms;
    const maturity = this.state.vault.maturityMs;
    if (this.keeper && this.nowMs() < maturity && target >= maturity) {
      this.offsetMs += maturity - this.nowMs();
      this.keeperSync();
    }
    this.offsetMs += target - this.nowMs();
    if (this.keeper) this.keeperSync();
  }

  advanceToMaturity(extraMs = 0): void {
    const remaining = this.state.vault.maturityMs - this.nowMs();
    this.advance(Math.max(0, remaining) + extraMs);
  }

  setKeeper(enabled: boolean): void {
    this.keeper = enabled;
  }

  private keeperSync(): void {
    const vault = this.deployment.vault;
    this.call({ predecessor: FAKE_KEEPER, receiver: vault, method: "sync_index", args: {} });
  }

  private mockPrice(): bigint {
    const mst = this.state.mst;
    const elapsed = BigInt(Math.max(0, this.nowMs() - mst.startedMs));
    return mst.p0 + mulDiv(mst.p0, BigInt(mst.aprBps) * elapsed, 10_000n * BigInt(mst.yearSecs) * 1000n);
  }

  stNearPrice(): bigint {
    return this.mockPrice();
  }

  private near(account: string): bigint {
    return this.state.near.get(account) ?? 0n;
  }

  private ensureNear(account: string): void {
    if (!this.state.near.has(account)) this.state.near.set(account, FAKE_NEAR_START);
  }

  private tokenFt(token: string): FtState {
    if (token === this.deployment.underlying) return this.state.mst.ft;
    if (token === this.deployment.pt) return this.state.pt.ft;
    return panic("E_WRONG_TOKEN", token);
  }

  isRegistered(token: string, account: string): boolean {
    if (token === this.deployment.vault) return this.state.vault.ytRegistered.has(account);
    return this.tokenFt(token).registered.has(account);
  }

  private ftBalance(ft: FtState, account: string): bigint {
    return ft.balances.get(account) ?? 0n;
  }

  private ftCredit(ft: FtState, account: string, amount: bigint): void {
    ft.balances.set(account, this.ftBalance(ft, account) + amount);
  }

  private ftDebit(ft: FtState, account: string, amount: bigint): void {
    const balance = this.ftBalance(ft, account);
    if (balance < amount) panic("E_BALANCE", `${account} has ${balance}, needs ${amount}`);
    ft.balances.set(account, balance - amount);
  }

  private ftTransfer(ft: FtState, from: string, to: string, amount: bigint): void {
    if (amount <= 0n) panic("E_MIN_AMOUNT", "amount must be positive");
    if (!ft.registered.has(to)) panic("E_NOT_REGISTERED", `The account ${to} is not registered`);
    this.ftDebit(ft, from, amount);
    this.ftCredit(ft, to, amount);
  }

  private ftMint(ft: FtState, to: string, amount: bigint): void {
    ft.registered.add(to);
    this.ftCredit(ft, to, amount);
    ft.supply += amount;
  }

  private ftBurn(ft: FtState, from: string, amount: bigint): void {
    this.ftDebit(ft, from, amount);
    ft.supply -= amount;
  }

  private storageDeposit(
    registry: Set<string>,
    predecessor: string,
    deposit: bigint,
    args: Record<string, unknown>,
  ): unknown {
    const account = args.account_id === undefined ? predecessor : parseString(args.account_id, "account_id");
    if (registry.has(account)) return { total: STORAGE_DEPOSIT_YOCTO.toString(), available: "0" };
    if (deposit < STORAGE_DEPOSIT_YOCTO) panic("E_STORAGE", "deposit below the storage minimum");
    this.ensureNear(predecessor);
    if (this.near(predecessor) < STORAGE_DEPOSIT_YOCTO) panic("E_NEAR_BALANCE", "not enough NEAR");
    this.state.near.set(predecessor, this.near(predecessor) - STORAGE_DEPOSIT_YOCTO);
    registry.add(account);
    return { total: STORAGE_DEPOSIT_YOCTO.toString(), available: "0" };
  }

  private index(): bigint {
    const v = this.state.vault;
    return v.maturityIndex === null ? v.index : minBig(v.index, v.maturityIndex);
  }

  private liveIndex(): bigint {
    const v = this.state.vault;
    if (v.maturityIndex !== null) return v.maturityIndex;
    return maxBig(v.index, this.mockPrice());
  }

  private refreshIndex(): bigint {
    const v = this.state.vault;
    const price = this.mockPrice();
    if (price === 0n) panic("E_PRICE_ZERO");
    v.index = maxBig(v.index, price);
    v.indexTsMs = this.nowMs();
    return v.index;
  }

  private status(): "Active" | "Matured" | "Settled" {
    const v = this.state.vault;
    if (v.maturityIndex !== null) return "Settled";
    return this.nowMs() >= v.maturityMs ? "Matured" : "Active";
  }

  private requireActive(): void {
    if (this.status() !== "Active") panic("E_NOT_ACTIVE");
  }

  private ledger(account: string): YtLedger {
    let ledger = this.state.vault.ledgers.get(account);
    if (ledger === undefined) {
      ledger = emptyLedger();
      this.state.vault.ledgers.set(account, ledger);
    }
    return ledger;
  }

  private settleLedger(account: string): YtLedger {
    const ledger = this.ledger(account);
    const current = this.index();
    if (ledger.userIndex === 0n) {
      ledger.userIndex = current;
      return ledger;
    }
    if (current > ledger.userIndex) {
      ledger.accruedSy += ytAccruedSy(ledger.ytBalance, ledger.userIndex, current);
      ledger.userIndex = current;
    }
    return ledger;
  }

  private creditYt(account: string, amount: bigint): void {
    const ledger = this.settleLedger(account);
    ledger.ytBalance += amount;
    this.state.vault.ytSupply += amount;
    this.state.vault.ytRegistered.add(account);
  }

  private moveLockedYt(from: string, to: string, amount: bigint): void {
    const seller = this.settleLedger(from);
    const buyer = this.settleLedger(to);
    seller.ytBalance -= amount;
    seller.ytLocked -= amount;
    buyer.ytBalance += amount;
    this.state.vault.ytRegistered.add(to);
  }

  private openOffersOf(account: string): number {
    let count = 0;
    for (const offer of this.state.vault.offers.values()) if (offer.seller === account) count += 1;
    return count;
  }

  private refund(code: string, amount: bigint): bigint {
    this.refundNote = { reason: code, amount };
    this.callLogs.push(`refund ${code}: ${amount}`);
    return amount;
  }

  private vaultOnTransfer(token: string, sender: string, amount: bigint, msg: string): bigint {
    let parsed: unknown;
    try {
      parsed = JSON.parse(msg);
    } catch {
      return panic("E_BAD_MSG");
    }
    if (typeof parsed !== "object" || parsed === null) return panic("E_BAD_MSG");
    const payload = parsed as Record<string, unknown>;
    const action = payload.action;
    const isUnderlying = token === this.deployment.underlying;
    const isPt = token === this.deployment.pt;
    if (!isUnderlying && !isPt) return panic("E_WRONG_TOKEN");
    if (typeof action !== "string") return panic("E_BAD_MSG");
    if (action === "strip" && isUnderlying) return this.onStrip(sender, amount);
    if (action === "buy" && isUnderlying) return this.onBuy(sender, amount, payload);
    if (action === "redeem" && isPt) return this.onRedeem(sender, amount);
    if (action === "list_pt" && isPt) return this.onListPt(sender, amount, payload);
    return panic("E_WRONG_TOKEN");
  }

  private onStrip(sender: string, amount: bigint): bigint {
    this.requireActive();
    const v = this.state.vault;
    if (amount < v.minStrip) panic("E_MIN_AMOUNT");
    const index = this.refreshIndex();
    const py = mulDiv(amount, index, SCALE);
    if (py === 0n) panic("E_MIN_AMOUNT");
    this.creditYt(sender, py);
    v.totalSy += amount;
    this.ftMint(this.state.pt.ft, sender, py);
    this.callLogs.push(
      eventLog("strip", [{ account_id: sender, sy_in: amount.toString(), py: py.toString(), index: index.toString() }]),
    );
    return 0n;
  }

  private onBuy(buyer: string, amount: bigint, payload: Record<string, unknown>): bigint {
    this.requireActive();
    const v = this.state.vault;
    const offerId = parseId(payload.offer_id, "offer_id");
    const offer = v.offers.get(offerId);
    if (offer === undefined) panic("E_OFFER_GONE");
    if (amount < offer.askSy) panic("E_PRICE_MISMATCH");
    const index = this.refreshIndex();
    if (offer.kind === "Yt") {
      this.moveLockedYt(offer.seller, buyer, offer.amount);
    } else {
      this.ftTransfer(this.state.pt.ft, this.deployment.vault, buyer, offer.amount);
    }
    this.ledger(offer.seller).syCredit += offer.askSy;
    v.offers.delete(offerId);
    this.callLogs.push(
      eventLog("fill", [
        {
          offer_id: String(offerId),
          seller: offer.seller,
          buyer,
          kind: offer.kind,
          amount: offer.amount.toString(),
          ask_sy: offer.askSy.toString(),
          index: index.toString(),
        },
      ]),
    );
    return amount - offer.askSy;
  }

  private onRedeem(sender: string, amount: bigint): bigint {
    const v = this.state.vault;
    if (v.maturityIndex === null) panic("E_NOT_SETTLED");
    const syOut = mulDiv(amount, SCALE, v.maturityIndex);
    if (syOut === 0n) panic("E_MIN_AMOUNT");
    v.totalSy -= syOut;
    this.ftTransfer(this.state.mst.ft, this.deployment.vault, sender, syOut);
    this.ftBurn(this.state.pt.ft, this.deployment.vault, amount);
    this.callLogs.push(
      eventLog("redeem", [{ account_id: sender, pt: amount.toString(), sy_out: syOut.toString() }]),
    );
    return 0n;
  }

  private onListPt(seller: string, amount: bigint, payload: Record<string, unknown>): bigint {
    this.requireActive();
    const askSy = parseU128(payload.ask_sy, "ask_sy");
    if (askSy === 0n) panic("E_PRICE_ZERO");
    if (this.openOffersOf(seller) >= MAX_OPEN_OFFERS) panic("E_TOO_MANY_OFFERS");
    const id = this.createOffer(seller, "Pt", amount, askSy);
    this.callLogs.push(
      eventLog("list", [
        { offer_id: String(id), seller, kind: "Pt", amount: amount.toString(), ask_sy: askSy.toString() },
      ]),
    );
    return 0n;
  }

  private createOffer(seller: string, kind: "Pt" | "Yt", amount: bigint, askSy: bigint): number {
    const v = this.state.vault;
    const id = v.nextOfferId;
    v.nextOfferId += 1;
    v.offers.set(id, { id, seller, kind, amount, askSy, createdMs: this.nowMs() });
    return id;
  }

  private ftTransferCall(
    ft: FtState,
    tokenId: string,
    predecessor: string,
    args: Record<string, unknown>,
  ): bigint {
    const receiver = parseString(args.receiver_id, "receiver_id");
    const amount = parseU128(args.amount, "amount");
    const msg = typeof args.msg === "string" ? args.msg : "";
    if (receiver !== this.deployment.vault) panic("E_UNSUPPORTED", "only the vault accepts ft_transfer_call");
    this.ftTransfer(ft, predecessor, receiver, amount);
    const snapshot = structuredClone(this.state);
    let unused: bigint;
    try {
      unused = this.vaultOnTransfer(tokenId, predecessor, amount, msg);
    } catch (error) {
      this.state = snapshot;
      if (!(error instanceof ContractPanic)) throw error;
      unused = this.refund(error.code, amount);
    }
    const refundable = minBig(unused, this.ftBalance(this.tokenFt(tokenId), receiver));
    if (refundable > 0n) {
      const target = this.tokenFt(tokenId);
      this.ftDebit(target, receiver, refundable);
      this.ftCredit(target, predecessor, refundable);
    }
    return amount - refundable;
  }

  private takeRefundNote(): { reason: string; amount: bigint } | null {
    const note = this.refundNote;
    this.refundNote = null;
    return note;
  }

  private nextHash(): string {
    this.txCounter += 1;
    return `fake-tx-${String(this.txCounter).padStart(5, "0")}`;
  }

  call(request: CallRequest): CallOutcome {
    const hash = this.nextHash();
    const snapshot = structuredClone(this.state);
    this.callLogs = [];
    this.refundNote = null;
    const deposit = request.deposit ?? 0n;
    this.ensureNear(request.predecessor);
    try {
      const returnValue = this.dispatch(request, deposit);
      const outcome: CallOutcome = {
        hash,
        receiver: request.receiver,
        method: request.method,
        ok: true,
        returnValue,
        logs: this.callLogs,
      };
      const note = this.takeRefundNote();
      if (note !== null) {
        outcome.refunded = note.amount;
        outcome.refundReason = note.reason;
      }
      return outcome;
    } catch (error) {
      this.state = snapshot;
      if (error instanceof ContractPanic) {
        return {
          hash,
          receiver: request.receiver,
          method: request.method,
          ok: false,
          returnValue: null,
          logs: this.callLogs,
          error: error.message,
        };
      }
      throw error;
    }
  }

  private dispatch(request: CallRequest, deposit: bigint): unknown {
    const { receiver, method, args, predecessor } = request;
    const d = this.deployment;
    if (receiver === d.underlying) return this.callUnderlying(predecessor, method, args, deposit);
    if (receiver === d.pt) return this.callPt(predecessor, method, args, deposit);
    if (receiver === d.vault) return this.callVault(predecessor, method, args, deposit);
    return panic("E_WRONG_TOKEN", `unknown contract ${receiver}`);
  }

  private callUnderlying(predecessor: string, method: string, args: Record<string, unknown>, deposit: bigint): unknown {
    const mst = this.state.mst;
    switch (method) {
      case "faucet": {
        const minted = mst.faucetMinted.get(predecessor) ?? 0n;
        if (minted + FAUCET_AMOUNT > FAUCET_CAP) panic("E_FAUCET_CAP", "faucet cap reached");
        mst.faucetMinted.set(predecessor, minted + FAUCET_AMOUNT);
        this.ftMint(mst.ft, predecessor, FAUCET_AMOUNT);
        return null;
      }
      case "set_apr_bps": {
        if (predecessor !== mst.owner) panic("E_NOT_OWNER");
        const apr = args.apr_bps;
        if (typeof apr !== "number" || !Number.isInteger(apr) || apr < 0) panic("E_BAD_MSG", "apr_bps");
        mst.p0 = this.mockPrice();
        mst.startedMs = this.nowMs();
        mst.aprBps = apr;
        return null;
      }
      case "storage_deposit":
        return this.storageDeposit(mst.ft.registered, predecessor, deposit, args);
      case "ft_transfer": {
        requireOneYocto(deposit);
        this.ftTransfer(mst.ft, predecessor, parseString(args.receiver_id, "receiver_id"), parseU128(args.amount, "amount"));
        return null;
      }
      case "ft_transfer_call": {
        requireOneYocto(deposit);
        return (this.ftTransferCall(mst.ft, this.deployment.underlying, predecessor, args)).toString();
      }
      default:
        return panic("E_BAD_MSG", `unknown method ${method}`);
    }
  }

  private callPt(predecessor: string, method: string, args: Record<string, unknown>, deposit: bigint): unknown {
    const pt = this.state.pt;
    switch (method) {
      case "mint": {
        if (predecessor !== pt.minter) panic("E_NOT_OWNER");
        this.ftMint(pt.ft, parseString(args.account_id, "account_id"), parseU128(args.amount, "amount"));
        return null;
      }
      case "burn": {
        if (predecessor !== pt.minter) panic("E_NOT_OWNER");
        this.ftBurn(pt.ft, predecessor, parseU128(args.amount, "amount"));
        return null;
      }
      case "storage_deposit":
        return this.storageDeposit(pt.ft.registered, predecessor, deposit, args);
      case "ft_transfer": {
        requireOneYocto(deposit);
        this.ftTransfer(pt.ft, predecessor, parseString(args.receiver_id, "receiver_id"), parseU128(args.amount, "amount"));
        return null;
      }
      case "ft_transfer_call": {
        requireOneYocto(deposit);
        return this.ftTransferCall(pt.ft, this.deployment.pt, predecessor, args).toString();
      }
      default:
        return panic("E_BAD_MSG", `unknown method ${method}`);
    }
  }

  private callVault(predecessor: string, method: string, args: Record<string, unknown>, deposit: bigint): unknown {
    const v = this.state.vault;
    switch (method) {
      case "sync_index": {
        const index = this.refreshIndex();
        this.callLogs.push(eventLog("index_sync", [{ index: index.toString() }]));
        return null;
      }
      case "settle": {
        if (v.maturityIndex !== null) return null;
        if (this.nowMs() < v.maturityMs) panic("E_NOT_MATURED");
        const index = this.refreshIndex();
        v.maturityIndex = index;
        this.callLogs.push(eventLog("settle", [{ maturity_index: index.toString() }]));
        return null;
      }
      case "list_yt": {
        requireOneYocto(deposit);
        this.requireActive();
        const amount = parseU128(args.amount, "amount");
        const askSy = parseU128(args.ask_sy, "ask_sy");
        if (askSy === 0n) panic("E_PRICE_ZERO");
        if (amount === 0n) panic("E_MIN_AMOUNT");
        const ledger = this.ledger(predecessor);
        if (amount > ledger.ytBalance - ledger.ytLocked) panic("E_INSUFFICIENT_YT");
        if (this.openOffersOf(predecessor) >= MAX_OPEN_OFFERS) panic("E_TOO_MANY_OFFERS");
        ledger.ytLocked += amount;
        const id = this.createOffer(predecessor, "Yt", amount, askSy);
        this.callLogs.push(
          eventLog("list", [
            { offer_id: String(id), seller: predecessor, kind: "Yt", amount: amount.toString(), ask_sy: askSy.toString() },
          ]),
        );
        return String(id);
      }
      case "cancel_offer": {
        requireOneYocto(deposit);
        const id = parseId(args.offer_id, "offer_id");
        const offer = v.offers.get(id);
        if (offer === undefined) panic("E_OFFER_GONE");
        if (offer.seller !== predecessor) panic("E_NOT_OWNER");
        if (offer.kind === "Yt") {
          this.ledger(predecessor).ytLocked -= offer.amount;
        } else {
          this.ftTransfer(this.state.pt.ft, this.deployment.vault, predecessor, offer.amount);
        }
        v.offers.delete(id);
        this.callLogs.push(eventLog("cancel", [{ offer_id: String(id), seller: predecessor }]));
        return null;
      }
      case "claim_yield": {
        requireOneYocto(deposit);
        if (v.maturityIndex === null) panic("E_NOT_SETTLED");
        const ledger = this.settleLedger(predecessor);
        const payout = ledger.accruedSy;
        const burnable = ledger.ytBalance - ledger.ytLocked;
        ledger.accruedSy = 0n;
        ledger.ytBalance -= burnable;
        v.ytSupply -= burnable;
        if (payout > 0n) {
          v.totalSy -= payout;
          this.ftTransfer(this.state.mst.ft, this.deployment.vault, predecessor, payout);
        }
        this.callLogs.push(eventLog("claim", [{ account_id: predecessor, sy_out: payout.toString() }]));
        return payout.toString();
      }
      case "withdraw_sy": {
        requireOneYocto(deposit);
        const ledger = this.ledger(predecessor);
        const credit = ledger.syCredit;
        if (credit === 0n) panic("E_MIN_AMOUNT", "nothing to withdraw");
        ledger.syCredit = 0n;
        this.ftTransfer(this.state.mst.ft, this.deployment.vault, predecessor, credit);
        this.callLogs.push(eventLog("withdraw", [{ account_id: predecessor, sy_out: credit.toString() }]));
        return credit.toString();
      }
      case "storage_deposit":
        return this.storageDeposit(v.ytRegistered, predecessor, deposit, args);
      case "ft_transfer": {
        requireOneYocto(deposit);
        const to = parseString(args.receiver_id, "receiver_id");
        const amount = parseU128(args.amount, "amount");
        if (this.status() === "Active" && this.nowMs() - v.indexTsMs > INDEX_STALE_CONTRACT_MS) panic("E_STALE_INDEX");
        if (!v.ytRegistered.has(to)) panic("E_NOT_REGISTERED", `The account ${to} is not registered`);
        if (amount <= 0n) panic("E_MIN_AMOUNT");
        const from = this.ledger(predecessor);
        if (amount > from.ytBalance - from.ytLocked) panic("E_INSUFFICIENT_YT");
        this.settleLedger(predecessor);
        this.settleLedger(to);
        from.ytBalance -= amount;
        this.ledger(to).ytBalance += amount;
        return null;
      }
      default:
        return panic("E_BAD_MSG", `unknown method ${method}`);
    }
  }

  getSeries(): Series {
    const v = this.state.vault;
    const d = this.deployment;
    return {
      underlying: d.underlying,
      pt: d.pt,
      yt: d.vault,
      maturityMs: v.maturityMs,
      yearSecs: v.yearSecs,
      minStrip: v.minStrip,
      status: this.status(),
      index: v.index,
      liveIndex: this.liveIndex(),
      indexTsMs: v.indexTsMs,
      maturityIndex: v.maturityIndex,
      totalSy: v.totalSy,
      ptSupply: this.state.pt.ft.supply,
      ytSupply: v.ytSupply,
      openOffers: v.offers.size,
    };
  }

  getPosition(account: string): Position {
    const v = this.state.vault;
    const ledger = this.state.vault.ledgers.get(account) ?? emptyLedger();
    const live = this.liveIndex();
    const target = v.maturityIndex === null ? live : minBig(live, v.maturityIndex);
    const pending = ledger.userIndex === 0n ? 0n : ytAccruedSy(ledger.ytBalance, ledger.userIndex, target);
    return {
      ytBalance: ledger.ytBalance,
      ytLocked: ledger.ytLocked,
      ytAccruedSy: ledger.accruedSy,
      ytPendingSy: pending,
      syCredit: ledger.syCredit,
    };
  }

  getBalances(account: string): Balances {
    const ledger = this.state.vault.ledgers.get(account);
    return {
      nearYocto: this.near(account),
      sy: this.ftBalance(this.state.mst.ft, account),
      pt: this.ftBalance(this.state.pt.ft, account),
      yt: ledger === undefined ? 0n : ledger.ytBalance,
    };
  }

  getOffers(kind?: "Pt" | "Yt"): Offer[] {
    return [...this.state.vault.offers.values()]
      .filter((offer) => kind === undefined || offer.kind === kind)
      .sort((a, b) => a.id - b.id)
      .map((offer) => ({ ...offer }));
  }

  getOffer(id: number): Offer | null {
    const offer = this.state.vault.offers.get(id);
    return offer === undefined ? null : { ...offer };
  }

  vaultSyBalance(): bigint {
    return this.ftBalance(this.state.mst.ft, this.deployment.vault);
  }

  vaultOwedSy(): bigint {
    const v = this.state.vault;
    let accrued = 0n;
    let credits = 0n;
    for (const [account, ledger] of v.ledgers) {
      void account;
      accrued += ledger.accruedSy;
      credits += ledger.syCredit;
      if (ledger.userIndex !== 0n) accrued += ytAccruedSy(ledger.ytBalance, ledger.userIndex, this.index());
    }
    const ptSupply = this.state.pt.ft.supply;
    const principal = v.maturityIndex === null ? mulDiv(ptSupply, SCALE, v.index) : mulDiv(ptSupply, SCALE, v.maturityIndex);
    return principal + accrued + credits;
  }

  accountIds(): string[] {
    return [...this.state.near.keys()];
  }

  private seedMarket(): void {
    const maker = FAKE_MAKER;
    const d = this.deployment;
    for (let i = 0; i < 5; i += 1) this.mustCall({ predecessor: maker, receiver: d.underlying, method: "faucet", args: {} });
    this.mustCall({
      predecessor: maker,
      receiver: d.underlying,
      method: "ft_transfer_call",
      args: { receiver_id: d.vault, amount: (400n * SCALE).toString(), msg: JSON.stringify({ action: "strip" }) },
      deposit: 1n,
    });
    const series = this.getSeries();
    const tau = tauYears(series.maturityMs, this.nowMs(), series.yearSecs);
    const list = (kind: "Yt" | "Pt", amountUnits: bigint, r: number): void => {
      const amount = amountUnits * SCALE;
      const ask = kind === "Yt" ? askSyForYt(amount, r, tau, series.index) : askSyForPt(amount, r, tau, series.index);
      if (kind === "Yt") {
        this.mustCall({
          predecessor: maker,
          receiver: d.vault,
          method: "list_yt",
          args: { amount: amount.toString(), ask_sy: ask.toString() },
          deposit: 1n,
        });
      } else {
        this.mustCall({
          predecessor: maker,
          receiver: d.pt,
          method: "ft_transfer_call",
          args: {
            receiver_id: d.vault,
            amount: amount.toString(),
            msg: JSON.stringify({ action: "list_pt", ask_sy: ask.toString() }),
          },
          deposit: 1n,
        });
      }
    };
    list("Yt", 200n, 0.09);
    list("Yt", 100n, 0.07);
    list("Pt", 150n, 0.075);
  }

  private mustCall(request: CallRequest): CallOutcome {
    const outcome = this.call(request);
    if (!outcome.ok) throw new Error(`seed call failed: ${outcome.error ?? "unknown"}`);
    return outcome;
  }
}
