import {
  SCALE,
  askSyForPt,
  askSyForYt,
  fmtAmount,
  tauYears,
  ytAccruedSy,
  type Account,
  type Position,
  type RheaClient,
  type Series,
  type TxPlan,
} from "@rhea/sdk";

export interface TxRecord {
  stepId: string;
  label: string;
  receiverId: string;
  method: string;
  hash: string;
}

export interface Executor {
  send(plan: TxPlan, account: Account): Promise<TxRecord[]>;
  link(hash: string): string | null;
}

export interface FlowEnv {
  client: RheaClient;
  exec: Executor;
  alice: Account;
  bob: Account;
  watch: Account[];
  strict: boolean;
  pause(ms: number): Promise<void>;
  waitForMaturity(): Promise<void>;
}

interface Row {
  step: string;
  account: string;
  result: string;
  tx: string;
}

const UNIT = SCALE;
const STRIP_AMOUNT = 50n * UNIT;
const YT_SALE = 20n * UNIT;
const PT_SALE = 10n * UNIT;
const SALE_APR = 0.08;

export class FlowError extends Error {}

function check(condition: boolean, message: string): void {
  if (!condition) throw new FlowError(message);
}

export async function runFlow(env: FlowEnv): Promise<string> {
  const rows: Row[] = [];
  const { client, exec } = env;
  const vault = client.deployment().vault;

  const run = async (step: string, account: Account, plan: TxPlan, detail: () => string = () => "ok"): Promise<void> => {
    const records = await exec.send(plan, account);
    const hashes = records.map((record) => {
      const link = exec.link(record.hash);
      return link ?? record.hash;
    });
    rows.push({ step, account, result: detail(), tx: hashes.join(" ") });
  };

  const owedSy = async (series: Series): Promise<bigint> => {
    let owed = 0n;
    const index = series.maturityIndex ?? series.index;
    owed += (series.ptSupply * SCALE) / index;
    for (const account of env.watch) {
      const position = await client.position(account);
      owed += position.ytAccruedSy + position.ytPendingSy + position.syCredit;
    }
    return owed;
  };

  const assertSolvent = async (label: string): Promise<void> => {
    const [series, vaultBalances] = await Promise.all([client.series(), client.balances(vault)]);
    const owed = await owedSy(series);
    check(vaultBalances.sy >= owed, `conservation broken after ${label}: vault holds ${vaultBalances.sy}, owes at least ${owed}`);
  };

  const sy = async (account: Account): Promise<bigint> => (await client.balances(account)).sy;

  for (const account of [env.alice, env.bob]) {
    if ((await sy(account)) < 60n * UNIT) {
      await run("get test mstNEAR", account, await client.faucet(account), () => "+100 mstNEAR");
    }
  }
  const startTotal = (await sy(env.alice)) + (await sy(env.bob)) + (await sy(vault));
  const ptBeforeAlice = (await client.balances(env.alice)).pt;
  const ytBeforeAlice = (await client.balances(env.alice)).yt;

  await run("strip 50 mstNEAR (criteria 1-2)", env.alice, await client.strip(env.alice, STRIP_AMOUNT), () => "PT + YT minted");
  const afterStrip = await client.balances(env.alice);
  const ptMinted = afterStrip.pt - ptBeforeAlice;
  const ytMinted = afterStrip.yt - ytBeforeAlice;
  const seriesAfterStrip = await client.series();
  check(ptMinted === ytMinted && ptMinted > 0n, "strip must mint equal PT and YT");
  check(ptMinted >= (STRIP_AMOUNT * seriesAfterStrip.index) / SCALE - SCALE / 10n, "PT minted must equal stake times index");
  rows[rows.length - 1].result = `${fmtAmount(ptMinted)} PT + ${fmtAmount(ytMinted)} YT`;
  await assertSolvent("strip");

  const series0 = await client.series();
  const tau0 = tauYears(series0.maturityMs, client.nowMs(), series0.yearSecs);
  const ytAsk = askSyForYt(YT_SALE, SALE_APR, tau0, series0.index);
  await run("sell 20 YT, 'Sell future yield' (criterion 4)", env.alice, await client.listYt(env.alice, YT_SALE, ytAsk), () => `ask ${fmtAmount(ytAsk, 24, 6)} mstNEAR`);
  const ptAsk = askSyForPt(PT_SALE, SALE_APR, tau0, series0.index);
  await run("list 10 PT (criterion 3)", env.alice, await client.listPt(env.alice, PT_SALE, ptAsk), () => `ask ${fmtAmount(ptAsk, 24, 6)} mstNEAR`);

  const offers = await client.offers();
  const ytOffer = offers.filter((o) => o.seller === env.alice && o.kind === "Yt" && o.amount === YT_SALE && o.askSy === ytAsk).at(-1);
  const ptOffer = offers.filter((o) => o.seller === env.alice && o.kind === "Pt" && o.amount === PT_SALE && o.askSy === ptAsk).at(-1);
  check(ytOffer !== undefined && ptOffer !== undefined, "both offers must be visible in the book");
  if (ytOffer === undefined || ptOffer === undefined) throw new FlowError("unreachable");
  const lockedPosition = await client.position(env.alice);
  check(lockedPosition.ytLocked >= YT_SALE, "listing must lock the seller YT");

  await env.pause(60_000);
  const bobYtBefore = (await client.balances(env.bob)).yt;
  const bobPtBefore = (await client.balances(env.bob)).pt;
  await run("buy YT offer", env.bob, await client.buy(env.bob, ytOffer.id), () => "20 YT received");
  const seriesAtFill = await client.series();
  const fillIndex = seriesAtFill.index;
  const aliceAfterFill = await client.position(env.alice);
  const bobAfterYt = await client.balances(env.bob);
  check(bobAfterYt.yt - bobYtBefore === YT_SALE, "buyer must receive the sold YT");
  check(aliceAfterFill.syCredit >= ytAsk, "seller must be credited the ask");
  check(aliceAfterFill.ytAccruedSy > 0n, "seller keeps the interest accrued before the fill (attribution)");
  check((await client.position(env.bob)).ytAccruedSy === 0n, "buyer starts accruing from the fill only");
  await assertSolvent("YT fill");

  await run("buy PT offer", env.bob, await client.buy(env.bob, ptOffer.id), () => "10 PT received");
  check((await client.balances(env.bob)).pt - bobPtBefore >= PT_SALE, "buyer must receive the sold PT");
  await assertSolvent("PT fill");

  const aliceSyBeforeWithdraw = await sy(env.alice);
  const credit = (await client.position(env.alice)).syCredit;
  await run("withdraw sale proceeds", env.alice, await client.withdraw(env.alice), () => `+${fmtAmount(credit, 24, 6)} mstNEAR`);
  check((await sy(env.alice)) - aliceSyBeforeWithdraw === credit, "withdraw must pay the full credit");
  await assertSolvent("withdraw");

  await env.waitForMaturity();
  await run("settle at maturity", env.bob, await client.settle(env.bob), () => "maturity index frozen");
  const settled = await client.series();
  check(settled.status === "Settled" && settled.maturityIndex !== null, "series must be Settled");
  const maturityIndex = settled.maturityIndex ?? 0n;

  for (const who of [env.alice, env.bob]) {
    const balances = await client.balances(who);
    const syBefore = balances.sy;
    if (balances.pt > 0n) {
      await run("redeem PT (criterion 5)", who, await client.redeem(who, balances.pt), () => `${fmtAmount(balances.pt)} PT`);
      const expected = (balances.pt * SCALE) / maturityIndex;
      const received = (await sy(who)) - syBefore;
      check(received === expected, `redeem must pay floor(pt/maturityIndex): got ${received}, expected ${expected}`);
    }
    await assertSolvent(`redeem ${who}`);
  }

  const bobPositionBeforeClaim = await client.position(env.bob);
  const aliceBefore = await sy(env.alice);
  await run("claim YT yield (criterion 5)", env.alice, await client.claim(env.alice), () => "ok");
  const aliceClaimed = (await sy(env.alice)) - aliceBefore;
  check(aliceClaimed >= aliceAfterFill.ytAccruedSy, "seller claim must include pre-fill interest");

  const bobBefore = await sy(env.bob);
  await run("claim YT yield (buyer)", env.bob, await client.claim(env.bob), () => "ok");
  const bobClaimed = (await sy(env.bob)) - bobBefore;
  const bobExpected = ytAccruedSy(YT_SALE, fillIndex, maturityIndex);
  if (env.strict) {
    check(bobClaimed === bobExpected, `buyer claim must equal accrual since the fill: got ${bobClaimed}, expected ${bobExpected}`);
  } else {
    check(bobClaimed > 0n && bobClaimed <= bobPositionBeforeClaim.ytAccruedSy + bobPositionBeforeClaim.ytPendingSy + 1n, "buyer claim must be positive and bounded by its accrual");
  }
  await assertSolvent("claims");

  const endTotal = (await sy(env.alice)) + (await sy(env.bob)) + (await sy(vault));
  check(endTotal === startTotal, `conservation: mstNEAR total changed from ${startTotal} to ${endTotal}`);
  const alicePosition: Position = await client.position(env.alice);
  check(alicePosition.syCredit === 0n, "no unwithdrawn credit left");

  const width = Math.max(...rows.map((row) => row.step.length));
  const lines = rows.map((row, i) => `${String(i + 1).padStart(2)}  ${row.step.padEnd(width)}  ${row.account.padEnd(14)}  ${row.result}${row.tx === "" ? "" : `  ${row.tx}`}`);
  return lines.join("\n");
}
