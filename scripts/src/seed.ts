import { SCALE, askSyForPt, askSyForYt, createTestnetClient, fmtAmount, tauYears } from "@rhea/sdk";
import { loadDeployment, log } from "./common";
import { TestnetExecutor } from "./testnet-exec";

const STRIP_UNITS = 100n;

export async function seedMaker(): Promise<void> {
  const deployment = loadDeployment();
  const client = createTestnetClient({ deployment });
  const exec = new TestnetExecutor(deployment, fetch);
  const maker = deployment.maker;
  const series = await client.series();
  if (series.status !== "Active") throw new Error(`series is ${series.status}; run pnpm new-series first`);

  let balances = await client.balances(maker);
  if (balances.sy < STRIP_UNITS * SCALE) {
    for (let i = 0; i < 3; i += 1) await exec.send(await client.faucet(maker), maker);
    balances = await client.balances(maker);
  }
  const existing = (await client.offers()).filter((offer) => offer.seller === maker);
  if (existing.length >= 3) {
    log(`maker already has ${existing.length} open offers; nothing to seed`);
    return;
  }
  const ytHeld = balances.yt;
  if (ytHeld < 100n * SCALE) {
    await exec.send(await client.strip(maker, STRIP_UNITS * SCALE), maker);
  }
  const fresh = await client.series();
  const tau = tauYears(fresh.maturityMs, client.nowMs(), fresh.yearSecs);
  const plans = [
    { kind: "Yt" as const, units: 60n, apr: 0.09 },
    { kind: "Yt" as const, units: 40n, apr: 0.07 },
    { kind: "Pt" as const, units: 50n, apr: 0.075 },
  ];
  for (const plan of plans) {
    const amount = plan.units * SCALE;
    const ask = plan.kind === "Yt" ? askSyForYt(amount, plan.apr, tau, fresh.index) : askSyForPt(amount, plan.apr, tau, fresh.index);
    const txPlan = plan.kind === "Yt" ? await client.listYt(maker, amount, ask) : await client.listPt(maker, amount, ask);
    const records = await exec.send(txPlan, maker);
    log(`listed ${plan.units} ${plan.kind.toUpperCase()} at ${(plan.apr * 100).toFixed(1)}% for ${fmtAmount(ask, 24, 6)} mstNEAR: ${exec.link(records[records.length - 1].hash) ?? ""}`);
  }
  log(`maker offers now: ${(await client.offers()).filter((offer) => offer.seller === maker).length}`);
}
