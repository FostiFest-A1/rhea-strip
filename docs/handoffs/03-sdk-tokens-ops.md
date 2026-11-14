# 03 — SDK, token contracts, ops scripts (R3)

## Context — read first
1. `docs/handoffs/contracts.md` — sections 1, 2, 3.1, 3.2, 4, 5 are your spec (also 3.3-3.6 so the FakeChain and planner match the vault).
2. `docs/brainstorm/rhea-strip-mvp-architecture.md` — sections 5, 6 (frontend flow and tx orchestration rules), 10, and the Evidence table rows E3-E5, E11-E13, E17.
3. `docs/research/02-near-tech-stack.md` — pinned versions, `near-api-js` 7.x, `@hot-labs/near-connect` call formats, RPC endpoints (FastNEAR), faucet/account creation, near-sdk 5.30 notes.
4. `docs/research/03-protocol-prior-art.md` — R2 display formulas, F4 (Meta Pool price facts).
5. `docs/research/04-tooling.md` — Implications per role (contracts, QA).
6. `docs/handoffs/00-overview.md` — standing rules and conventions.

## Tools — skills and MCP
- Skill `near-smart-contracts` before writing `mock-stnear` and `pt-token` (NEP-141 via `near-contract-standards`, NEP-145, callbacks).
- Skill `near-api-js` before writing SDK RPC code and scripts (v7 API: `JsonRpcProvider`, `FailoverRpcProvider`, units helpers).
- Skill `near-dapp` — only to read the exact `signAndSendTransactions` action format of `@hot-labs/near-connect`, so `TxPlan` matches it byte for byte.
- Skill `near-cli-rs` for account creation (`sponsor-by-faucet-service` on testnet), deploy and call syntax. Use `sign-with-keychain` only.
- Skill `near-contract-audit` for a quick self-review of the two token contracts.
- MCP `near-docs`, `context7` for facts. Do not call `near-docs submit_feedback`.

## Owned paths
- `contracts/mock-stnear/**`, `contracts/pt-token/**`
- `packages/sdk/**`
- `scripts/**`
- `deployments/**`
- Root JS config: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `pnpm-lock.yaml` (generated)
Not yours: `contracts/Cargo.toml`, `contracts/strip-vault/**`, `contracts/tests/**` (R1), `apps/web/**` (R2), `README.md`, `qa/**` (R4). The workspace Cargo.toml already lists `mock-stnear` and `pt-token` as members; your crates must use package names `mock-stnear` and `pt-token` with `crate-type = ["cdylib", "rlib"]`.

## Responsibilities
1. Foundation others wait on: root pnpm workspace, `@rhea/sdk` skeleton with types and `FakeChain` (R2 builds the whole UI against it).
2. The two small Rust token contracts.
3. The testnet reader/planner of the SDK.
4. Ops scripts: deploy, new-series, seed-maker, keeper, e2e.

## Scope
### In scope
As above. Everything in `contracts.md` section 5, 3.1, 3.2.
### Out of scope
`strip-vault` (R1), UI (R2), README/demo/video (R4), fees, AMM, mainnet, any indexer/backend service, committing keys.

## Objectives
R2 can build every screen on FakeChain within the first working hour; R1 gets two token wasm files early; a judge can run `pnpm e2e:fake` with no wallet and `pnpm e2e:testnet` with a funded testnet account.

## Requirements
Phase 0 — unblock the team (do FIRST, within minutes)
- **P0** Root: `package.json` (private, `packageManager` pnpm 11.x as installed, scripts per `contracts.md` section 5 "Root scripts"), `pnpm-workspace.yaml` (`packages/*`, `apps/*`, `scripts`, `qa`), `tsconfig.base.json` (strict, ES2022, moduleResolution bundler), `.gitignore` (node_modules, .next, target, dist, `.env*`, `*.wasm` build output). Do not create `apps/web` (R2 does); the `pnpm dev` script is `pnpm --filter web dev` and may not work until R2 lands.
- **P0** `packages/sdk` skeleton: `package.json` (name `@rhea/sdk`, `exports` for `.`, `./pricing`, `./fake`, TS source consumed directly via `"types"` and `"default"` pointing at `src/*.ts` so Next can transpile it with `transpilePackages`), all types and interfaces from `contracts.md` section 5 exported, `pricing` module (pure, with vitest tests, section 4 formulas incl. the worked check), `deployments/testnet.ts` placeholder (`deployed: false`).
- **P0** `FakeChain` implementing section 3.3-3.6 semantics in bigint integer math (ported U256 via bigint), controllable clock, seeded accounts and offers, `FakeWallet`. `createClient({ mode: "fake" })` returns a `RheaClient` backed by it (planner emits the same `TxPlan` shapes as testnet, the fake wallet executes them). Report to the PM when Phase 0 is done (even if still running Phase 1) by naming it in your progress notes; the PM relays to R2.
Phase 1
- **P0** `contracts/mock-stnear` and `contracts/pt-token` per `contracts.md` 3.1/3.2 with unit tests (`cargo test -p mock-stnear -p pt-token`) and wasm build (`cargo near build non-reproducible-wasm`). Use `near-contract-standards` 5.30.1 FT with NEP-145 storage registration and NEP-148 metadata. Mock yield integer math in U256 (`uint` crate, pre-approved) — price never decreases, `set_apr_bps` settles accrual first, faucet cap 1000 per account.
- **P0** SDK testnet mode: `RheaReader` over JSON-RPC (`near-api-js` v7 `FailoverRpcProvider`, FastNEAR `https://test.rpc.fastnear.com` first, `https://testnet-rpc.intea.rs` second), `RheaPlanner` producing `TxPlan`s (registration batching, staleness-triggered `sync_index`, 1 yocto, gas values), `mainnetReference()` reading `meta-pool.near` `get_st_near_price` and a 30-day sample via FastNEAR archival (`https://archival-rpc.mainnet.fastnear.com`) for an APY estimate (cache 10 min; on failure return last known constants with `sampledAt` marked stale).
- **P0** `pnpm e2e:fake`: scripted run of the five PRD success criteria against FakeChain, prints a step table, exit code 0 on success.
Phase 2
- **P1** `scripts/deploy` (TypeScript, run with `tsx`): creates root + sub-accounts via near-cli-rs (`sponsor-by-faucet-service`, or reuse existing keychain accounts), deploys `mstnear`, `pt`, `strip`, initializes (`maturity_ms = now + minutes`, `year_secs 3600`, `apr_bps 800`), registers vault in token storage, funds `maker`, writes `deployments/testnet.json` and `packages/sdk/src/deployments/testnet.ts` with `deployed: true`. Requires R1's `strip_vault.wasm`; if absent, wait/poll up to 25 minutes, then report the blocker.
- **P1** `scripts/new-series` (`--minutes N`: redeploy a fresh vault+pt pair with a new maturity and update deployments), `scripts/seed-maker` (maker account strips and lists 1-2 YT offers and 1 PT offer at sensible asks), `scripts/keeper` (loop: `sync_index` every 15 s, `settle` once matured), `pnpm e2e:testnet` (five PRD criteria headless using two accounts, prints explorer links `https://testnet.nearblocks.io/txns/<hash>`).
- **P1** Run `deploy` for real on testnet if R1's wasm exists and account creation works; report resulting account ids. If faucet/account creation fails, report as a blocker with the exact error (do not hack around it).
- **P2** `pnpm e2e:testnet` retries/idempotence, keeper as systemd-less one-liner doc.

## Dependencies
- R1's `strip_vault.wasm` for deploy (P1 only).
- R2 consumes your SDK; R4 consumes your scripts.
- Tools missing on the machine: `cargo-near`, `near-cli-rs` (`cargo install --locked cargo-near near-cli-rs`; run ONE build at a time; R1 may be installing the same; check `which cargo-near near` first and wait for it rather than doubling).

## Constraints
- No comments in code, English only, TypeScript strict, no `any`, no `@ts-ignore`, no non-null assertion hiding a real nullable. Exception: one-line `// TEMPORARY — ...` for explicitly temporary scaffolding.
- Pre-approved JS dependencies: `typescript`, `vitest`, `tsx`, `near-api-js@7.4.0`, `@noble/hashes` only if needed, `zod` (boundary validation). Anything else: ask the PM.
- Never read/write `.env*`, never touch keys, never print secrets; keys live only in the OS keychain via `near ... sign-with-keychain`.
- `FakeChain` behaviour must equal the contract spec; if you find the spec ambiguous or wrong, report to the PM, do not diverge.
- No more than one heavy build at a time (14 GB RAM). Never `git commit/push`, never `git add -A`.

## Deliverables
- **P0** root workspace files; `packages/sdk` with types, pricing, FakeChain, client factory; `pnpm test:sdk` green; `pnpm e2e:fake` green.
- **P0** `contracts/mock-stnear`, `contracts/pt-token` with wasm.
- **P0** testnet reader/planner.
- **P1** `scripts/*`, `deployments/testnet.json`, testnet deploy executed.

## Acceptance criteria
1. `pnpm install && pnpm test:sdk` passes; tests cover pricing worked check (r=8%, tau=0.5, I=1.5144 -> pPT 0.9623, ask about 2.49 stNEAR per 100 YT) and the 3.4 vector (6.25 stNEAR).
2. `pnpm e2e:fake` runs strip -> list YT -> second account buys -> withdraw -> advance clock past maturity -> settle -> redeem -> claim, and asserts conservation (vault never pays out more than it holds) and attribution (seller keeps pre-fill interest).
3. `pnpm --filter @rhea/sdk exec tsc --noEmit` clean under strict; `grep -rnE '\bany\b|@ts-ignore' packages/sdk/src scripts` finds none.
4. `cd contracts && cargo test -p mock-stnear -p pt-token` passes; both wasm artefacts build; `get_st_near_price` is monotonic and matches the formula in `contracts.md` 3.1 in a unit test.
5. `TxPlan` action objects match the `@hot-labs/near-connect` `signAndSendTransactions` format (cite the doc line in your report).
6. Exported names and shapes equal `contracts.md` section 5 exactly (R2 compiles against them). Deviations are reported, not made.
7. (P1) `deployments/testnet.json` and `packages/sdk/src/deployments/testnet.ts` agree; `pnpm e2e:testnet` exits 0 against the real deployment, or the report states the precise blocker.
