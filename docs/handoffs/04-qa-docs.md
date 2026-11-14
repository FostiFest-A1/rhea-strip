# 04 — QA, docs, demo and submission pack (R4)

Dispatched LAST: after R1, R2 and R3 report their P0 deliverables (the PM tells you in the prompt which are in). You verify what exists; you never fix other roles' code. A failing check is a finding written to `docs/qa/report.md` with exact repro steps, and the PM routes it back to the owner.

## Context — read first
1. `docs/handoffs/contracts.md` — all sections (what the product must do).
2. `docs/handoffs/00-overview.md` — demo path (this is your acceptance test), positioning rules, standing rules.
3. `docs/brainstorm/rhea-strip-mvp-architecture.md` — "Handoff / Acceptance criteria", Risks, pre-mortem, Out of scope.
4. `docs/research/02-near-tech-stack.md` — section 6 (hackathon) and QA implications; `docs/research/03-protocol-prior-art.md` — F2 (positioning), F7 (hackathon), F8 (demo risks), "Implications per role / QA".
5. `docs/research/04-tooling.md` — "Implications per role / QA".
6. The repository as built: `contracts/`, `packages/sdk`, `scripts/`, `apps/web`, `deployments/`.

## Tools — skills and MCP
- MCP `playwright` (headless Chrome, isolated) for exploratory screenshots and console checks; `@playwright/test` (devDependency in `qa/`) for the committed specs, using `channel: "chrome"` (system Chrome, no browser download).
- Skill `near-contract-audit` as the acceptance checklist when reviewing `contracts/strip-vault` (read-only: you report, R1 fixes). Skill `near-cli-rs` / `near-api-js` to inspect deployed testnet contracts and replay `pnpm e2e:testnet`.
- Local: `design-review:design-review` (accessibility, responsive), `work:animation-qa` (reduced motion, performance), `vercel:verification`, `code-review`, `review-edge-case-hunter`, `investigate`.
- MCP `near-docs`/`context7` for facts. Never call `near-docs submit_feedback`.

## Owned paths
- `README.md`, `LICENSE`
- `qa/**` (its own `package.json` named `qa`, `playwright.config.ts`, `specs/**`)
- `docs/demo/**` (demo script, X post draft, shot list)
- `docs/qa/**` except `docs/qa/audit-strip-vault.md` (R1's)
- `docs/submission.md`
Never edit contracts, SDK, scripts, app code, root JS config (R3). If `qa/` needs a root-level script entry, ask the PM.

## Responsibilities
Prove the demo path works end to end, write the README a judge-agent can execute from a clean clone, and prepare the submission artefacts (demo script, X post, checklist). Report honestly: red is red.

## Scope
### In scope
README, LICENSE (MIT), Playwright specs on fake mode, exploratory QA on all routes, a11y/responsive/reduced-motion checks, contract review against the audit checklist (report only), replay of `pnpm e2e:fake` and (if deployed) `pnpm e2e:testnet`, demo script, X post copy, submission checklist, risk log.
### Out of scope
Fixing bugs in others' code; recording the video itself (script + shot list only); posting to X; filling the submission form; deploying the site (needs the user's Vercel account: list the exact steps in `docs/submission.md`); anything involving keys or `.env*`.

## Objectives
A judge agent (Claude Code or Codex) following only `README.md` can install, run the app and the e2e, and see the five PRD success criteria pass; a human judge can follow the demo script in three minutes.

## Requirements
- **P0** `README.md` (judge-agent friendly): one-paragraph pitch; what is real vs mocked (mock stNEAR with Meta Pool's interface, demo clock, offer book instead of AMM, testnet only) stated plainly; architecture diagram (mermaid, copy the topology diagram from the brainstorm section 7); prerequisites (node 22+, pnpm, rust 1.95+); exact commands "do X → see Y": `pnpm install`, `pnpm test:sdk`, `pnpm e2e:fake`, `pnpm dev` (fake mode, open `http://localhost:3000`), `pnpm build:contracts`, `pnpm test:contracts`, `pnpm deploy:testnet`, `pnpm e2e:testnet`; deployed contract ids and explorer links copied from `deployments/testnet.json` when `deployed: true` (otherwise a clearly marked TODO line the PM resolves); repo map; limitations and security notes ("not audited", mock yield); "NEAR's role" one-liner; positioning wording per overview.
- **P0** `LICENSE` MIT, holder "Rhea Strip contributors".
- **P0** `qa/` Playwright specs against `pnpm dev` (fake mode): the demo path as ONE serial spec (faucet → strip → list YT → Bob buys → Alice withdraws → advance fake clock → settle → redeem → claim) with assertions on visible balances; one spec per route for smoke (200, no console errors, key headings); viewport sweep 390/810/1200/1440 with no horizontal overflow; `prefers-reduced-motion: reduce` spec asserting no running CSS animations on the landing hero.
- **P0** `docs/qa/report.md`: table of every acceptance criterion from `01`, `02`, `03` handoffs (copy them) with PASS/FAIL and evidence (command + output excerpt or screenshot path under `qa/artifacts/`); explicit list of failures.
- **P1** `docs/qa/contract-review.md`: independent `near-contract-audit` pass over `contracts/strip-vault`, `mock-stnear`, `pt-token`: findings by severity with file:line.
- **P1** `docs/demo/demo-script.md` (3-minute script, per-second beats, what to click, what to say, fallback if the wallet popup fails), `docs/demo/x-post.md` (post copy with `@NEARProtocol` and `#NEARHackathon`, mentions video; no unverifiable claims), `docs/demo/shot-list.md`.
- **P1** `docs/submission.md`: checklist (public repo + README + LICENSE, X post, form with NEAR wallet address, hosted site kept alive until 2026-11-18, one submission), exact Vercel deploy steps for `apps/web` (root dir `apps/web`, install from repo root, env `NEXT_PUBLIC_RHEA_MODE=testnet`), things "Needs the user".
- **P1** Re-run everything after fixes the PM routes back and update the report.
- **P2** `qa/` spec that runs against a deployed URL (parameterised base URL).

## Dependencies
R1 (contracts), R2 (app), R3 (SDK, scripts, deployments) P0 delivered. Toolchain as the others: one heavy build at a time.

## Constraints
- English everywhere. No comments in any code you write (specs, config). Docs are prose.
- TypeScript strict, no `any`, no `@ts-ignore`.
- Pre-approved dependency: `@playwright/test` (dev, in `qa/package.json`) and `typescript`. Nothing else.
- Never read/write `.env*` or keys; never post, push or commit; never `git add -A`.
- Do not claim "the first PT/YT on NEAR" anywhere. Use the wording in the overview (a same-window public competitor, `ayoubbuoya/exodus-near`, exists).
- Screenshots and artifacts go under `qa/artifacts/` (gitignored by R3's `.gitignore`; if not ignored, ask the PM).
- Machine: 14 GB RAM; kill every dev server you start before finishing.

## Deliverables
- **P0** README.md, LICENSE, qa specs, `docs/qa/report.md`.
- **P1** contract review, demo script, X post, shot list, submission checklist.

## Acceptance criteria
1. A fresh reader executing only the README commands in order reaches a passing `pnpm e2e:fake` and a running `pnpm dev`; you executed those commands yourself and pasted the real output excerpts into `docs/qa/report.md`.
2. `pnpm --filter qa exec playwright test` passes (or each failure is recorded in the report with repro steps).
3. `docs/qa/report.md` contains every acceptance criterion of handoffs 01-03 with a verdict and evidence; no row left blank.
4. README states what is mocked; contains no claim contradicted by the repo (verify each command and path exists).
5. Demo script's click path equals the demo path in `00-overview.md`, and each step was exercised in the Playwright run.
6. No file outside Owned paths changed.
