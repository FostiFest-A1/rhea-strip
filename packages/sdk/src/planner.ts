import { GAS, INDEX_STALE_PLAN_MS, ONE_YOCTO, STORAGE_DEPOSIT_YOCTO } from "./constants";
import type {
  Account,
  Deployment,
  FnCallAction,
  Offer,
  RheaPlanner,
  Series,
  TxPlan,
  TxRequest,
  TxStep,
} from "./types";

export interface PlannerReads {
  deployment(): Deployment;
  nowMs(): number;
  series(): Promise<Series>;
  isRegistered(token: Account, account: Account): Promise<boolean>;
  offerById(id: number): Promise<Offer | null>;
}

export function fnCall(
  methodName: string,
  args: Record<string, unknown>,
  gas: bigint,
  deposit: bigint,
): FnCallAction {
  return {
    type: "FunctionCall",
    params: { methodName, args, gas: gas.toString(), deposit: deposit.toString() },
  };
}

function tx(receiverId: Account, ...actions: FnCallAction[]): TxRequest {
  return { receiverId, actions };
}

function step(id: string, label: string, transactions: TxRequest[]): TxStep {
  return { id, label, transactions, waitFor: "final" };
}

function registerTx(token: Account, account: Account): TxRequest {
  return tx(
    token,
    fnCall(
      "storage_deposit",
      { account_id: account, registration_only: true },
      GAS.storageDeposit,
      STORAGE_DEPOSIT_YOCTO,
    ),
  );
}

export class TxPlanner implements RheaPlanner {
  constructor(private readonly reads: PlannerReads) {}

  private async registrations(account: Account, tokens: Account[]): Promise<TxRequest[]> {
    const requests: TxRequest[] = [];
    for (const token of tokens) {
      if (!(await this.reads.isRegistered(token, account))) requests.push(registerTx(token, account));
    }
    return requests;
  }

  private async syncStep(series: Series): Promise<TxStep[]> {
    if (series.status !== "Active") return [];
    const age = this.reads.nowMs() - series.indexTsMs;
    if (age <= INDEX_STALE_PLAN_MS) return [];
    const vault = this.reads.deployment().vault;
    return [step("sync_index", "Sync index", [tx(vault, fnCall("sync_index", {}, GAS.syncIndex, 0n))])];
  }

  async faucet(account: Account): Promise<TxPlan> {
    void account;
    const { underlying } = this.reads.deployment();
    return [step("faucet", "Get test mstNEAR", [tx(underlying, fnCall("faucet", {}, GAS.faucet, 0n))])];
  }

  async strip(account: Account, amountSy: bigint): Promise<TxPlan> {
    const d = this.reads.deployment();
    const series = await this.reads.series();
    const plan: TxPlan = await this.syncStep(series);
    const registrations = await this.registrations(account, [d.underlying, d.pt, d.vault]);
    plan.push(
      step("strip", "Strip mstNEAR into PT and YT", [
        ...registrations,
        tx(
          d.underlying,
          fnCall(
            "ft_transfer_call",
            { receiver_id: d.vault, amount: amountSy.toString(), msg: JSON.stringify({ action: "strip" }) },
            GAS.strip,
            ONE_YOCTO,
          ),
        ),
      ]),
    );
    return plan;
  }

  async listYt(account: Account, amountYt: bigint, askSy: bigint): Promise<TxPlan> {
    void account;
    const d = this.reads.deployment();
    return [
      step("list_yt", "Sell future yield", [
        tx(
          d.vault,
          fnCall("list_yt", { amount: amountYt.toString(), ask_sy: askSy.toString() }, GAS.listYt, ONE_YOCTO),
        ),
      ]),
    ];
  }

  async listPt(account: Account, amountPt: bigint, askSy: bigint): Promise<TxPlan> {
    void account;
    const d = this.reads.deployment();
    return [
      step("list_pt", "List PT for sale", [
        tx(
          d.pt,
          fnCall(
            "ft_transfer_call",
            {
              receiver_id: d.vault,
              amount: amountPt.toString(),
              msg: JSON.stringify({ action: "list_pt", ask_sy: askSy.toString() }),
            },
            GAS.listPt,
            ONE_YOCTO,
          ),
        ),
      ]),
    ];
  }

  async buy(account: Account, offerId: number): Promise<TxPlan> {
    const d = this.reads.deployment();
    const [series, offer] = await Promise.all([this.reads.series(), this.reads.offerById(offerId)]);
    if (offer === null) throw new Error(`E_OFFER_GONE: offer ${offerId} is not open`);
    const plan: TxPlan = await this.syncStep(series);
    const receives = offer.kind === "Yt" ? d.vault : d.pt;
    const registrations = await this.registrations(account, [receives]);
    plan.push(
      step("buy", offer.kind === "Yt" ? "Buy YT" : "Buy PT", [
        ...registrations,
        tx(
          d.underlying,
          fnCall(
            "ft_transfer_call",
            {
              receiver_id: d.vault,
              amount: offer.askSy.toString(),
              msg: JSON.stringify({ action: "buy", offer_id: String(offerId) }),
            },
            GAS.buy,
            ONE_YOCTO,
          ),
        ),
      ]),
    );
    return plan;
  }

  async cancel(account: Account, offerId: number): Promise<TxPlan> {
    void account;
    const d = this.reads.deployment();
    return [
      step("cancel_offer", "Cancel offer", [
        tx(d.vault, fnCall("cancel_offer", { offer_id: String(offerId) }, GAS.cancelOffer, ONE_YOCTO)),
      ]),
    ];
  }

  async settle(account: Account): Promise<TxPlan> {
    void account;
    const d = this.reads.deployment();
    return [step("settle", "Settle series", [tx(d.vault, fnCall("settle", {}, GAS.settle, 0n))])];
  }

  async redeem(account: Account, amountPt: bigint): Promise<TxPlan> {
    const d = this.reads.deployment();
    const registrations = await this.registrations(account, [d.underlying]);
    return [
      step("redeem", "Redeem PT", [
        ...registrations,
        tx(
          d.pt,
          fnCall(
            "ft_transfer_call",
            { receiver_id: d.vault, amount: amountPt.toString(), msg: JSON.stringify({ action: "redeem" }) },
            GAS.redeem,
            ONE_YOCTO,
          ),
        ),
      ]),
    ];
  }

  async claim(account: Account): Promise<TxPlan> {
    const d = this.reads.deployment();
    const registrations = await this.registrations(account, [d.underlying]);
    return [
      step("claim_yield", "Claim yield", [
        ...registrations,
        tx(d.vault, fnCall("claim_yield", {}, GAS.claimYield, ONE_YOCTO)),
      ]),
    ];
  }

  async withdraw(account: Account): Promise<TxPlan> {
    const d = this.reads.deployment();
    const registrations = await this.registrations(account, [d.underlying]);
    return [
      step("withdraw_sy", "Withdraw sale proceeds", [
        ...registrations,
        tx(d.vault, fnCall("withdraw_sy", {}, GAS.withdrawSy, ONE_YOCTO)),
      ]),
    ];
  }
}
