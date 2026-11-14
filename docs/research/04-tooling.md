# 04 — Tooling

Researched and installed 2026-11-09, project scope only (`.claude/skills/`, `.mcp.json`). Nothing global was touched.

## Summary

- NEAR publishes official agent skills (`near/agent-skills`, MIT, pushed 2026-11-07, commit `cb32b6af`) and an official **Docs MCP** (`https://docs.near.org/mcp`, read-only, no auth). These are the backbone. NEAR's own "Tools for AI Agents" page recommends exactly this combination (CLI + skills + llms.txt/Docs MCP; the key-handling NEAR MCP is "optional").
- Installed 8 items: 5 vendor skills (contracts: `near-smart-contracts`, `near-contract-audit`, `near-cli-rs`; frontend: `near-dapp`, `near-api-js`) and 3 MCP servers (`near-docs`, `context7`, `playwright`).
- Every installed SKILL.md was read in full, plus all of near-dapp/near-contract-audit references, near-api-js `key_management.md`, and a pattern grep (curl/wget/sh/eval/keys/.env/exfil) over every installed file. One finding: `near-smart-contracts` told agents to pipe three remote installer scripts into `sh`; that block was **patched locally** (see Needs the user). No exfiltration, safeguard-disabling, or out-of-project instructions were found.
- No NEAR-specific skill/MCP exists for Meta Pool stNEAR or Rhea Finance (only docs repos). The contracts engineer must work from Meta Pool docs and the on-chain ABI via `near-docs`/`context7`/`near-cli-rs`.
- Gaps worth knowing: no NEAR-specific automated security scanner exists in any maintained skill set (Trail of Bits `building-secure-contracts` covers Algorand, Cairo, Cosmos, Solana, Substrate, TON but not NEAR). `near-contract-audit` is a manual checklist of 14 detector patterns.

## Installed

| Name | Kind | Source URL | Version / commit | Role | Used for |
|---|---|---|---|---|---|
| `near-smart-contracts` | skill (`.claude/skills/near-smart-contracts/`) | https://github.com/near/agent-skills/tree/main/skills/near-smart-contracts | near/agent-skills `cb32b6af` (2026-09-28), skill v1.0.0, near-sdk v5.x; locally patched | Contracts engineer | near-sdk v5 idioms (`#[near(contract_state)]`, `#[private]`, `#[payable]`, `store::` collections), NEP-141/297 patterns, cross-contract calls/callbacks (essential for PT/YT mint/redeem against stNEAR), yield/resume, upgrades/migration, gas, testing rules |
| `near-contract-audit` | skill | https://github.com/near/agent-skills/tree/main/skills/near-contract-audit | `cb32b6af` | Contracts engineer (self-review), QA | Checklist of 14 detectors (non-private callback, reentrancy, owner check, `assert_one_yocto`, storage collision, unsaved changes, unsafe/float math, gas griefing, storage-cost cover, etc.) with code examples; run before every testnet deploy |
| `near-cli-rs` | skill | https://github.com/near/agent-skills/tree/main/skills/near-cli-rs | `cb32b6af` (documents near-cli-rs v0.30.x) | Contracts engineer, QA | Exact one-liner `near ...` syntax: testnet account create via faucet, `contract deploy`, `call-function`, `ft_balance_of`/`storage_deposit`, `view-storage`, `inspect` |
| `near-dapp` | skill | https://github.com/near/agent-skills/tree/main/skills/near-dapp | `cb32b6af` | Frontend engineer | Wallet connection with `@hot-labs/near-connect` + `near-connect-hooks` (`NearProvider`, `useNearWallet`: `viewFunction`, `callFunction`, `signAndSendTransactions`), `create-near-app` Next.js template |
| `near-api-js` | skill | https://github.com/near/agent-skills/tree/main/skills/near-api-js | `cb32b6af` (near-api-js v7.x; npm 7.4.0 published 2026-10-23) | Frontend engineer, QA | v7 API (`JsonRpcProvider`, `Account`, `FungibleToken`, `nearToYocto`, `teraToGas`, typed `Contract` with ABI, NEP-413), FT storage-deposit flow, RPC endpoints; also usable in Node scripts/integration checks |
| `near-docs` | MCP, HTTP (`.mcp.json`) | https://docs.near.org/mcp (documented at https://docs.near.org/getting-started/tools-for-ai) | hosted by NEAR; probed 2026-11-09, tools: `search_near_docs`, `query_docs_filesystem_near_docs`, `submit_feedback` | All roles | Live, authoritative NEAR docs search (SDK, NEPs, security checklist, wallet connector, sandbox testing). Read-only except `submit_feedback` |
| `context7` | MCP, stdio (`.mcp.json`) | https://github.com/upstash/context7 (npm `@upstash/context7-mcp`) | pinned `4.6.0` (published 2026-11-09, repo MIT, 64k stars); handshake verified | Frontend engineer, contracts engineer | Current docs for Next.js, Tailwind, GSAP, Motion, near-sdk/near-workspaces crates, docs.rs-style lookups; complements the Next 16 "breaking changes" warning in AGENTS.md |
| `playwright` | MCP, stdio (`.mcp.json`) | https://github.com/microsoft/playwright-mcp (npm `@playwright/mcp`) | pinned `0.0.84` (Apache-2.0, 39k stars, pushed 2026-11-06); run with `--browser chrome --headless --isolated`; handshake verified | QA/integration, frontend engineer | Browser-based demo checks: load pages, snapshot accessibility tree, screenshots, console errors, responsive/animation sanity, scripted click-through of the non-wallet flows |

Resulting `.mcp.json` has no secrets and no `env` values.

## Rejected

| Found | Why rejected |
|---|---|
| `nearai/near-mcp` (https://github.com/nearai/near-mcp) | Official-ish but last push 2025-05-04; handles private keys by design ("run locally or on trusted infrastructure"); NEAR itself says coding agents with a terminal should use the CLI instead. Violates the key-handling rule. |
| `gluneau/near-mcp-server`, `mastrophot/near-wallet-manager` (registry), `bigguybobby/near-mcp-multisig` | Community, tiny or stale (2025 / 0 stars), wallet creation and transaction signing with keys in the server. Rejected. |
| `UnityNodes/near-pedia` MCP (https://github.com/UnityNodes/near-pedia, registry `io.github.UnityNodes/near-pedia`) | Created 2026-11-08, 0 stars, hackathon project, third-party remote endpoint (`near-pedia.xyz/mcp`). Not established; the official Docs MCP covers the need. Could be revisited if it proves useful. |
| `near/agent-skills` `near-kit` | Alternative TypeScript client by a different library; the stack is fixed on near-api-js + near-connect, so it would give agents two competing APIs. |
| `near/agent-skills` `near-intents`, `near-ai-cloud` | Cross-chain swaps and private AI inference; outside the MVP scope. |
| Trail of Bits `building-secure-contracts` / `rust-review` (https://github.com/trailofbits/skills, pushed 2026-11-06) | Well maintained but has no NEAR scanner (Algorand, Cairo, Cosmos, Solana, Substrate, TON only); `rust-review` is generic. Not installed to avoid redundant context. Revisit if the contracts engineer wants a second review pass. |
| skills.sh `elementalsouls/claude-bughunter@web3-audit`, `forefy/.context@smart-contract-audit`, `oimiragieo/agent-studio@building-secure-contracts`, `microck/ordinary-claude-skills@software-crypto-web3` | Low installs (23–308), unknown maintainers, EVM/generic focus; not vetted in depth because they do not meet the "vendor-maintained or clearly established" bar. |
| `vercel/next-devtools-mcp` (https://github.com/vercel/next-devtools-mcp, npm 0.4.0, 2026-06-24, last commit 2026-09-15) | Vendor-maintained and legitimate (proxies Next 16's built-in `/_next/mcp` for runtime errors/routes/logs), but dropped to stay at 8 installs: overlap with Playwright console output, the globally present Vercel plugin and Next's bundled docs in `node_modules/next/dist/docs/`. Best first add if the frontend engineer wants live runtime-error access: `claude mcp add --scope project next-devtools -- npx -y next-devtools-mcp@0.4.0`. |
| shadcn MCP / `shadcn` CLI MCP | Not installed; local `vercel:shadcn` skill covers component work. Not evaluated beyond that. |
| Stellar (`soroban`, `dapp`, `stellar-dev`) and Solana (`solana-dev`) skills already on the machine | Do not apply to NEAR; engineers should not invoke them. |
| Meta Pool (https://github.com/Meta-Pool) and Rhea Finance (https://github.com/rhea-finance) orgs | Searched for skills/MCP: none. Only docs sites and SDKs (`Meta-Pool/docs-metapool-app`, `rhea-finance/rhea-sdk-docs`, cross-chain SDKs unrelated to this MVP). |

## Needs the user

1. **New session + MCP approval.** Project-scoped MCP servers in `.mcp.json` require approval on first launch (accept the prompt or run `/mcp`). New skills load only in a fresh session started from the Rhea repo. `near-docs` was probed over HTTP and `context7`/`playwright` were handshake-tested over stdio, but none were run inside a Claude session by me.
2. **Optional secret, not set.** `context7` works without a key at a lower rate limit. If rate-limited, add the env var name `CONTEXT7_API_KEY` (and put the value in the user's shell, never in the repo). Not wired into `.mcp.json`.
3. **Local patch to `near-smart-contracts/SKILL.md`.** Upstream's Prerequisites block piped `rustup`, `cargo-near` and `near-cli-rs` installer scripts from the network into `sh`. It now says `cargo install --locked cargo-near` / `cargo install --locked near-cli-rs` and carries a "LOCAL PATCH" note. Re-running `npx skills add` or `update` will overwrite this patch; re-apply it. Installing those two crates is the contracts engineer's job (heavy build, not done here).
4. **Playwright uses system Chrome** (`/usr/bin/google-chrome-stable`, `--browser chrome --headless --isolated`), not the daily Brave and not a downloaded browser. Playwright cannot drive real wallet popups; wallet-connect flows need a manual pass or a mocked wallet.
5. **`near-docs` exposes `submit_feedback`,** which posts to the NEAR docs team. Agents should not call it unless the user asks. It was not blocked because I may not edit settings files.
6. **Testnet funding** needs a browser faucet (https://docs.near.org/getting-started/faucet.md; 5 testnet NEAR). The user (or QA via Playwright) must request it; keys go to the OS keychain only (`sign-with-keychain`), never into the repo or `.env`.
7. **Unverified / conflicts to resolve:**
   - The task brief says `near-workspaces` tests; the `near-smart-contracts` skill says tests should use `near-sandbox` + `near-api` (rule `testing-integration-tests`). `near-workspaces-rs` is still maintained (release `near-workspaces-v0.24.0`, 2026-10-26), so either works; the contracts engineer should pick one and stay consistent.
   - The `near-dapp` examples default to `network: 'mainnet'`. The frontend must set `testnet` explicitly.
   - Meta Pool stNEAR testnet contract ID and its exact interface (ft_price, `ft_balance_of`, deposit/withdraw semantics) were not confirmed; no skill covers it. Must be checked against Meta Pool docs and `near contract inspect`.
   - `near-cli-rs` skill documents plaintext-private-key and seed-phrase signing and key export; engineers must not use them in the repo or print keys.

## Implications per role

**Contracts engineer (Rust / near-sdk / NEP-141)**
- Start with `near-smart-contracts` (rules: `security-*`, `xcc-*`, `state-collections`, `upgrade-migration`, `best-contract-tools`, `testing-integration-tests`); scaffold with `cargo near new`, build with `cargo near build`.
- Before every testnet deploy run `near-contract-audit` against the contract, especially `non-private-callback`, `reentrancy` (update PT/YT/vault accounting before the stNEAR `ft_transfer_call`/`ft_transfer` promise), `yocto-attach` (`assert_one_yocto` on redeem/transfer), `storage-collision`, `cover-storage-cost`, `unsafe-math` (use integer math with `overflow-checks = true`; no floats for yield maths).
- `near-cli-rs` for testnet accounts, deploy, view/call, `contract inspect`/`view-storage`. Use `sign-with-keychain` only.
- `near-docs` for NEP-141/NEP-297 details and the security checklist; `context7` for crate docs (near-sdk, near-contract-standards, near-sandbox, near-workspaces).
- Already present globally: `rust-analyzer-lsp` plugin (use for navigation/diagnostics), `code-review`, `review-edge-case-hunter`. Ignore `soroban`, `solana-dev`, `stellar-*`.

**Frontend engineer (Next.js 16 App Router, Tailwind, animation)**
- `near-dapp` for `NearProvider`/`useNearWallet` wiring (client component only; keep it out of server render, see `work:nextjs-app-router`); `near-api-js` for typed contract view calls, units, FT storage-deposit and registration, error classes. Network must be `testnet`.
- `context7` and the bundled `node_modules/next/dist/docs/` (per AGENTS.md) before touching Next APIs; `near-docs` for wallet connector questions.
- Local skills to use: `work:reuse-first` and `work:ui-architecture` before building, `frontend-design:frontend-design`, `work:nextjs-app-router`, `vercel:nextjs`, `vercel:next-cache-components`, `work:react-components`, `work:typescript-types`, `vercel:shadcn`, `work:motion-react` / `motion-framer`, `work:gsap-react` / `gsap-skills:gsap-react` / `gsap-scrolltrigger`, `work:smooth-scroll`, `awwwards-hero`, `awwwards-sections`, `awwwards-motion`, `work:animation-qa` before shipping motion, `pixel-perfect` for matching the supplied HTML reference in `docs/`, `work:react-performance`.
- Use `playwright` to look at the result in a real browser.

**QA / integration**
- `playwright` MCP for headless screenshots, console errors, viewport sweeps, and click-through of read-only and mocked-wallet flows against `pnpm dev`.
- `near-contract-audit` as the acceptance checklist for contract PRs; `near-cli-rs` and `near-api-js` (Node script) to exercise deployed testnet contracts end-to-end (deposit stNEAR, split to PT/YT, redeem).
- Local: `design-review:design-review` (accessibility/responsive), `work:animation-qa`, `vercel:verification`, `code-review`, `review-edge-case-hunter`, `investigate`.

**PM**
- No installed tool is PM-specific. Use `near-docs` to confirm facts before writing handoffs, and the local `prd`, `product-brief`, `create-architecture` skills. Monkies task creation still follows the strict confirm-twice rule in the global instructions.

## Sources

All accessed 2026-11-09.
- NEAR agent skills repo: https://github.com/near/agent-skills (HEAD `cb32b6af195e636c1e9c2efe2ea75a6d85b6b67b`; `npx skills add near/agent-skills --list` showed 8 skills)
- skills.sh listing for `near/agent-skills`: https://skills.sh/near/agent-skills/near-smart-contracts (and `near-contract-audit`, `near-dapp`, `near-api-js`, `near-cli-rs`)
- NEAR "Tools for AI Agents": https://docs.near.org/getting-started/tools-for-ai.md
- NEAR docs index for LLMs: https://docs.near.org/llms.txt
- NEAR Docs MCP endpoint (probed with initialize + tools/list): https://docs.near.org/mcp
- MCP registry searches ("near", "near-pedia"): https://registry.modelcontextprotocol.io/v0/servers?search=near
- near-mcp (rejected): https://github.com/nearai/near-mcp
- near-pedia (rejected): https://github.com/UnityNodes/near-pedia
- Context7: https://github.com/upstash/context7, npm `@upstash/context7-mcp` 4.6.0
- Playwright MCP: https://github.com/microsoft/playwright-mcp, npm `@playwright/mcp` 0.0.84
- next-devtools-mcp: https://github.com/vercel/next-devtools-mcp, npm `next-devtools-mcp` 0.4.0
- Trail of Bits skills: https://github.com/trailofbits/skills (tree listing of `plugins/building-secure-contracts/skills/`)
- Tool maintenance checks via GitHub API: near/near-sdk-rs (release `near-contract-standards-v5.30.1`, 2026-11-05), near/cargo-near (pushed 2026-11-07), near/near-cli-rs (pushed 2026-11-09), near/near-workspaces-rs (`v0.24.0`, 2026-10-26), near/near-api-rs (2026-10-28); npm `@hot-labs/near-connect` 0.12.0 (2026-10-26), `near-connect-hooks` 1.1.6, `near-api-js` 7.4.0
- Meta Pool org: https://github.com/Meta-Pool; Rhea Finance org: https://github.com/rhea-finance
