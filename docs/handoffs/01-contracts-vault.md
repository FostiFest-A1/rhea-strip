# 01 — Contracts: strip-vault (R1)

## Context — read first
1. `docs/handoffs/contracts.md` — sections 1-4 are your spec (interfaces, accounting, phases, offer book). Canonical.
2. `docs/brainstorm/rhea-strip-mvp-architecture.md` — sections "Spec 2-5, 8, 9" and risks (D1-D14 are locked).
3. `docs/research/02-near-tech-stack.md` — Findings on near-sdk 5.30.x, NEP-141/145 mechanics, gas, sandbox testing, pinned versions, install commands.
4. `docs/research/03-protocol-prior-art.md` — F3 (Pendle formulas), F5 (pitfalls and attack vectors).
5. `docs/research/04-tooling.md` — Implications per role, "Contracts engineer".
6. `docs/handoffs/00-overview.md` — shared conventions (read the standing rules).

## Tools — skills and MCP
Invoke these before writing the code they cover (do not work from memory):
- Skill `near-smart-contracts` — contract structure, `#[near]` macros, `store::` collections, NEP-141 receiver/callback patterns, gas, testing rules. Invoke before writing any contract code.
- Skill `near-contract-audit` — run its 14-detector checklist against `strip-vault` before declaring done; write results to `docs/qa/audit-strip-vault.md`.
- Skill `near-cli-rs` — only for command syntax (`near contract inspect`, deploy). Use `sign-with-keychain` only; never print or store keys.
- MCP `near-docs` (`search_near_docs`) for NEP text and the security checklist; MCP `context7` for crate docs (near-sdk, near-contract-standards, near-sandbox, near-api, uint). Do not call `near-docs submit_feedback`.
- Local: `code-review`, `review-edge-case-hunter` for a self-review pass. Ignore soroban/solana/stellar skills.

## Owned paths
- `contracts/Cargo.toml`, `contracts/rust-toolchain.toml`, `contracts/Cargo.lock`
- `contracts/strip-vault/**`
- `contracts/tests/**` (workspace member crate `rhea-tests`)
- `docs/qa/audit-strip-vault.md`
Do NOT touch `contracts/mock-stnear/**` and `contracts/pt-token/**` (R3). The workspace `members` must be `["strip-vault", "mock-stnear", "pt-token", "tests"]` so R3's crates join automatically; until they exist, build with `-p strip-vault`.

## Responsibilities
Implement the vault that strips stNEAR into PT + YT, is itself the YT NEP-141 with a per-account interest ledger, hosts the offer book, settles at maturity, and pays out redeem/claim/withdraw. Prove it with unit and sandbox tests, and deploy-ready wasm.

## Scope
### In scope
Everything in `contracts.md` section 3.3, 3.4, 3.5, 3.6: `new`, views, `sync_index`, `settle`, strip chain, `list_yt`, `list_pt`, buy, `cancel_offer`, `claim_yield`, `withdraw_sy`, redeem, YT NEP-141 (+ NEP-145 for YT holders, vault pays storage from its balance), NEP-297 events, error codes, U256 math, tests, audit checklist.
### Out of scope
- `mock-stnear`, `pt-token` crates (R3 builds them; you only call their documented interface in `contracts.md` 3.1, 3.2).
- Frontend, SDK, scripts, deploy script, README.
- Fees, AMM, merge (PT+YT -> SY), pre-maturity claim, partial fills, multiple series, upgradeability beyond owner-only redeploy, mainnet.

## Objectives
Contracts pass the five PRD success criteria in a sandbox: deposit stNEAR, receive PT+YT, trade independently (YT and PT offers filled by a second account), forward-sell yield with correct interest attribution, settle and redeem/claim at maturity.

## Requirements
Phase 1 (do these first, in this order)
- **P0** Create the workspace and `strip-vault` crate: near-sdk 5.30.1, `near-contract-standards` 5.30.1, `uint` (or `primitive-types`) for U256, `overflow-checks = true` in release profile. Pre-approved dependencies: those plus `serde`, `near-sandbox`, `near-api`, `tokio`, `anyhow` (tests) or `near-workspaces` (choose one stack, follow the `cargo near new` template, stay consistent).
- **P0** State, `new`, `get_series`, `get_position`, index handling (`sync_index` + high-water mark), `settle`, status derivation.
- **P0** YT ledger (`ledger.rs`): balances, locks, per-user index, `accrued_sy`, settle-before-change for both parties, NEP-141 `ft_transfer`/`ft_transfer_call` for YT honouring locks and the 120 s staleness rule, NEP-145.
- **P0** Strip chain (`ft_on_transfer` strip -> `get_st_near_price` -> `on_index` -> `pt.mint`), refunds on every failure path.
- **P0** Redeem (PT `ft_transfer_call` after Settled), `claim_yield`, `withdraw_sy` with rollback callbacks.
Phase 2
- **P0** `market.rs`: `list_yt`, `list_pt`, buy chain (pull price, settle both ledgers, move YT / pay PT, credit seller), `cancel_offer`, 5-offers cap, views.
- **P0** Sandbox integration tests (crate `contracts/tests`) running against R3's `mock-stnear` and `pt-token` wasm. If R3's crates are not present when you reach this step, poll `ls contracts/mock-stnear contracts/pt-token` every 60 s for up to 25 minutes; if still absent, report the blocker to the PM and keep working on unit tests.
- **P1** Plan B decision: if the async index chain is not green by the end of Phase 2, switch to stored-index mode (contracts.md 3.3) and report it to the PM; keep interfaces identical.
- **P1** Property test of the conservation invariant and "index never decreases"; rounding fuzz; `near-contract-audit` pass with fixes.
- **P1** Report measured gas for each entry point so the PM can update `contracts.md`.
- **P2** `sweep_residual`.

## Dependencies
- R3 delivers `contracts/mock-stnear` and `contracts/pt-token` (interfaces fixed in `contracts.md` 3.1/3.2). You depend on them only for integration tests.
- Toolchain: install if missing (`cargo install --locked cargo-near` and `cargo install --locked near-cli-rs`, both heavy: run ONE cargo build at a time; the shim limits cores). rustc 1.99.1 and target `wasm32-unknown-unknown` are installed. MSRV for near-sdk 5.30 is 1.95.

## Constraints
- Pins (from `02-near-tech-stack.md`): near-sdk 5.30.1, near-contract-standards 5.30.1, near-sandbox 0.4.0 + near-api 0.8 (or near-workspaces 0.24.0), cargo-near 0.23.0, near-cli-rs 0.31.1. Sandbox blocks take ~0.6 s and `fast_forward` is slow for long spans: initialise test vaults with a maturity a few seconds/minutes ahead and `fast_forward` only a few hundred blocks; never test with day-long maturities.
- No comments in code (not even doc comments). The one exception: scaffolding that is explicitly temporary gets exactly one line `// TEMPORARY — <what>; delete with <what>`.
- English identifiers, strings, docs.
- U256 for every mul-div; floor payouts; never float. No `unwrap()` on user-controlled paths. Callbacks never panic; every payout has a rollback.
- Check `predecessor_account_id` in `ft_on_transfer`; unknown token or bad `msg` -> return the full amount as unused. `#[private]` on callbacks, 1 yocto on `list_yt`, `cancel_offer`, `claim_yield`, `withdraw_sy`.
- Do not derive accounting from `ft_balance_of`.
- Never read/write `.env*`, keys, or print secrets. Testnet deploys use `sign-with-keychain`, and deploying is R3's job (scripts), not yours: you produce `contracts/target/near/strip_vault/strip_vault.wasm` via `cargo near build non-reproducible-wasm`.
- Machine: 14 GB RAM; never run two cargo builds at once; do not run builds while another agent builds (the shim throttles to 4 cores).
- Never run `git commit/push`; never `git add -A`.

## Deliverables
- **P0** `contracts/strip-vault` compiling to wasm, all P0 requirements implemented.
- **P0** `contracts/tests` sandbox suite covering: strip; two strippers at different indexes; list then fill YT with attribution (seller keeps pre-fill interest, buyer gets post-fill); PT list and fill; settle then redeem then claim; failure refunds (unregistered receiver, wrong token, malformed msg, below min_strip, after maturity); index never decreases; worked vector from contracts.md 3.4 (6.25 stNEAR).
- **P1** `docs/qa/audit-strip-vault.md` — checklist result with fixes applied; list of gas measurements; Plan A/B decision.
- **P1** Short `contracts/strip-vault/README.md` is NOT needed (R4 writes the README); instead end your final report with the exact build and test commands.

## Acceptance criteria
1. `cd contracts && cargo test -p strip-vault` passes (unit tests).
2. `cd contracts && cargo near build non-reproducible-wasm` for strip-vault succeeds and the wasm exists; `cargo clippy -p strip-vault -- -D warnings` is clean.
3. `cd contracts && cargo test -p rhea-tests` passes the scenarios listed under Deliverables (requires R3 crates).
4. The view/call names, argument names, JSON shapes, error codes, and event names match `contracts.md` exactly; any deviation is reported to the PM, not silently made.
5. `grep -rnE '//|/\*' contracts/strip-vault/src contracts/tests` shows no comment lines other than permitted `// TEMPORARY` lines (strings containing `//` such as URLs excepted).
6. No `unsafe`, no float types, no `unwrap()` outside tests.
7. `docs/qa/audit-strip-vault.md` exists and lists all 14 detectors with pass/fixed.
