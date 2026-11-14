# 00 — Overview: Rhea Strip MVP handoffs

Project: yield-tokenization (PT/YT) protocol on NEAR, hackathon MVP. Deadline NEAR HACKATHON 2026-11-14 23:59 UTC (today 2026-11-09). Testnet only. PRD: `docs/Rhea_Strip_MVP_PRD.md`.

## Roles and handoffs

| Role | Handoff | Owns | Agent type |
|---|---|---|---|
| R1 Contracts: strip-vault | `01-contracts-vault.md` | `contracts/Cargo.toml`, `contracts/strip-vault/**`, `contracts/tests/**`, `docs/qa/audit-strip-vault.md` | general-purpose |
| R2 Frontend | `02-frontend.md` | `apps/web/**` | me:frontend |
| R3 SDK, tokens, ops | `03-sdk-tokens-ops.md` | `contracts/mock-stnear/**`, `contracts/pt-token/**`, `packages/sdk/**`, `scripts/**`, `deployments/**`, root JS config + lockfile | general-purpose |
| R4 QA, docs, demo | `04-qa-docs.md` | `README.md`, `LICENSE`, `qa/**`, `docs/demo/**`, `docs/qa/**` (except R1's audit file), `docs/submission.md` | general-purpose |

Shared interface file: `contracts.md` (everything that crosses a role boundary). Only the PM edits it.

## Dependency graph and dispatch order

```
R3 phase0 (root workspace + @rhea/sdk types + pricing + FakeChain) ──► R2 phase2 (screens)
R3 phase1 (mock-stnear, pt-token wasm) ───────────────────────────────► R1 integration tests
R1 (strip_vault.wasm) ────────────────────────────────────────────────► R3 phase2 (deploy to testnet) ──► R2 testnet verification
R1 + R2 + R3 P0 done ─────────────────────────────────────────────────► R4 (QA, README, demo)
```
Wave 1 (concurrent): R1, R2, R3. R2 starts with design foundation + landing, which needs nothing. Wave 2: R4, after the PM has reviewed R1-R3 P0 output. Max four roles; at most three heavy-build agents never build at the same time (14 GB RAM): each role is told one heavy build at a time.

## Shared conventions (standing rules, apply to every role)
- English everywhere: identifiers, strings, docs, replies.
- No comments in code (no block, line, JSDoc). Only exception: explicitly temporary scaffolding gets one line `// TEMPORARY — <what>; delete with <what>`.
- TypeScript strict: no `any`, no `@ts-ignore`, no non-null assertion to silence a real nullable. Rust: no `unsafe`, no floats, no `unwrap()` on user-controlled paths.
- No new dependency without asking: each handoff lists pre-approved dependencies; anything else goes to the PM.
- Use the installed skills named in each handoff's "Tools" section BEFORE writing the code they cover.
- Server Components by default in Next.js App Router; `use client` on leaves only. Every animation respects `prefers-reduced-motion`.
- Never read, write or echo `.env*` files or secrets; keys live only in the OS keychain via `near ... sign-with-keychain`.
- Never `git commit`, `git push`, destructive git; never `git add -A` / `git add .`.
- One heavy build at a time (14 GB RAM; `npm/pnpm/cargo` are already throttled by shims). Next.js: `experimental: { cpus: 4, workerThreads: false }`, `productionBrowserSourceMaps: false`; read `node_modules/next/dist/docs/` before Next code (this Next has breaking changes).
- Priorities: **P0** on the demo path and must work end to end; **P1** makes it credible; **P2** only if time remains. Nobody starts P1 while a P0 on the demo path is red.
- A role that needs a change to `contracts.md` or a file it does not own reports it back instead of diverging.

## Technology decisions (with sources)

| Decision | Reasoning | Source |
|---|---|---|
| Contracts: Rust, near-sdk 5.30.1 | `near-sdk-js` is archived/deprecated; only official SDK | brainstorm D1; 02 section 1 |
| SY = stNEAR itself, no wrapper | stNEAR is non-rebasing, price via `get_st_near_price` | brainstorm D2; 02 section 2 |
| Demo underlying = mock `mstnear` with Meta Pool's interface | real testnet stNEAR price is frozen (3.1987 since 2026-07-23) | brainstorm D3, E5, E17; 02 section 2 |
| Demo clock (`year_secs` compressed) | at ~4% real APY, a short series shows ~1e-6 yield; math is time-homogeneous | brainstorm D4; 03 F8 |
| Trading = offer book inside the vault (maker-priced, full fills, no fees) | smallest honest demo of forward-selling yield; no interest leakage; the PRD itself defers the time-decaying AMM to expansion; Pendle-style logit AMM is what the same-window competitor already ships, so it does not differentiate | brainstorm D7/D8; 03 R1 Option A |
| YT is the vault contract (NEP-141 with interest ledger); PT separate NEP-141 | interest must settle on every YT balance change | brainstorm D6; 03 F3 |
| Index = stNEAR price, 1e24, high-water mark; lazy settle | Pendle behaviour | brainstorm D5/D9; 03 F3 |
| Frontend: Next.js 16.4.5, React 19.3.1, Tailwind 4.3.5, TS 5.9.x | latest verified; TS 7 unverified with Next | 02 Recommendations |
| Wallet: `@hot-labs/near-connect` 0.12.0 + `near-api-js` 7.4.0, own client provider | docs' path; wallet-selector's README prefers HOT Connect; `near-connect-hooks` would duplicate the connector | 02 section 3 |
| No backend | views via FastNEAR RPC are enough; history optional | 02 section 4 |
| Tests: near-sandbox 0.4.0 + near-api 0.8 (or near-workspaces 0.24) | `cargo near new` template; both maintained | 02, 04 |
| Rejected: AMM (Ref SimplePool: constant product, no time input, YT interest leaks to the pool account; stable/rated pools are owner-only), `near-sdk-js`, `@near-wallet-selector`, key-handling NEAR MCP servers, a Node/Axum backend | see sources | brainstorm Options; 04 Rejected |

## Contradictions resolved
- Brainstorm repo layout (`apps/web`, `packages/sdk`, `contracts/`, `scripts/`) wins over the PM audit's earlier `app/` guess; `05-repo-audit.md` layout is superseded by `contracts.md` section 1.
- PRD lists trading as MVP but "time-decaying AMM" as expansion: resolved as offer book now, AMM later (PRD section 10 stays true).
- `near-dapp` skill suggests `near-connect-hooks`; research 02 shows it pins near-connect 0.11 and duplicates the connector: frontend writes its own provider. The skill is used for call formats only.
- Testnet RPC: brainstorm listed `rpc.testnet.near.org`; research 02 says only FastNEAR and `testnet-rpc.intea.rs` are in the docs table: FastNEAR primary, intea.rs failover.
- PRD note "the first ... on NEAR" vs research 03 F2: a public same-window competitor exists (`github.com/ayoubbuoya/exodus-near`, PT/YT on stNEAR/LiNEAR with a Pendle-style AMM, testnet stage, same hackathon). The brainstorm's D13 "to our knowledge" is tightened: see Positioning.
- Tooling agent suggested near-workspaces vs the skill's near-sandbox: R1 picks one and stays consistent.

## Positioning (all roles, README, X post, UI copy)
Do not claim "the first PT/YT protocol on NEAR". Truthful claims: yield stripping for NEAR liquid staking assets with **forward-selling future yield as the flagship flow**, a maker-priced offer book with no interest leakage, faithful Meta Pool stNEAR interface, honest labels (mock yield, demo clock, testnet, not audited). Re-check `exodus-near` before publishing.

## Unverified assumptions still standing
1. Whether the NEAR wasm VM rejects floating point (irrelevant: pricing is TS-only; on-chain math is integer).
2. Gas figures in `contracts.md` 3.3 are starting guesses; R1 measures and reports.
3. The vault can absorb ledger storage (pre-funded 20+ testnet NEAR from the faucet; if not, switch YT registration to explicit `storage_deposit` paid by users).
4. Wallet popups work with `@hot-labs/near-connect` 0.12 on testnet for Meteor/Intear (untested; Playwright cannot drive them). Fake mode is the guaranteed demo.
5. App Router SSR behaviour of near-connect (inferred from source): keep it client-only.
6. FastNEAR free limits; near-cli-rs faucet-sponsored account creation working today.
7. Satoshi font licence (Fontshare) and PT-ice/YT-pink colour convention (new, not from the reference).
8. Project MCP servers (`near-docs`, `context7`, `playwright`) load only in a new session after the user approves them; dispatched sub-agents may lack them and fall back to WebFetch/WebSearch and local tools.

## Demo path (defines P0): the one flow the judges see
Fake mode is the guaranteed path (no wallet needed); testnet mode is the same clicks with a real wallet (Meteor or Intear).
1. Open `/`. See the hero ("Split yield from principal. *Trade* either side."), the mstNEAR card labelled "mock yield — demo clock" with the live mainnet stNEAR reference price/APY, and the series card with a maturity countdown. Click "Launch app".
2. `/strip`: connect (fake: account switcher on Alice). Click "Get test mstNEAR" (100 mstNEAR arrive). Enter 10, see the PT and YT preview tiles (ice and pink), click "Strip mstNEAR". Stepper: sync index → register → deposit → success: PT and YT balances shown.
3. `/trade` → YT tab → "Sell future yield": choose 5 YT, drag the implied-APY slider, see the upfront mstNEAR preview, click "List".
4. Switch to Bob (fake) / second account or the seeded maker offer (testnet): `/trade`, click "Buy" on Alice's offer (or "Quick fill" on the best offer). Success toast with explorer link (testnet).
5. Switch back to Alice → `/portfolio`: PT balance, remaining YT, YT accrual ticking, sale credit → click "Withdraw"; mstNEAR balance rises by the ask.
6. Advance to maturity (fake: dev clock control; testnet: a series created with `pnpm new-series -- --minutes 10`). `/settle`: auto `settle` step runs; click "Redeem PT" (receives stNEAR at the frozen maturity index) and "Claim YT" (Bob claims the yield accrued since his fill; Alice's pre-fill interest stays hers).
7. End state on `/portfolio`: PT and YT zero, mstNEAR increased by principal plus yield; all five PRD success criteria are visible.

## Research index (`docs/research/`, five files, max)
| File | Read by | What it concluded |
|---|---|---|
| `01-design-system.md` | R2 (all), R4 (QA notes) | Dark-only void `#000`, pink `#FE3D70`, Satoshi + serif-italic accents, r32 hairline cards, house easing `cubic-bezier(.22,1,.36,1)`; replace WebGL with CSS/SVG/canvas-lite; PT = ice `#B3F4FF`, YT = pink; ready-to-paste tokens |
| `02-near-tech-stack.md` | R1, R3 (toolchain, versions), R2 (wallet), R4 | Version pins; testnet stNEAR frozen so mock; wallet = near-connect + near-api-js; FastNEAR RPC; no backend; hackathon facts |
| `03-protocol-prior-art.md` | R1 (F3, F5), R2 (R2, R3 sections), R4 (F2, F7, F8) | Pendle formulas verified; Option A offer book ranked first; competitor `exodus-near` found, "first" not supportable; demo-risk list |
| `04-tooling.md` | all roles ("Implications per role") | 5 NEAR skills + 3 MCP installed project-scope; what was rejected and why |
| `05-repo-audit.md` | PM, R3 | Greenfield; machine facts; layout superseded by `contracts.md` section 1 |
Also read: `docs/brainstorm/rhea-strip-mvp-architecture.md` (architecture, diagrams, evidence table), written by the sibling brainstorm agent; its locked decisions D1-D14 are adopted.

## Tooling summary
Skills (project scope, `.claude/skills/`): `near-smart-contracts`, `near-contract-audit`, `near-cli-rs`, `near-dapp`, `near-api-js`. MCP (`.mcp.json`): `near-docs`, `context7`, `playwright`. Needs the user: approve MCP servers in a new session; faucet funding; optional `CONTEXT7_API_KEY`; install `cargo-near` and `near-cli-rs` (contracts roles); Vercel deploy; X post; submission form.
