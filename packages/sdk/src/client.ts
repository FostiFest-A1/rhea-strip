import type {
  Account,
  Balances,
  Deployment,
  MainnetReference,
  Mode,
  Offer,
  Position,
  RheaClient,
  RheaPlanner,
  RheaReader,
  Series,
  TxPlan,
} from "./types";

export function composeClient(reader: RheaReader, planner: RheaPlanner): RheaClient {
  return {
    get mode(): Mode {
      return reader.mode;
    },
    deployment: (): Deployment => reader.deployment(),
    nowMs: (): number => reader.nowMs(),
    series: (): Promise<Series> => reader.series(),
    position: (account: Account): Promise<Position> => reader.position(account),
    balances: (account: Account): Promise<Balances> => reader.balances(account),
    offers: (filter?: { kind?: "Pt" | "Yt" }): Promise<Offer[]> => reader.offers(filter),
    mainnetReference: (): Promise<MainnetReference> => reader.mainnetReference(),
    faucet: (account: Account): Promise<TxPlan> => planner.faucet(account),
    strip: (account: Account, amountSy: bigint): Promise<TxPlan> => planner.strip(account, amountSy),
    listYt: (account: Account, amountYt: bigint, askSy: bigint): Promise<TxPlan> =>
      planner.listYt(account, amountYt, askSy),
    listPt: (account: Account, amountPt: bigint, askSy: bigint): Promise<TxPlan> =>
      planner.listPt(account, amountPt, askSy),
    buy: (account: Account, offerId: number): Promise<TxPlan> => planner.buy(account, offerId),
    cancel: (account: Account, offerId: number): Promise<TxPlan> => planner.cancel(account, offerId),
    settle: (account: Account): Promise<TxPlan> => planner.settle(account),
    redeem: (account: Account, amountPt: bigint): Promise<TxPlan> => planner.redeem(account, amountPt),
    claim: (account: Account): Promise<TxPlan> => planner.claim(account),
    withdraw: (account: Account): Promise<TxPlan> => planner.withdraw(account),
  };
}
