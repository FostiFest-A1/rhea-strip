# 05 — Repo audit

## Summary
The repository is greenfield. It contains only `docs/Rhea_Strip_MVP_PRD.md` and one saved web page used as a visual reference. There is no `package.json`, no source, no git repo, no `.claude/`, no `.mcp.json` at the time of writing. Everything must be created by the roles, so path ownership has to be fixed up front (see handoffs/00-overview.md).

## Findings
- Directory listing 2026-11-09: `docs/Rhea_Strip_MVP_PRD.md` (8.4 KB), `docs/Backgrounds Supply ｜ ... .html` (2.9 MB), empty `docs/research/`, `docs/handoffs/`. Not a git repository (`git` reports none).
- Machine (command output, 2026-11-09): node v26.12.1, pnpm 11.4.0, rustc/cargo 1.99.1, rust targets installed: `wasm32-unknown-unknown`, `wasm32v1-none`, host. NOT installed: `near` (near-cli-rs), `cargo-near`, `wasm-opt`.
- Machine limit (user CLAUDE.md): 14GB RAM, 12 threads; `npm`/`pnpm`/`npx`/`cargo` are shimmed to 4 cores / 4GB Node heap. Do not run two heavy builds at once (cargo near build + next build in parallel).
- Next.js guard (repo AGENTS.md of the user's home): "This is NOT the Next.js you know" — read `node_modules/next/dist/docs/` before writing Next code; set `experimental: { cpus: 4, workerThreads: false }` and `productionBrowserSourceMaps: false`.
- The HTML reference is a single saved page; its extracted tokens live in `01-design-system.md`. Do not move or edit it.
- Contradictions across docs: only the PRD exists, so none yet. Known PRD gaps: (a) no AMM / pricing mechanism specified ("time-decaying AMM" is listed as future expansion, yet PT/YT trading is MVP); (b) no maturity length; (c) no yield accounting rule; (d) "first on NEAR" claim unverified (see `03-protocol-prior-art.md`).

## Recommendations
- Monorepo layout (final, see `docs/handoffs/contracts.md` section 1): `contracts/` (Cargo workspace), `packages/sdk`, `scripts/`, `apps/web`, `qa/`, `deployments/`, with a pnpm workspace at the root. This replaces an earlier `app/` guess.
- One role owns each root file. See ownership table in `docs/handoffs/00-overview.md`.

## Implications per role
- Contracts: bootstrap `contracts/Cargo.toml` workspace yourself; install `cargo-near` (see 02).
- Frontend: bootstrap `app/` with `create-next-app` equivalent via pnpm; nothing to reuse.
- QA/integration: nothing exists; builds against `contracts/` artefacts and `docs/handoffs/contracts.md`.

## Assumptions and open questions
- Assumes the user wants a single repo (not a monorepo tool such as turborepo). Chosen for speed.

## Sources
- `ls`, `rustc --version`, `node -v`, `pnpm -v`, `which near cargo-near wasm-opt` run at the repo root on 2026-11-09.
- `/home/cn/Projects/Competition/Web3/NEAR/Rhea/docs/Rhea_Strip_MVP_PRD.md`.
