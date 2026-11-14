import { z } from "zod";
import { composeClient } from "./client";
import { TxPlanner, type PlannerReads } from "./planner";
import { MainnetReferenceCache } from "./mainnet";
import { ytAccruedSy } from "./pricing";
import { RpcViews, accountSchema, u128Schema, u64Schema } from "./rpc";
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
} from "./types";

export interface TestnetClientOptions {
  deployment: Deployment;
  fetch?: typeof fetch;
}

type StoredSeries = Omit<Series, "liveIndex">;

const seriesSchema = z
  .object({
    underlying: accountSchema,
    pt: accountSchema,
    yt: accountSchema,
    maturity_ms: u64Schema,
    year_secs: u64Schema,
    min_strip: u128Schema,
    status: z.enum(["Active", "Matured", "Settled"]),
    index: u128Schema,
    index_ts_ms: u64Schema,
    maturity_index: u128Schema.nullable(),
    total_sy: u128Schema,
    pt_supply: u128Schema,
    yt_supply: u128Schema,
    open_offers: u64Schema,
  })
  .transform(
    (raw): StoredSeries => ({
      underlying: raw.underlying,
      pt: raw.pt,
      yt: raw.yt,
      maturityMs: raw.maturity_ms,
      yearSecs: raw.year_secs,
      minStrip: raw.min_strip,
      status: raw.status,
      index: raw.index,
      indexTsMs: raw.index_ts_ms,
      maturityIndex: raw.maturity_index,
      totalSy: raw.total_sy,
      ptSupply: raw.pt_supply,
      ytSupply: raw.yt_supply,
      openOffers: raw.open_offers,
    }),
  );

const positionSchema = z
  .object({
    yt_balance: u128Schema,
    yt_locked: u128Schema,
    yt_accrued_sy: u128Schema,
    yt_pending_sy: u128Schema,
    sy_credit: u128Schema,
  })
  .transform(
    (raw): Position => ({
      ytBalance: raw.yt_balance,
      ytLocked: raw.yt_locked,
      ytAccruedSy: raw.yt_accrued_sy,
      ytPendingSy: raw.yt_pending_sy,
      syCredit: raw.sy_credit,
    }),
  );

const offerSchema = z
  .object({
    id: u64Schema,
    seller: accountSchema,
    kind: z.enum(["Pt", "Yt"]),
    amount: u128Schema,
    ask_sy: u128Schema,
    created_ms: u64Schema,
  })
  .transform(
    (raw): Offer => ({
      id: raw.id,
      seller: raw.seller,
      kind: raw.kind,
      amount: raw.amount,
      askSy: raw.ask_sy,
      createdMs: raw.created_ms,
    }),
  );

const offersSchema = z.array(offerSchema);
const nullableOfferSchema = offerSchema.nullable();
const storageBalanceSchema = z.object({ total: z.string() }).nullable();
const OFFER_PAGE = 50;

class TestnetReader implements RheaReader, PlannerReads {
  readonly mode: Mode = "testnet";
  private readonly views: RpcViews;
  private readonly mainnet: MainnetReferenceCache;

  constructor(
    private readonly config: Deployment,
    fetchImpl: typeof fetch,
  ) {
    this.views = new RpcViews(config.rpcUrls);
    this.mainnet = new MainnetReferenceCache({ fetch: fetchImpl, stNearAccount: config.mainnetStNear });
  }

  deployment(): Deployment {
    return this.config;
  }

  nowMs(): number {
    return Date.now();
  }

  async series(): Promise<Series> {
    const stored = await this.views.view(this.config.vault, "get_series", {}, seriesSchema);
    const price = await this.views.view(stored.underlying, "get_st_near_price", {}, u128Schema);
    const live = stored.index > price ? stored.index : price;
    const liveIndex = stored.maturityIndex !== null ? stored.maturityIndex : live;
    return { ...stored, liveIndex };
  }

  async position(account: Account): Promise<Position> {
    const [series, raw] = await Promise.all([
      this.series(),
      this.views.view(this.config.vault, "get_position", { account_id: account }, positionSchema),
    ]);
    const stored = series.maturityIndex !== null && series.maturityIndex < series.index ? series.maturityIndex : series.index;
    const target = series.maturityIndex !== null && series.maturityIndex < series.liveIndex ? series.maturityIndex : series.liveIndex;
    if (raw.ytBalance === 0n || target <= stored) return raw;
    return { ...raw, ytPendingSy: raw.ytPendingSy + ytAccruedSy(raw.ytBalance, stored, target) };
  }

  async balances(account: Account): Promise<Balances> {
    const balanceOf = (contract: Account): Promise<bigint> =>
      this.views.view(contract, "ft_balance_of", { account_id: account }, u128Schema);
    const [nearYocto, sy, pt, yt] = await Promise.all([
      this.views.nearBalance(account),
      balanceOf(this.config.underlying),
      balanceOf(this.config.pt),
      balanceOf(this.config.vault),
    ]);
    return { nearYocto, sy, pt, yt };
  }

  async offers(filter?: { kind?: "Pt" | "Yt" }): Promise<Offer[]> {
    const collected: Offer[] = [];
    let fromIndex = 0;
    for (;;) {
      const args: Record<string, unknown> = { from_index: fromIndex, limit: OFFER_PAGE };
      if (filter?.kind !== undefined) args.kind = filter.kind;
      const page = await this.views.view(this.config.vault, "get_offers", args, offersSchema);
      collected.push(...page);
      if (page.length < OFFER_PAGE) return collected;
      fromIndex += OFFER_PAGE;
    }
  }

  mainnetReference(): Promise<MainnetReference> {
    return this.mainnet.get();
  }

  async isRegistered(token: Account, account: Account): Promise<boolean> {
    const balance = await this.views.view(token, "storage_balance_of", { account_id: account }, storageBalanceSchema);
    return balance !== null;
  }

  offerById(id: number): Promise<Offer | null> {
    return this.views.view(this.config.vault, "get_offer", { offer_id: String(id) }, nullableOfferSchema);
  }
}

export function createTestnetClient(options: TestnetClientOptions): RheaClient {
  const reader = new TestnetReader(options.deployment, options.fetch ?? fetch);
  return composeClient(reader, new TxPlanner(reader));
}
