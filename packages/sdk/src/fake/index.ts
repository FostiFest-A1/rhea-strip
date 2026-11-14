import { composeClient } from "../client";
import { TxPlanner, type PlannerReads } from "../planner";
import type {
  Account,
  Balances,
  Deployment,
  MainnetReference,
  Mode,
  Offer,
  Position,
  RheaClient,
  RheaReader,
  Series,
} from "../types";
import { FakeChain, fakeMainnetReference, type FakeChainOptions } from "./chain";
import { FakeWallet } from "./wallet";

export { FakeChain, FAKE_KEEPER, FAKE_MAKER, FAKE_ROOT, fakeDeployment, fakeMainnetReference } from "./chain";
export type { FakeChainOptions } from "./chain";
export { FakeWallet } from "./wallet";
export type { FakeSendResult, FakeStepResult } from "./wallet";
export { ContractPanic } from "./errors";
export type { CallOutcome, CallRequest } from "./state";

export interface FakeClient extends RheaClient {
  readonly chain: FakeChain;
  readonly wallet: FakeWallet;
}

export const FAKE_ACCOUNTS = ["alice.testnet", "bob.testnet", "maker.testnet"] as const;

class FakeReader implements RheaReader, PlannerReads {
  readonly mode: Mode = "fake";

  constructor(private readonly chain: FakeChain) {}

  deployment(): Deployment {
    return this.chain.deployment;
  }

  nowMs(): number {
    return this.chain.nowMs();
  }

  async series(): Promise<Series> {
    return this.chain.getSeries();
  }

  async position(account: Account): Promise<Position> {
    return this.chain.getPosition(account);
  }

  async balances(account: Account): Promise<Balances> {
    return this.chain.getBalances(account);
  }

  async offers(filter?: { kind?: "Pt" | "Yt" }): Promise<Offer[]> {
    return this.chain.getOffers(filter?.kind);
  }

  async mainnetReference(): Promise<MainnetReference> {
    return fakeMainnetReference;
  }

  async isRegistered(token: Account, account: Account): Promise<boolean> {
    return this.chain.isRegistered(token, account);
  }

  async offerById(id: number): Promise<Offer | null> {
    return this.chain.getOffer(id);
  }
}

export function createFakeClient(options: FakeChainOptions = {}): FakeClient {
  const chain = new FakeChain({ realtime: true, seed: true, ...options });
  const reader = new FakeReader(chain);
  const planner = new TxPlanner(reader);
  const base = composeClient(reader, planner);
  return Object.assign(base, { chain, wallet: new FakeWallet(chain) });
}

export function asFakeClient(client: RheaClient): FakeClient | null {
  const candidate = client as Partial<FakeClient>;
  return candidate.chain instanceof FakeChain && candidate.wallet instanceof FakeWallet
    ? (client as FakeClient)
    : null;
}
