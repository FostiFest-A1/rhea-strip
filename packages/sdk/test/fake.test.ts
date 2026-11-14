import { describe, expect, it } from "vitest";
import { FakeChain, FakeWallet, createFakeClient } from "../src/fake";
import { TxPlanner, type PlannerReads } from "../src/planner";
import { SCALE } from "../src/constants";
import { ytAccruedSy } from "../src/pricing";
import type { Account, RheaPlanner, TxPlan } from "../src/types";

const ALICE = "alice.testnet";
const BOB = "bob.testnet";
const UNIT = SCALE;

function setup(options: ConstructorParameters<typeof FakeChain>[0] = {}) {
  const chain = new FakeChain({ seed: false, startMs: 1_000_000, ...options });
  const wallet = new FakeWallet(chain);
  const reads: PlannerReads = {
    deployment: () => chain.deployment,
    nowMs: () => chain.nowMs(),
    series: async () => chain.getSeries(),
    isRegistered: async (token: Account, account: Account) => chain.isRegistered(token, account),
    offerById: async (id: number) => chain.getOffer(id),
  };
  const planner: RheaPlanner = new TxPlanner(reads);
  return { chain, wallet, planner };
}

async function run(wallet: FakeWallet, plan: TxPlan, account: Account) {
  const result = await wallet.signAndSend(plan, account);
  if (!result.ok) throw new Error(result.error ?? "plan failed");
  return result;
}

describe("live index accrual", () => {
  it("ticks ytPendingSy with the demo clock without any keeper", async () => {
    const { chain, wallet, planner } = setup();
    await run(wallet, await planner.faucet(ALICE), ALICE);
    await run(wallet, await planner.strip(ALICE, 10n * UNIT), ALICE);
    const before = chain.getSeries();
    const start = chain.getPosition(ALICE);
    expect(before.liveIndex).toBeGreaterThanOrEqual(before.index);
    chain.advance(5 * 60_000);
    const after = chain.getSeries();
    const later = chain.getPosition(ALICE);
    expect(after.liveIndex).toBeGreaterThan(before.liveIndex);
    expect(after.index).toBe(before.index);
    expect(later.ytPendingSy).toBeGreaterThan(start.ytPendingSy);
    const expected = ytAccruedSy(later.ytBalance, before.index, after.liveIndex);
    const diff = later.ytPendingSy > expected ? later.ytPendingSy - expected : expected - later.ytPendingSy;
    expect(diff <= 1n).toBe(true);
  });

  it("caps live accrual at the maturity index once settled", async () => {
    const { chain, wallet, planner } = setup();
    await run(wallet, await planner.faucet(ALICE), ALICE);
    await run(wallet, await planner.strip(ALICE, 10n * UNIT), ALICE);
    chain.advanceToMaturity();
    await run(wallet, await planner.settle(ALICE), ALICE);
    const series = chain.getSeries();
    expect(series.maturityIndex).not.toBeNull();
    expect(series.liveIndex).toBe(series.maturityIndex);
    const settled = chain.getPosition(ALICE);
    chain.advance(10 * 60_000);
    expect(chain.getPosition(ALICE).ytPendingSy).toBe(settled.ytPendingSy);
  });
});

describe("FakeChain vault accounting", () => {
  it("replays the section 3.4 worked vector exactly", async () => {
    const { chain, wallet, planner } = setup({
      p0: (SCALE * 3n) / 2n,
      aprBps: 1000,
      yearSecs: 3600,
      maturityInMs: 3_600_000,
    });
    await run(wallet, await planner.faucet(ALICE), ALICE);
    await run(wallet, await planner.strip(ALICE, 100n * UNIT), ALICE);
    expect(chain.getBalances(ALICE).pt).toBe(150n * UNIT);
    expect(chain.getBalances(ALICE).yt).toBe(150n * UNIT);
    chain.advance(2_400_000);
    chain.call({ predecessor: ALICE, receiver: chain.deployment.vault, method: "sync_index", args: {} });
    expect(chain.stNearPrice()).toBe((SCALE * 16n) / 10n);
    const position = chain.getPosition(ALICE);
    const accrued = position.ytAccruedSy + position.ytPendingSy;
    expect(accrued).toBe(6_250_000_000_000_000_000_000_000n);
  });

  it("keeps the vault solvent through strip, trade, settle, redeem and claim", async () => {
    const { chain, wallet, planner } = setup();
    for (const who of [ALICE, BOB]) await run(wallet, await planner.faucet(who), who);
    await run(wallet, await planner.strip(ALICE, 50n * UNIT), ALICE);
    const check = () => expect(chain.vaultSyBalance() >= chain.vaultOwedSy()).toBe(true);
    check();
    await run(wallet, await planner.listYt(ALICE, 20n * UNIT, UNIT / 2n), ALICE);
    chain.advance(120_000);
    const [offer] = await chain.getOffers();
    await run(wallet, await planner.buy(BOB, offer.id), BOB);
    check();
    chain.advanceToMaturity();
    await run(wallet, await planner.settle(BOB), BOB);
    const series = chain.getSeries();
    expect(series.status).toBe("Settled");
    for (const who of [ALICE, BOB]) {
      const balances = chain.getBalances(who);
      if (balances.pt > 0n) await run(wallet, await planner.redeem(who, balances.pt), who);
      check();
    }
    await run(wallet, await planner.claim(ALICE), ALICE);
    await run(wallet, await planner.claim(BOB), BOB);
    await run(wallet, await planner.withdraw(ALICE), ALICE);
    check();
    expect(chain.getSeries().ptSupply).toBe(0n);
    expect(chain.getSeries().ytSupply).toBe(0n);
    const total = chain.getBalances(ALICE).sy + chain.getBalances(BOB).sy + chain.vaultSyBalance();
    expect(total).toBe(200n * UNIT);
  });

  it("lets the YT seller keep interest accrued before the fill", async () => {
    const { chain, wallet, planner } = setup();
    for (const who of [ALICE, BOB]) await run(wallet, await planner.faucet(who), who);
    await run(wallet, await planner.strip(ALICE, 50n * UNIT), ALICE);
    await run(wallet, await planner.listYt(ALICE, 30n * UNIT, UNIT), ALICE);
    chain.advance(180_000);
    await run(wallet, await planner.buy(BOB, 1), BOB);
    const alice = chain.getPosition(ALICE);
    expect(alice.ytAccruedSy).toBeGreaterThan(0n);
    expect(alice.ytLocked).toBe(0n);
    expect(alice.syCredit).toBe(UNIT);
    expect(chain.getPosition(BOB).ytAccruedSy).toBe(0n);
    chain.advance(120_000);
    await run(wallet, await planner.strip(BOB, UNIT), BOB);
    expect(chain.getPosition(BOB).ytAccruedSy).toBeGreaterThan(0n);
  });

  it("never lets the index decrease and ignores a zero or lower price", async () => {
    const { chain, wallet } = setup();
    const before = chain.getSeries().index;
    chain.advance(60_000);
    await run(wallet, [{ id: "s", label: "s", waitFor: "final", transactions: [{ receiverId: chain.deployment.vault, actions: [{ type: "FunctionCall", params: { methodName: "sync_index", args: {}, gas: "1", deposit: "0" } }] }] }], ALICE);
    const mid = chain.getSeries().index;
    expect(mid).toBeGreaterThan(before);
    chain.call({ predecessor: chain.deployment.rootAccount, receiver: chain.deployment.underlying, method: "set_apr_bps", args: { apr_bps: 0 } });
    chain.advance(60_000);
    chain.call({ predecessor: ALICE, receiver: chain.deployment.vault, method: "sync_index", args: {} });
    expect(chain.getSeries().index).toBe(mid);
  });

  it("refunds wrong-token and malformed transfers instead of panicking", async () => {
    const { chain, wallet, planner } = setup();
    await run(wallet, await planner.faucet(ALICE), ALICE);
    const vault = chain.deployment.vault;
    const outcome = chain.call({
      predecessor: ALICE,
      receiver: chain.deployment.underlying,
      method: "ft_transfer_call",
      args: { receiver_id: vault, amount: (10n * UNIT).toString(), msg: "not json" },
      deposit: 1n,
    });
    expect(outcome.ok).toBe(true);
    expect(outcome.refunded).toBe(10n * UNIT);
    expect(outcome.refundReason).toBe("E_BAD_MSG");
    expect(chain.getBalances(ALICE).sy).toBe(100n * UNIT);
    const redeem = chain.call({
      predecessor: ALICE,
      receiver: chain.deployment.underlying,
      method: "ft_transfer_call",
      args: { receiver_id: vault, amount: UNIT.toString(), msg: JSON.stringify({ action: "redeem" }) },
      deposit: 1n,
    });
    expect(redeem.refundReason).toBe("E_WRONG_TOKEN");
  });

  it("rejects strip below the minimum, after maturity and redeem before settlement", async () => {
    const { chain, wallet, planner } = setup();
    await run(wallet, await planner.faucet(ALICE), ALICE);
    const tiny = await planner.strip(ALICE, 1n);
    const tinyResult = await wallet.signAndSend(tiny, ALICE);
    expect(tinyResult.steps[0].outcomes.at(-1)?.refundReason).toBe("E_MIN_AMOUNT");
    await run(wallet, await planner.strip(ALICE, 10n * UNIT), ALICE);
    chain.advanceToMaturity();
    const late = await wallet.signAndSend(await planner.strip(ALICE, UNIT), ALICE);
    expect(late.steps[0].outcomes.at(-1)?.refundReason).toBe("E_NOT_ACTIVE");
    const early = await wallet.signAndSend(await planner.redeem(ALICE, UNIT), ALICE);
    expect(early.steps[0].outcomes.at(-1)?.refundReason).toBe("E_NOT_SETTLED");
    const claim = await wallet.signAndSend(await planner.claim(ALICE), ALICE);
    expect(claim.ok).toBe(false);
    expect(claim.error).toContain("E_NOT_SETTLED");
  });

  it("enforces offer rules: owner-only cancel, locked YT, price match, offer cap", async () => {
    const { chain, wallet, planner } = setup();
    for (const who of [ALICE, BOB]) await run(wallet, await planner.faucet(who), who);
    await run(wallet, await planner.strip(ALICE, 50n * UNIT), ALICE);
    await run(wallet, await planner.listYt(ALICE, 10n * UNIT, UNIT), ALICE);
    const notOwner = await wallet.signAndSend(await planner.cancel(BOB, 1), BOB);
    expect(notOwner.error).toContain("E_NOT_OWNER");
    const over = await wallet.signAndSend(await planner.listYt(ALICE, 100n * UNIT, UNIT), ALICE);
    expect(over.error).toContain("E_INSUFFICIENT_YT");
    const underpay = chain.call({
      predecessor: BOB,
      receiver: chain.deployment.underlying,
      method: "ft_transfer_call",
      args: { receiver_id: chain.deployment.vault, amount: (UNIT / 2n).toString(), msg: JSON.stringify({ action: "buy", offer_id: "1" }) },
      deposit: 1n,
    });
    expect(underpay.refundReason).toBe("E_PRICE_MISMATCH");
    expect(chain.getOffers()).toHaveLength(1);
    for (let i = 0; i < 4; i += 1) await run(wallet, await planner.listYt(ALICE, UNIT, UNIT / 10n), ALICE);
    const sixth = await wallet.signAndSend(await planner.listYt(ALICE, UNIT, UNIT / 10n), ALICE);
    expect(sixth.error).toContain("E_TOO_MANY_OFFERS");
    await run(wallet, await planner.cancel(ALICE, 1), ALICE);
    expect(chain.getPosition(ALICE).ytLocked).toBe(4n * UNIT);
  });

  it("escrows PT offers, fills them and refunds the buyer when PT cannot be delivered", async () => {
    const { chain, wallet, planner } = setup();
    for (const who of [ALICE, BOB]) await run(wallet, await planner.faucet(who), who);
    await run(wallet, await planner.strip(ALICE, 50n * UNIT), ALICE);
    await run(wallet, await planner.listPt(ALICE, 20n * UNIT, 15n * UNIT), ALICE);
    const ptBeforeBuy = chain.getBalances(BOB).pt;
    const bobBuyPlan = await planner.buy(BOB, 1);
    expect(bobBuyPlan.at(-1)?.transactions.map((t) => t.receiverId)).toEqual([
      chain.deployment.pt,
      chain.deployment.underlying,
    ]);
    const direct = await run(wallet, bobBuyPlan, BOB);
    expect(direct.ok).toBe(true);
    expect(chain.getBalances(BOB).pt - ptBeforeBuy).toBe(20n * UNIT);
    await run(wallet, await planner.listPt(ALICE, 5n * UNIT, UNIT), ALICE);
    const unregistered = "carol.testnet";
    await run(wallet, await planner.faucet(unregistered), unregistered);
    const failing = chain.call({
      predecessor: unregistered,
      receiver: chain.deployment.underlying,
      method: "ft_transfer_call",
      args: { receiver_id: chain.deployment.vault, amount: UNIT.toString(), msg: JSON.stringify({ action: "buy", offer_id: "2" }) },
      deposit: 1n,
    });
    expect(failing.refunded).toBe(UNIT);
    expect(chain.getOffers()).toHaveLength(1);
    expect(chain.getBalances(unregistered).sy).toBe(100n * UNIT);
  });
});

describe("planner shapes", () => {
  it("batches registration, prepends sync_index when stale and sets 1 yocto and gas", async () => {
    const { chain, planner } = setup();
    await run(new FakeWallet(chain), await planner.faucet(ALICE), ALICE);
    const fresh = await planner.strip(ALICE, UNIT);
    expect(fresh.map((s) => s.id)).toEqual(["strip"]);
    const registrations = fresh[0].transactions.filter((t) => t.actions[0].params.methodName === "storage_deposit");
    expect(registrations.map((t) => t.receiverId)).toEqual([chain.deployment.pt, chain.deployment.vault]);
    const main = fresh[0].transactions.at(-1);
    expect(main?.actions[0].params.methodName).toBe("ft_transfer_call");
    expect(main?.actions[0].params.deposit).toBe("1");
    expect(main?.actions[0].params.gas).toBe("150000000000000");
    chain.advance(21_000);
    const stale = await planner.strip(ALICE, UNIT);
    expect(stale.map((s) => s.id)).toEqual(["sync_index", "strip"]);
    expect(stale[0].transactions[0].actions[0].params.gas).toBe("50000000000000");
    expect(stale.every((s) => s.waitFor === "final")).toBe(true);
  });

  it("skips registration once the account is registered", async () => {
    const { chain, wallet, planner } = setup();
    await run(wallet, await planner.faucet(ALICE), ALICE);
    await run(wallet, await planner.strip(ALICE, UNIT), ALICE);
    const again = await planner.strip(ALICE, UNIT);
    expect(again.at(-1)?.transactions).toHaveLength(1);
    expect(chain.isRegistered(chain.deployment.pt, ALICE)).toBe(true);
  });
});

describe("createFakeClient", () => {
  it("seeds maker offers and runs plans through the fake wallet", async () => {
    const client = createFakeClient({ realtime: false, startMs: 5_000_000 });
    const offers = await client.offers();
    expect(offers.length).toBeGreaterThanOrEqual(3);
    expect((await client.offers({ kind: "Pt" })).every((o) => o.kind === "Pt")).toBe(true);
    await client.wallet.signAndSend(await client.faucet(BOB), BOB);
    const best = offers.find((o) => o.kind === "Yt");
    if (best === undefined) throw new Error("no YT offer seeded");
    const result = await client.wallet.signAndSend(await client.buy(BOB, best.id), BOB);
    expect(result.ok).toBe(true);
    expect((await client.balances(BOB)).yt).toBe(best.amount);
    expect((await client.mainnetReference()).apy).toBeGreaterThan(0);
  });
});
