export type Account = string;
export type Mode = "fake" | "testnet";

export interface Series {
  underlying: Account;
  pt: Account;
  yt: Account;
  maturityMs: number;
  yearSecs: number;
  minStrip: bigint;
  status: "Active" | "Matured" | "Settled";
  index: bigint;
  liveIndex: bigint;
  indexTsMs: number;
  maturityIndex: bigint | null;
  totalSy: bigint;
  ptSupply: bigint;
  ytSupply: bigint;
  openOffers: number;
}

export interface Position {
  ytBalance: bigint;
  ytLocked: bigint;
  ytAccruedSy: bigint;
  ytPendingSy: bigint;
  syCredit: bigint;
}

export interface Balances {
  nearYocto: bigint;
  sy: bigint;
  pt: bigint;
  yt: bigint;
}

export interface Offer {
  id: number;
  seller: Account;
  kind: "Pt" | "Yt";
  amount: bigint;
  askSy: bigint;
  createdMs: number;
}

export interface MainnetReference {
  price: bigint;
  apy: number;
  sampledAt: string;
}

export interface Deployment {
  network: "testnet";
  deployed: boolean;
  rootAccount: string;
  underlying: Account;
  pt: Account;
  vault: Account;
  maker: Account;
  maturityMs: number;
  yearSecs: number;
  aprBps: number;
  rpcUrls: string[];
  explorerUrl: string;
  mainnetStNear: Account;
  deployedAt: string;
}

export interface FnCallAction {
  type: "FunctionCall";
  params: {
    methodName: string;
    args: Record<string, unknown>;
    gas: string;
    deposit: string;
  };
}

export interface TxRequest {
  receiverId: Account;
  actions: FnCallAction[];
}

export interface TxStep {
  id: string;
  label: string;
  transactions: TxRequest[];
  waitFor: "final";
}

export type TxPlan = TxStep[];

export interface RheaReader {
  readonly mode: Mode;
  deployment(): Deployment;
  nowMs(): number;
  series(): Promise<Series>;
  position(account: Account): Promise<Position>;
  balances(account: Account): Promise<Balances>;
  offers(filter?: { kind?: "Pt" | "Yt" }): Promise<Offer[]>;
  mainnetReference(): Promise<MainnetReference>;
}

export interface RheaPlanner {
  faucet(account: Account): Promise<TxPlan>;
  strip(account: Account, amountSy: bigint): Promise<TxPlan>;
  listYt(account: Account, amountYt: bigint, askSy: bigint): Promise<TxPlan>;
  listPt(account: Account, amountPt: bigint, askSy: bigint): Promise<TxPlan>;
  buy(account: Account, offerId: number): Promise<TxPlan>;
  cancel(account: Account, offerId: number): Promise<TxPlan>;
  settle(account: Account): Promise<TxPlan>;
  redeem(account: Account, amountPt: bigint): Promise<TxPlan>;
  claim(account: Account): Promise<TxPlan>;
  withdraw(account: Account): Promise<TxPlan>;
}

export interface RheaClient extends RheaReader, RheaPlanner {}
