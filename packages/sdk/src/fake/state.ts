import type { Offer } from "../types";

export interface FtState {
  balances: Map<string, bigint>;
  registered: Set<string>;
  supply: bigint;
}

export interface MockStnearState {
  ft: FtState;
  owner: string;
  p0: bigint;
  aprBps: number;
  yearSecs: number;
  startedMs: number;
  faucetMinted: Map<string, bigint>;
}

export interface PtState {
  ft: FtState;
  minter: string;
}

export interface YtLedger {
  ytBalance: bigint;
  ytLocked: bigint;
  userIndex: bigint;
  accruedSy: bigint;
  syCredit: bigint;
}

export interface VaultState {
  owner: string;
  maturityMs: number;
  yearSecs: number;
  minStrip: bigint;
  ytRegistered: Set<string>;
  ledgers: Map<string, YtLedger>;
  offers: Map<number, Offer>;
  nextOfferId: number;
  index: bigint;
  indexTsMs: number;
  maturityIndex: bigint | null;
  totalSy: bigint;
  ytSupply: bigint;
}

export interface WorldState {
  near: Map<string, bigint>;
  mst: MockStnearState;
  pt: PtState;
  vault: VaultState;
}

export interface CallRequest {
  predecessor: string;
  receiver: string;
  method: string;
  args: Record<string, unknown>;
  deposit?: bigint;
  gas?: bigint;
}

export interface CallOutcome {
  hash: string;
  receiver: string;
  method: string;
  ok: boolean;
  returnValue: unknown;
  logs: string[];
  error?: string;
  refunded?: bigint;
  refundReason?: string;
}

export function emptyFt(): FtState {
  return { balances: new Map(), registered: new Set(), supply: 0n };
}

export function emptyLedger(): YtLedger {
  return { ytBalance: 0n, ytLocked: 0n, userIndex: 0n, accruedSy: 0n, syCredit: 0n };
}
