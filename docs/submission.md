# Submission pack

Hackathon: NEAR HACKATHON 2026. Deadline **2026-11-14 23:59 UTC** (submission API answers 403 after that). Judging 2026-11-16 to 11-18, results by 2026-11-18 23:59 UTC. Facts and field rules below come from `https://nearhackathon.com/HACKATHON.md` read on 2026-11-09; re-read it right before submitting, because dates and rules may change. Target for "everything ready": 2026-11-14 12:00 UTC.

## Checklist

| # | Item | Status on 2026-11-09 | Owner |
|---|---|---|---|
| 1 | Repository public before the deadline (with `LICENSE` and `README.md`) | `LICENSE` (MIT) and `README.md` written; repo not yet public | Needs the user |
| 2 | README runnable by a judge agent from a clean clone | Commands executed by R4: `pnpm install`, `pnpm test:sdk`, `pnpm e2e:fake`, `pnpm dev`, `pnpm test:qa` (see the Review section of `docs/handoffs/STATUS.md`) | Done, re-run after fixes |
| 3 | Testnet contracts deployed and a series that is Active when judges look | Contracts deployed (`deployments/testnet.json`). Run `pnpm demo:reset` and `pnpm keeper` right before the demo and again before the judging window | Needs the user (keys) |
| 4 | Hosted demo that stays up until 2026-11-18 (ideally 2026-11-25) | Not deployed. Steps below | Needs the user (Vercel account) |
| 5 | Demo video (3 minutes) | Script and shot list ready (`docs/demo/`). Not recorded | Needs the user |
| 6 | Public X post: says built at NEAR HACKATHON, tags @NEARProtocol and #NEARHackathon, has the video or screenshots | Draft ready (`docs/demo/x-post.md`). Not posted | Needs the user |
| 7 | One submission through the form or the API, after the human confirms the exact payload | Payload fields and a draft `idea` text below | Needs the user |
| 8 | NEAR **mainnet** account for the payout (named account or 64-character implicit) | Not created | Needs the user |
| 9 | Disclosures required by the rules (existing code, libraries, AI-generated code, other projects by the same person) | README section "Built with, and disclosures"; confirm it is accurate | Needs the user |
| 10 | Re-check the competitor and the positioning wording before publishing | `github.com/ayoubbuoya/exodus-near` was active on 2026-11-09 (pushed 13:24 UTC, testnet contracts, README, demo script). No "first" or "only" claims exist in the repo (checked by `qa/specs/routes.spec.ts` on the landing page) | R4 on request |

## Submission payload (what the human decides)

Do not send placeholders. The API is `POST https://nearhackathon.com/api/applications` with `Content-Type: application/json`, body up to 12,000 bytes, exactly these fields. The same fields are at `https://nearhackathon.com/#apply`. One submission per repository; mistakes are fixed at `https://nearhackathon.com/request-changes`, never by submitting twice.

| Field | Rule | Value |
|---|---|---|
| `requestId` | UUID, generate once and reuse on retries (`node -e 'console.log(crypto.randomUUID())'`) | generate at submit time |
| `projectName` | 2 to 80 characters | Suggested: `Rhea Strip` |
| `leadName` | 2 to 80 characters | the user |
| `email` | valid, max 160 characters, at most 2 submissions per email | the user |
| `size` | one of `1`, `2 - 4`, `4 - 6`, `6 - 8`, `8+` | the user |
| `tracks` | one or more of `defi`, `thesis`, `privacy`, `business`, `swarms`, `security`, `agents`, `realworld`, `games`, `nfts`, `memecoins`, `social`, `open` | Suggested: `defi` (Unstoppable DeFi: trading and vaults), optionally `open`. The user decides |
| `nearAddress` | 2 to 64 characters, lowercase, mainnet account for the payout | the user |
| `projectUrl` | public repository URL, max 300 characters, unique | the user |
| `demoUrl` | public X post URL, max 300 characters | after posting |
| `idea` | 20 to 2000 characters | draft below (1,774 characters) |
| `consent` | `true` only after the human agrees to: "I agree that the organizers may use these details to review our submission and contact us about this hackathon." | the user |

Do not add other fields (`website` is a spam trap). Do not commit the payload: it contains personal data.

### Draft `idea` text

```
Staking yield is locked inside the staked token: you cannot sell next month's yield today, and you cannot lock in a fixed return. Rhea Strip is a yield-tokenization protocol for NEAR liquid staking assets. A vault splits a staked NEAR token into a Principal Token (PT) and a Yield Token (YT). PT redeems the principal at maturity; YT collects the yield until maturity. Each side can be traded on its own through a maker-priced offer book inside the vault, and the flagship flow is selling future yield: a YT holder lists YT at the implied APY they will accept, a buyer pays upfront, takes over the yield from that moment, and the seller keeps the interest earned before the sale. At maturity anyone settles the series, PT redeems at the frozen index and YT holders claim their accrual.

What we built: three Rust contracts on NEAR testnet (strip-vault with the YT token, ledger and offer book; pt-token; a mock stNEAR with the Meta Pool interface), a TypeScript SDK with a faithful in-memory simulation, ops scripts, and a Next.js app with Strip, Trade, Portfolio and Settle screens. Everything runs without a wallet in fake mode (pnpm install, pnpm e2e:fake, pnpm dev) and on testnet with Meteor or Intear.

How NEAR fits: the vault and tokens are NEAR contracts using NEP-141 ft_transfer_call and NEP-145 storage; a strip or buy reads the staking token's price in the same receipt chain and refunds on every failure path; the app batches storage registration with the deposit in one wallet prompt via @hot-labs/near-connect.

Honest limits: the yield is mock yield on a demo clock (the real testnet stNEAR price is frozen), the book is not an AMM, testnet only, not audited. Code was written with AI coding agents under human direction; libraries are listed in the README.
```

## Deploy the app to Vercel (needs the user's Vercel account)

The app is `apps/web` in a pnpm workspace; it depends on `@rhea/sdk` (`workspace:*`, transpiled by `transpilePackages`), so the install must run from the repository root.

1. Make the repository public (or connect Vercel to the private repo, then make it public before the deadline).
2. Vercel dashboard, **Add New, Project**, import the GitHub repository.
3. Framework preset: **Next.js**. **Root Directory: `apps/web`**. Leave "Include source files outside of the Root Directory in the Build Step" enabled (default), so the workspace package `packages/sdk` is available.
4. Install command: leave the default (Vercel runs `pnpm install` at the workspace root because `pnpm-lock.yaml` and `pnpm-workspace.yaml` are there). Build command: default `next build`. Output: default. Node.js version: 22.x or newer.
5. Environment variable (Production and Preview): `NEXT_PUBLIC_RHEA_MODE` = `testnet`. No other variables are needed and no secrets are used. `NEXT_PUBLIC_` values are inlined at build time: change the variable, then redeploy.
6. Deploy. Open the URL: the landing page shows the series card with "Mock stNEAR, demo clock", `/strip` asks for a testnet wallet.
7. Optional but recommended for judges without a wallet: a second Vercel project from the same repo and root directory with `NEXT_PUBLIC_RHEA_MODE` = `fake`. It runs the in-memory simulation (the app labels it as a demo). Put that URL in the README as "Try it without a wallet". Both projects can stay on the Hobby plan.
8. Check the deployment against the checks in `qa/`: `RHEA_BASE_URL=https://<your-url> pnpm --filter qa exec playwright test specs/deployed.spec.ts specs/routes.spec.ts specs/viewports.spec.ts specs/a11y.spec.ts specs/reduced-motion.spec.ts` (the demo-path and fake-chain specs skip themselves when `RHEA_BASE_URL` is set).
9. Keep both projects up until at least 2026-11-18, ideally 2026-11-25. Do not delete the Vercel project or rotate the domain. Do not run `pnpm demo:reset` after the video is recorded without re-checking the app: it replaces the vault and PT accounts' state.
10. Add the final URL to the README (a "Live demo" line under the first paragraph) and to the X post.

Before the first build, run `pnpm --filter web build` once locally if you want to rule out build errors (heavy, never while a cargo build is running).

## Needs the user

- Make the repository public; confirm the README disclosures (existing code, AI assistance, libraries, fonts).
- Vercel account: deploy `apps/web` (and optionally the fake-mode twin) and keep them up until 2026-11-18 or later.
- Testnet keys: `pnpm demo:reset` and `pnpm keeper` need the `rhea-strip.testnet` keys in the OS keychain. Top up `pt.rhea-strip.testnet` and `mstnear.rhea-strip.testnet` (about 5 NEAR each) from a testnet faucet before judging (`docs/qa/contract-review.md` OP-1).
- A wallet pass on testnet (Meteor or Intear) of the whole demo path: wallet popups cannot be automated and this has not been done by any role.
- Record the video from `docs/demo/demo-script.md`; post the X post; give the post URL to whoever fills the form.
- A mainnet NEAR account for the payout; the form fields (name, email, team size, tracks).
- Decide whether to enter `defi` only or `defi` and `open`.

## Risk log

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| K-1 | The deployed series matures while nobody is looking, so strip, list and buy are refused (`E_NOT_ACTIVE`) | High (series are 10 to 45 minutes) | High for a live judge | `pnpm demo:reset` right before every demo; fake-mode twin site; README says what to expect |
| K-2 | YT accrual does not tick without a keeper (F-001 in the QA report), and a long-unsettled series pays huge YT claims on the demo clock (CR-4) | High until fixed | Medium | Run `pnpm keeper`; fix F-001 (R3 or R2); mention in the demo notes |
| K-3 | `pt` and `mstnear` accounts run out of NEAR for storage after about 100 to 200 new accounts (OP-1) | Medium with many judges | High (faucet or strip fails for new accounts) | Top up before judging; `E_MINT_FAILED` refunds cleanly |
| K-4 | Wallet popup flake on the demo machine | Medium | High | Fake mode is the guaranteed path; rehearse with the same wallet; fallback in `docs/demo/demo-script.md` |
| K-5 | The testnet wallet path was never driven end to end | Medium | High | Do the manual wallet pass (above) before recording |
| K-6 | FastNEAR or the explorer rate-limits or 403s | Low to medium | Medium | The app and SDK fail over to `testnet-rpc.intea.rs`; the explorer link is a convenience only |
| K-7 | A same-window competitor (`exodus-near`) ships a deployed testnet demo, a judge tour and a Pendle-style AMM | High | Medium (judging overlap) | Keep the claims narrow: offer book with forward-selling of yield as the flagship, faithful Meta Pool interface, honest labels, one-command reproduction. Never claim "first" |
| K-8 | AI screening cannot reproduce the README steps | Low (steps 1 to 5 executed) | High | Keep steps 1 to 5 free of keys and network beyond the package registry; re-run `pnpm test:qa` after every fix |
| K-9 | Hosted site stops before 2026-11-18 (deleted, paused, wrong mode) | Low | High | Keep both Vercel projects; re-check on 11-16 and 11-18 |
| K-10 | Submission rejected or edited incorrectly (409, wrong link) | Low | Medium | One attempt; changes through `request-changes`; print the payload and confirm it first |
| K-11 | Font licensing (Satoshi from Fontshare) and the visual reference page's rights | Low | Low | The reference's imagery and copy are not used; confirm the Fontshare licence terms for self-hosting before the repo goes public |
| K-12 | Contract keys are FullAccess keys on testnet accounts (OP-2) | n/a | Low on testnet | State "testnet only, not audited" everywhere; lock keys before any mainnet step |

## Day plan to the deadline

| Date (UTC) | What |
|---|---|
| 2026-11-10 | Route the QA report findings (F-001 to F-003, contract review CR-1 and CR-3) to R3, R2, R1; R4 re-runs `pnpm test:qa` and the contract checks |
| 2026-11-11 | Top up testnet accounts; manual wallet pass of the demo path; deploy to Vercel (testnet mode and the fake twin); run `specs/deployed.spec.ts` against both |
| 2026-11-12 | Record the video; draft the X post with the real URLs; final README pass (live demo line) |
| 2026-11-13 | Make the repo public; post on X; submit the form with the confirmed payload |
| 2026-11-14 | Buffer: `request-changes` for any mistake; fresh `pnpm demo:reset` and keeper for the judging window; re-check `exodus-near` and the wording |
| 2026-11-16 to 11-18 | Judging: keep the sites up; run `pnpm demo:reset` once before judging starts so a series is Active |
