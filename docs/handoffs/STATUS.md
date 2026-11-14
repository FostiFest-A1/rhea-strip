# Status

## Current step
Step 9 — handoffs written and self-checked (00, contracts, 01-04). Dispatching wave 1: R1, R2, R3. Wave 2: R4 after review.

## User overrides to the standard flow
- Max 5 research files in docs/research/ (no separate brief/synthesis files; synthesis lives in docs/handoffs/00-overview.md).
- User pre-authorised dispatch after handoffs are written and self-checked (no second approval gate).
- Sibling agent brainstorm-work writes docs/brainstorm/rhea-strip-mvp-architecture.md; align contracts with it before writing handoffs.

## Done
- Step 1 read PRD (docs/Rhea_Strip_MVP_PRD.md), 2026-11-09. Repo greenfield. Machine: node 26, pnpm 11, rust 1.99, wasm32-unknown-unknown installed, no near-cli / cargo-near.

## Agents
- design-system (adf8d0151d9497252), near-tech-stack (a3c0ca6834a498462), protocol-prior-art (aa4fc31365b271c1c), tooling (a9593b4a6b2bf8b9b): dispatched 2026-11-09, running.
- tooling returned 2026-11-09: 5 skills + 3 MCP installed, docs/research/04-tooling.md. PM reviewed .mcp.json and .claude/skills: ok.
- 05-repo-audit.md written by PM.

## Review
QA by R4 (2026-11-09; the QA report file could not be written by the agent, so results live here). `pnpm test:qa`: 49 passed, 1 failed (F-001), 7 skipped (deployed-site specs, need RHEA_BASE_URL). PM re-ran: pnpm test:sdk 20/20, pnpm e2e:fake OK, cargo test strip-vault 26 + mock-stnear 10 + pt-token 5, web typecheck + lint.
Acceptance: 01 contracts-vault 7/7 (3 by PM/R1 evidence); 02 frontend 8/8 (build to be run by PM); 03 sdk-tokens-ops 7/7; 04 qa-docs 6/6. Architecture handoff: 6 pass, 4 partial (accrual ticking F-001; testnet e2e not replayed / no hosted site; artefacts need the user).
Demo path (fake mode, qa/specs/demo-path.spec.ts): PASS, 9 serial steps; seller keeps pre-fill interest.
| ID | Sev | Owner | Finding |
|---|---|---|---|
| F-001 | Medium | R3 | YT accrual never ticks: fake keeper off by default (packages/sdk/src/fake/chain.ts:112), testnet index only moves on sync_index. Fix: enable keeper in fake mode; compute pending yield in position() against the live underlying price |
| F-002 | Low | R2 | /strip "You received" uses pre-sync index (15.1441 vs 15.1454 minted) |
| F-003 | Low | R2 | Demo clock panel covers Buy button at 1440x900 |
| F-004 | Low | R2 | UI shows PT-mstNEAR-09NOV26, chain symbol is ...09NOV2026 |
| O-1 | Obs | R2/PM | testnet mode: every app route needs a wallet (judge without wallet sees nothing); fake mode is the no-wallet path |
| O-2 | Obs | PM | series matures 2026-11-09T15:32:52Z: run pnpm demo:reset before the demo |
| O-3 | Obs | user | top up pt and mstnear accounts (~5 NEAR each) and root (~0.7 NEAR) |
| CR-1/CR-3 | Low | R1 | YT buy ledger entry without headroom check; new() accepts a past maturity (docs/qa/contract-review.md) |

## Blocked on the user
Nothing.

## Update 2026-11-09
- Research complete: 01 design (adf8..), 02 near-tech-stack (a3c0..), 03 protocol (aa4f..), 04 tooling (a959..), 05 repo audit (PM). All 5 files exist; no more research files.
- Brainstorm file read (docs/brainstorm/rhea-strip-mvp-architecture.md); D1-D14 adopted.
- Handoffs written: 00-overview, contracts, 01-contracts-vault, 02-frontend, 03-sdk-tokens-ops, 04-qa-docs.
- User pre-authorised dispatch; no gate.
- Wave 1 dispatched 2026-11-09: R1 contracts-vault (a4953a53494b16ad2, general-purpose), R3 sdk-tokens-ops (a13aa6143b4af5fe8, general-purpose), R2 frontend (ab390a2e1a45df805, me:frontend). Running. R4 held until R1-R3 P0 reviewed.
- R2 frontend (ab390a2e...) returned 2026-11-09: P0/P1/P2 done in fake mode; typecheck/lint/build pass per agent; PM grep checks (comments, any, use client on pages) pass. Testnet wallet path unverified (no deployment yet). Deviations: tailwind-merge and near-api-js dropped (ok), fallback to fake when deployed=false.
- R1 and R3 still running (cargo test rhea-tests in progress).
- R1 contracts-vault (a4953a53...) returned 2026-11-09: all P0/P1 + sweep_residual; Plan A green; 26 unit tests + 4 sandbox scenarios pass per agent; 3 wasm artefacts exist; PM grep checks (comments, float, unsafe) clean. Deviations recorded in contracts.md 3.7. PM re-run of cargo tests pending (R3 cargo busy).
- R3 still running (P1 scripts / token crate tests).
- R3 sdk-tokens-ops (a13aa614...) returned 2026-11-09: P0+P1 done; testnet deployed (root rhea-strip.testnet; mstnear/pt/strip/maker subaccounts), e2e:testnet exit 0 (13 txs); P2 not done. PM re-run: pnpm test:sdk 20/20, pnpm e2e:fake OK, cargo test strip-vault 26 + mock 10 + pt 5 pass, web typecheck+lint clean. Current deployed series already matured: needs fresh series before demo.
- Follow-ups: R3 (gas values per contracts.md 3.7, clippy allow, @types/node, .gitignore qa/artifacts, redeploy fresh series w/ latest vault wasm); R4 dispatched.
- Dispatched 2026-11-09: R3 follow-up (a91243987a08096a0: gas values, clippy allow, @types/node, gitignore, fresh 45-min series, demo:reset); R4 (ad2cc1ef8ac2cc432: README, qa specs, report, demo pack).
- Still to do after they return: PM walks demo path (fake) myself, runs pnpm build once for apps/web, R2 testnet-read verification pass against fresh series, final report. Needs the user: wallet pass (Meteor/Intear), Vercel deploy, X post, submission form, short-maturity series right before demo (pnpm demo:reset).
- R3 follow-up (a9124398...) returned: gas constants updated, clippy clean, @types/node, gitignore, test:qa, demo:reset script; fresh Active 45-min series (matures 2026-11-09T15:32:52Z) with 3 maker offers; e2e:testnet passed on a 12-min series (11 steps). Caveats: maker faucet cap reached (about 4 more resets possible), root account ~0.72 NEAR (needs faucet top-up), demo:reset script itself not run end-to-end (new-series --seed was).
- Waiting on R4 (ad2cc1ef...). PM build of apps/web deferred until R4 stops its dev server (shared .next dir).
- R4 qa-docs (ad2cc1ef...) returned 2026-11-09: README, LICENSE, qa specs (49 pass/1 fail/7 skipped), contract review, demo pack, submission checklist done; the QA report could not be written by the agent (harness refusal) so results are in the Review section above; README/submission links repointed to it.
- Fix round: R3 a7cf36f44484bd011 (F-001: Series.liveIndex, position pending vs live index) running; then R2 (F-001 consume liveIndex, F-002, F-003, F-004), then PM pnpm build + demo-path rerun (pnpm test:qa).
- R3 F-001 fix (a7cf36f4...) returned: Series.liveIndex added, position().ytPendingSy vs live index; test:sdk 22 pass, accrual spec passes. contracts.md updated. R2 fix round dispatched (a6d1b199fb1b43c5e): liveIndex consumer, F-002/3/4, O-1; will run typecheck/lint/build/test:qa.

## Final PM verification 2026-11-09
- R2 fix round done (F-001 consumer, F-002 partial: pre-submit preview in fake mode can differ ~3 units in the 4th decimal due to accelerated demo clock, post-tx card exact; F-003, F-004, O-1 done).
- PM re-ran: pnpm test:sdk 22/22, pnpm e2e:fake OK, web typecheck + lint clean, pnpm --filter web build OK (8 static routes), pnpm test:qa 50 passed / 7 skipped / 0 failed.
- Open: CR-1/CR-3 (low, contracts), wallet pass (Meteor/Intear), Vercel deploy, repo public, X post, form, top up pt/mstnear/root accounts, pnpm demo:reset before demo (maker has ~4 resets left), confirm README AI-disclosure wording. Not verified: sandbox rhea-tests re-run by PM, testnet reader of liveIndex against a real RPC, e2e:testnet re-run after F-001 change.
## Blocked on the user
Approve project MCP servers in a new session; faucet/top-ups; wallet pass; Vercel; X post; submission form.
