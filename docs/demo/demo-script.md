# Demo script (3 minutes)

The click path below is the demo path from `docs/handoffs/00-overview.md`. Every step was exercised by `qa/specs/demo-path.spec.ts` in fake mode (`pnpm test:qa`, 22 to 38 seconds, 9 steps). The testnet version uses the same clicks with a real wallet (Meteor or Intear on testnet).

Rule for the voice-over: say what is mocked. The yield is mock yield on a demo clock, the network is testnet, the contracts are not audited. Never say "first" or "only".

## Before you record (10 minutes)

Fake mode, guaranteed path:

1. `pnpm install` once, then `pnpm dev` and open `http://localhost:3000` in a clean Chrome window (1440 x 900, zoom 100%, bookmarks bar hidden).
2. Do not reload the page once you start: fake state is in memory and resets on reload. Navigate with the header links only.
3. Close the "Demo clock" panel after each use: it floats bottom right and covers the Buy button at 1440 x 900 (finding F-003 in the Review section of `docs/handoffs/STATUS.md`).

Testnet mode, for the live version:

1. `pnpm demo:reset` (fresh 10-minute series, maker offers seeded), then `pnpm keeper` in a second terminal so the YT accrual ticks and the series settles within 15 s of maturity.
2. `pnpm --filter web dev:testnet`, wallet extension installed, two testnet accounts funded (Alice and Bob), both signed in on separate browser profiles. Pre-register nothing by hand: the app batches `storage_deposit` itself.
3. Do a full rehearsal with the same wallet the same day. Wallet popups cannot be automated.
4. The series matures 10 minutes after `demo:reset`: start the take within 2 minutes of the reset so the maturity beat lands at about 2:20.

## Beats

| Time | Screen and click | Say |
|---|---|---|
| 0:00 | `/` hero in view | "If you stake NEAR, your yield arrives slowly and you cannot spend it before you earn it. Rhea Strip splits a staked NEAR token into principal and yield, and lets you sell the yield early." |
| 0:12 | Scroll to the series card: "Mock stNEAR, demo clock" pill, the countdown, the mainnet stNEAR reference price | "This is a hackathon build on NEAR testnet. The token is a mock with the Meta Pool stNEAR interface, and time runs on a demo clock, so a year of yield takes about an hour. The mainnet price here is a real read-only reference." |
| 0:25 | Click **Launch app** | |
| 0:28 | `/strip`, header selector on Alice. Click **Get test mstNEAR** | "I am Alice. The faucet gives me 100 mock staked NEAR." |
| 0:36 | Type `10` in the amount field. Point at the PT (ice) and YT (pink) tiles | "Ten staked NEAR becomes a principal token and a yield token of equal value. PT is ice, YT is pink everywhere." |
| 0:46 | Click **Strip mstNEAR**. Show the stepper finishing and the "You received" card | "The vault takes the deposit and mints both. On testnet the app batches the storage registration and the deposit for me." |
| 0:58 | Header link **Trade**. YT tab, hero **Sell future yield** | "Now the flagship move: I sell the yield I have not earned yet." |
| 1:05 | Enter `5` in "YT to sell". Drag the implied APY slider from 8% to about 20% and back to 8% | "I choose the implied APY I will accept. The upfront amount follows from the price formula, so a lower APY means less money now." |
| 1:20 | Click **List YT**. Show the offer row with "You" and Cancel | "My offer is in the vault's offer book. There is no AMM here: the price is mine, fills are all-or-nothing, no fees." |
| 1:30 | Open **Demo clock**, click **+1 minute**, close the panel (fake mode only). On testnet skip this: real time passes | "A minute passes on the demo clock. Alice's YT has been earning." |
| 1:38 | Header selector to Bob. **Strip** page: **Get test mstNEAR**. Then **Trade** | "Now I am Bob, a second account. He wants yield exposure." |
| 1:48 | In the YT offer list click **Buy** on Alice's offer (testnet: **Quick fill best offer** on the maker's offer, or Alice's). Toast appears (testnet: click the explorer link) | "Bob pays the ask in mstNEAR and takes over the YT. Interest earned before the fill stays with Alice; Bob earns from now on." |
| 2:00 | Selector back to Alice, header link **Portfolio** | "Back to Alice." |
| 2:05 | Point at PT, remaining YT, "5 listed for sale / free", the sale credit; click **Withdraw** | "She still holds her PT and the rest of her YT. The sale proceeds sit as a credit in the vault. Withdraw, and her mstNEAR balance rises by the ask." |
| 2:20 | Open **Demo clock**, click **Jump to maturity**, close (testnet: wait for the countdown to hit zero, the keeper settles). Header link **Settle** | "Time to maturity." |
| 2:26 | `/settle`: the "Series settled" step runs by itself. Click **Redeem PT**, then **Claim YT** | "Anyone can settle; the app does it on entry and the index freezes. PT redeems for the underlying at that index. The YT pays the accrued yield and is burned." |
| 2:42 | Selector to Bob, **Settle**, click **Claim YT** | "Bob claims only what accrued since his fill." |
| 2:50 | **Portfolio** (Alice): PT 0, YT 0, mstNEAR balance | "End state: no PT, no YT, all mstNEAR, principal plus yield." |
| 2:55 | Back to the hero or the repo page | "Rhea Strip: split yield from principal and trade either side. NEAR contracts on testnet, mock yield, not audited. The repo and a one-command test are in the post." |

Total: 3:00. If you run over, cut the 1:05 slider beat to one pass and skip Bob's second claim (2:42).

## What each beat proves (the five PRD success criteria)

| Criterion | Beat |
|---|---|
| Deposit into the vault | 0:46 |
| Receive PT and YT | 0:46 |
| Hold and trade independently | 1:20 to 1:48 |
| Sell future yield through YT trading | 1:05 to 2:05 |
| Redeem principal and claim yield at maturity | 2:26 to 2:50 |

## Fallbacks

| Problem | What to do |
|---|---|
| Wallet popup does not open, or signs but nothing happens | Close the popup, reload the wallet extension once. If it fails again, switch to fake mode: stop the testnet server, run `pnpm dev`, and re-record from 0:28 (the click path is identical). Say in the voice-over that this is the in-memory simulation |
| RPC is slow or a view fails | The app fails over from FastNEAR to the second RPC. Wait 10 seconds; if the page still shows "Could not load the series", use fake mode |
| Series already matured before you start (testnet) | Strip, list and buy are refused with `E_NOT_ACTIVE`. Run `pnpm demo:reset` and start again, or start the take at the 2:20 beat (settle, redeem, claim still work) |
| `E_STALE_INDEX` on a YT action | The index is older than two minutes: start `pnpm keeper`, or click through the app (the planner syncs the index first) |
| Buy button covered by the Demo clock panel | Close the panel (button "Demo clock") |
| No time to demo live | Show `pnpm e2e:fake` in a terminal (13-row table ending in `e2e:fake OK`), then the recorded take. The post still needs a video |
| Mistake in the take | Cut at the nearest beat boundary; every beat starts from a clean screen |
