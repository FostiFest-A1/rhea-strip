# 02 — NEAR tech stack

Research date: 2026-11-09. Scope: verified facts about the stack for Rhea Strip (PT/YT on NEAR, stNEAR underlying). No architecture design here (see `docs/brainstorm/rhea-strip-mvp-architecture.md`). Citations: `[Sn]` points to the Sources section (all URLs read 2026-11-09 unless a different date is shown); `[CMD]` = output of a command I ran on 2026-11-09 (commands are listed in Sources). Anything without a citation is labelled Assumption. Items flagged **Recommendation** are mine, not vendor facts.

## Summary

1. **There is a real deadline.** The NEAR HACKATHON (nearhackathon.com) runs 2026-11-01 to **2026-11-14 23:59 UTC** (5 days from today); judging 16-18 Nov. Prize pool US$250k paid in NEAR: one US$55k grand prize + 13 tracks x (10k/3k/2k). Testnet-only projects are eligible in all tracks; code written since the 2026-10-19 announcement counts; public repo + public X demo post + form are required; Claude Code and Codex screen every submission first (runs the README). Rhea is listed as an ecosystem partner. Best-fit tracks: `defi` (Unstoppable DeFi) and/or `open`. [S1][S2]
2. **Toolchain is current and matches the local machine.** near-sdk 5.30.1 (MSRV 1.95), cargo-near 0.23.0, near-contract-standards 5.30.1; local rustc 1.99.1 is fine (cargo-near scaffold even references `rust-1.99.1`). `cargo-near` embeds wasm-opt (no separate `wasm-opt` binary needed). NEAR's docs and the scaffold now use `near-sandbox` 0.4.0 + `near-api` 0.8 for integration tests; `near-workspaces` 0.24.0 still ships and is maintained. [S3][S4][S5][S6][S7]
3. **Meta Pool stNEAR exists on both networks, but the testnet price is frozen.** Mainnet `meta-pool.near`, testnet `meta-v2.pool.testnet`; view `get_st_near_price()` returns a U128 string, yoctoNEAR per 1 stNEAR (decimals 24). Testnet price is `3.198752259237337...` and did not change in any sample from now back ~54 days; mainnet price moves in steps each epoch, ~3.9% APR by my measurement (docs claim "~10%" and "~12h epochs", both stale). A testnet yield-bearing mock with an owner-callable price bump is therefore needed for a demo where YT yield visibly accrues. [S8][S9][CMD]
4. **Wallet stack changed.** `@near-wallet-selector/*` is still published (10.1.4, Dec 2025) but its own README now recommends HOT Connect; NEAR docs use `@hot-labs/near-connect` (0.12.0) + `near-api-js` 7.4.0. NEAR Connect has no view-call support: use `near-api-js` `JsonRpcProvider.callFunction`. It touches `window`/iframes, so keep it in a `'use client'` provider. [S10][S11][S12]
5. **No backend needed for the demo.** Views + RPC cover quotes and balances. FastNEAR free RPC and Transactions API (testnet) answered without an API key; NearBlocks v1/v2 are being switched off (v1 already dead on testnet; mainnet 22 Nov 2026), use v3. [S13][S14][CMD]
6. **Version surprises:** Node 26.12.1 locally is fine for Next 16 (needs >=20.9) and near-api-js 7 (needs >=22.22.2); `typescript` latest is 7.0.2 (published today) but the official NEAR example is on 5.9.3; `near-connect-hooks` 1.1.6 pins `@hot-labs/near-connect ^0.11.1` so it will NOT dedupe with 0.12.0.

## Findings

### 1. Contract toolchain

**Versions (crates.io API, 2026-11-09) [CMD-A]:** near-sdk 5.30.1 (2026-11-05), near-contract-standards 5.30.1, near-workspaces 0.24.0 (2026-10-26), cargo-near 0.23.0 (2026-11-06), near-sandbox 0.4.0, near-api 0.8.7, near-primitives 0.38.0. GitHub releases confirm cargo-near-v0.23.0 and near-contract-standards-v5.30.1 [CMD-A]. near-cli-rs latest release v0.31.1 (2026-11-05) [CMD-A].

**Rust requirements.** near-sdk README: MSRV is 1.95.0 [S3]; crates.io metadata for 5.30.1 says `rust_version = 1.95` [CMD-A]. Install step is only `rustup target add wasm32-unknown-unknown` [S3][S5]. Local: rustc 1.99.1, cargo 1.99.1, targets `wasm32-unknown-unknown` and `wasm32v1-none` installed; `cargo-binstall` present; `near`, `cargo-near`, `wasm-opt` absent; node v26.12.1, npm 12.2.1 [CMD-B]. Newer rustc emits bulk-memory/nontrapping-float opcodes; cargo-near's source says nearcore accepts them from protocol version 84 and the near-sdk 5.30.1 manifest declares a `min_protocol_version` (>=84), so no rustc ceiling applies [S15]. Both testnet and mainnet report protocol_version 88 [CMD-C]. So rustc 1.99.1 is OK; the scaffold's own `rust-toolchain.toml` pins `1.95.0` (rustup would fetch it) and its reproducible-build image is `sourcescan/cargo-near:0.22.0-rust-1.99.1` [S5].

**cargo-near.** Install methods (README): prebuilt installer script (`curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/cargo-near/releases/latest/download/cargo-near-installer.sh | sh`), `npm install cargo-near`, or `cargo install --locked cargo-near` [S4]. NEAR docs quickstart uses the same installer for both `near-cli-rs` and `cargo-near` [S6]. Build: `cargo near build non-reproducible-wasm` (recommended for local dev); output in `target/near/<name>.wasm` [S4][S6]. cargo-near runs `wasm-opt -O` through the `wasm-opt-rs` crate as a post-step (changelog entry #231), i.e. no external binary [S15]. `cargo near new <name>` scaffold [S6]: `edition 2024`, `near-sdk = "5.30.1"`, dev-deps `near-sdk` (feature `unit-testing`), `near-sandbox = "0.4.0"`, `near-api = "0.8"`, `cargo-near-build = "0.11.0"`, `tokio`, `testresult`; release profile `opt-level = "z"`, `lto`, `panic = "abort"`, `overflow-checks = true` [S5].

**Integration tests.** NEAR docs (current) say: use `near-sandbox` to start a local node and `near-api` to create accounts, deploy, call; `sandbox.fast_forward(1000)` skips blocks (time travel); `patch_state` available; `cargo_near_build::build_with_cli` compiles the contract inside the test; call example `.call_function("method", json!({...})).transaction().gas(Gas::from_tgas(100)).with_signer(...).send_to(&network)`; `tx_outcome.logs()` for logs [S16]. `near-workspaces` (Rust) 0.24.0 was released 2026-10-26 (bumps to nearcore 2.14 stable) and README requires macOS/Linux x86 for sandbox tests [S7][CMD-A]. The JS `near-workspaces` on npm is 5.0.0 from 2025-03 (stale) [CMD-D]. Docs also list `near-mock` (in-process wasmtime runner, `cargo install near-mock`) as a fast alternative [S16].

**NEP-141 reference impl.** `near-contract-standards` 5.30.1, module `fungible_token` with files `core.rs core_impl.rs events.rs macros.rs metadata.rs receiver.rs resolver.rs storage_impl.rs` [CMD-E]. Behaviours read from source [S17]:
- `ft_transfer` and `ft_transfer_call` call `assert_one_yocto()` (caller must attach exactly 1 yoctoNEAR); `internal_transfer` requires sender != receiver and amount > 0.
- `ft_transfer_call` forwards all remaining gas to the receiver's `ft_on_transfer` (`with_unused_gas_weight(1)`) and reserves a static 5 TGas for `ft_resolve_transfer` (`GAS_FOR_RESOLVE_TRANSFER`). Resolver caps the refund by the original amount and by the receiver's current balance.
- `storage_deposit` / NEP-145: `StorageBalanceBounds` min == max (fixed per-account cost); `storage_unregister` and `storage_withdraw` need 1 yocto. Registering an account is required before it can hold the token.
- `FungibleTokenMetadata` (NEP-148): `spec` must be `"ft-1.0.0"`, fields `name, symbol, icon, reference, reference_hash, decimals`; `reference` and `reference_hash` must both be set or both unset; hash 32 bytes [S18].
- NEP-141 text: amounts are U128 strings; `ft_on_transfer(sender_id, amount, msg) -> unused amount as string`; `ft_resolve_transfer` must be callable only by self; promise failure reverts the transfer [S19].
- Security guidance in NEAR docs: in `ft_on_transfer` check `predecessor_account_id == expected FT contract`, else return `amount` (refund all); require 1 yocto on sensitive calls because function-call keys cannot attach deposits [S20][S21].

**Cross-contract pitfalls (NEAR docs) [S22][S23]:** caller and callback run in different blocks (typically 1-2 apart) and any public method can run in between (re-entrancy); there is no automatic rollback if the external call fails; deduct balances before sending (withdrawals), credit only after success (deposits); callbacks use `#[private]` + `#[callback_result] Result<T, PromiseError>`; gas for each hop is explicitly budgeted (`with_static_gas`).

**Gas and storage numbers [S24][S25]:** max 1 PGas (1000 TGas) attached per transaction across function calls; 1 TGas ~ 1 ms; min price 1 TGas = 0.0001 NEAR; unspent gas is refunded, with a "gas refund fee" defined since protocol v78 but currently 0 (planned `max(1 TGas, 5% of unspent)`). Storage staking: 1E19 yoctoNEAR per byte (100 KB per NEAR); an account holds 770 bytes free (covered by the 0.007 NEAR creation charge). Hence a ~250 KB wasm locks ~2.5 NEAR on the contract account (my arithmetic from the stated rate).

**Time.** `env::block_timestamp()` returns nanoseconds since Unix epoch (u64); `env::block_timestamp_ms()` exists; `env::epoch_height()` exists [S26][CMD-F]. Epoch length 43,200 blocks on both networks [CMD-C]. Testnet block time measured ~0.6 s from tx timestamps (4,631 blocks in 2,759 s) [CMD-G]; mainnet 0.5726 s/block measured over 259,200 blocks [CMD-H], so an epoch is ~6.9 h today (not 12 h).

**Testnet access.**
- RPC (NEAR docs provider table): FastNEAR `https://test.rpc.fastnear.com` (public, free tier, limit not published), NEAR `https://archival-rpc.testnet.near.org` ("severely rate limited"), Intear `https://testnet-rpc.intea.rs`, dRPC `https://near-testnet.drpc.org` [S27]. I called `status` on all of them plus `rpc.testnet.near.org` and `rpc.testnet.fastnear.com`: all returned `chain_id testnet`, version 2.14.0(-rc.5), heads within ~15 blocks [CMD-C]. `rpc.testnet.near.org` is NOT in the docs table (works today, treat as unlisted). Mainnet: `https://free.rpc.fastnear.com`, `https://rpc.mainnet.near.org` (not listed either), `https://rpc.intea.rs` all answered [CMD-C]. `archival-rpc.*.near.org` returned HTTP 429 after ~8 requests in a minute [CMD-I]. The docs example uses `test.rpc.fastnear.com` with no key; FastNEAR docs say one key works across RPC/APIs, browser keys are domain-restricted [S28]. No batch JSON-RPC (array body returns 400/-32700) [S27].
- Faucets: docs page offers a built-in faucet (native testnet NEAR only) and https://near-faucet.io (listed as "2 NEAR on Testnet (rate limited)"); near-cli `near create-account <name.testnet> --useFaucet`; Circle faucet 20 USDC on NEAR testnet every 2 h [S6][S29][S30]. near-faucet.io returned HTTP 200 [CMD-J].
- Accounts: named account `x.testnet` via faucet; sub-accounts only by their parent (`vault.alice.testnet` created by `alice.testnet`), parents have no control over children; account creation fee 0.007 NEAR [S24][S31].
- Explorers: `https://testnet.nearblocks.io` and `https://nearblocks.io` (HTTP 403 to curl, i.e. bot-protected, not down); `explorer.testnet.near.org` and `explorer.near.org` returned 200 [CMD-J]. The LiNEAR README still links `explorer.testnet.near.org` [S38] while NEAR docs link NearBlocks (`nearblocks.io/address/registrar`) [S31]. Prefer NearBlocks — Assumption that it renders in a browser (curl got 403).
- Testnet has no NEAR Intents deployment ("None exists or is planned") [S2 Q-007]. Mainnet cost is not reimbursed.

### 2. Meta Pool stNEAR (and LiNEAR)

**Addresses.** Meta Pool docs "NEAR Network": mainnet `meta-pool.near`; testnet `meta-v2.pool.testnet` (stNEAR NEP-141 + liquid staking contract); source `github.com/Meta-Pool/liquid-staking-contract`; mpDAO `mpdao-token.near`/`.testnet` etc. [S8]. Live checks via RPC `call_function` [CMD-K]:

| | mainnet `meta-pool.near` | testnet `meta-v2.pool.testnet` |
|---|---|---|
| `ft_metadata` | name "Staked NEAR", symbol STNEAR, `decimals: 24`, spec ft-1.0.0 | identical |
| `get_st_near_price` | `"1514411535945873749259456"` = 1.514411... NEAR | `"3198752259237337050198977"` = 3.198752... NEAR |
| `ft_total_supply` | 14,270,417 stNEAR (14270417177176560776510900158580) | 546,443 stNEAR |
| contract state | `get_contract_state`: 21,018 accounts, 586 staking pools | 2,314 accounts, 106 staking pools; `is_staking_paused=false`; owner `metadao.sputnikv2.testnet`; `get_reward_fee_bp`=400 |
| NEP-145 bounds | n/a checked via source | `{"min":"1250000000000000000000","max":"1250000000000000000000"}` (0.00125 NEAR) |

**Reading the price.** `get_st_near_price(&self) -> U128String`: "how many NEAR one stNEAR is worth", implemented as `amount_from_stake_shares(ONE_E24)`, so units are yoctoNEAR per 1e24 yocto-stNEAR; divide by 1e24 for a NEAR-per-stNEAR ratio [S8][S33]. `get_contract_state()` also returns `st_near_price`, `total_stake_shares`, `total_for_staking`, etc. [CMD-K]. The same value is available in one RPC view call (JSON args `{}`).

**Price accrual: stepwise per epoch, not continuous.** Source: `distribute_rewards(sp_inx)` asks each staking pool for its total balance and distributes rewards; comment says "Should be called once per epoch per sp... open to anyone", no-op if already asked this epoch [S33]. Mainnet samples (archival RPC `block_id`, price in NEAR) [CMD-L]: 259,200 blocks ago (~41.2 h) 1.514133585; 172,800 ago 1.514227371; 86,400 ago 1.514319784; 43,200 ago 1.514365889; 21,600 ago 1.514411039; now 1.514411536. Price jumps ~4.6e-5 per 43,200-block epoch and barely moves within an epoch (the 21,600-block-ago sample vs now differs by 5e-7). **APY (my computation):** +1.836e-4 relative over 41.23 h (timestamps from neardata block API) = ~3.9% APR (simple, annualised x212.6) [CMD-H][CMD-L]. Meta Pool docs say stNEAR accrues "every epoch (~12 hours)" and talk about "~10% native staking APY" [S34]: both stale versus measurement. Rhea's LST page says epochs are ~7 hours [S35].

**Testnet price is frozen.** Samples at 0, 21,600, 43,200, 86,400, 172,800, 259,200, 432,000, 604,800, 1,209,600, 1,814,400, 2,592,000, 5,184,000 and 7,776,000 blocks back (archival RPC) all returned exactly `3198752259237337050198977` [CMD-M]. At ~0.6 s/block the oldest sample is ~54 days back. The contract itself is alive: `meta-v2.pool.testnet` received a transaction as recently as 2026-11-09 13:15 UTC (a `nolossmeme` project's keeper/treasury calls) [CMD-N], and `is_staking_paused=false`. Why it is frozen is not established (Assumption: no keeper calls `distribute_rewards`, or the testnet pools it holds do not earn). Whether anyone can unfreeze it by calling `distribute_rewards` was NOT tested (I am read-only/no keys).

**Getting stNEAR on testnet.** Contract source: `#[payable] deposit_and_stake() -> U128String` mints shares to the caller, `min_deposit_amount` = 1 NEAR (state field `1000000000000000000000000`); `liquid_unstake`, `nslp_add_liquidity`, NEP-145 `storage_deposit` exist [S33][CMD-K]. Meta Pool's NEP-145 is a custom "empty" implementation: fixed 0.00125 NEAR, `storage_balance_of` returns Some when the account exists, and `storage_unregister` needs 1 yocto and a zero balance [S33]. Practical path = faucet NEAR (near-faucet.io, "2 NEAR, rate limited") then `deposit_and_stake` with >=1 NEAR; I have NOT executed it (Assumption that it works for a fresh account; the contract is not paused). The stNEAR contract is old near-sdk 3.x code (uses `ValidAccountId`); JSON interface is standard NEP-141 [S33].

**Other stNEAR facts.** Reward fee 400 bp on testnet [CMD-K]. Rhea's exchange has "Rated pools" for yield-bearing tokens (stNEAR, NEARX, LiNEAR paired with wNEAR) [S36]; Ref froze stNEAR once in Nov 2022 via the exchange "Frozen List" feature after a Meta Pool bug [S37].

**LiNEAR (short).** Mainnet `linear-protocol.near`, testnet `linear-protocol.testnet` (LiNEAR repo README); `ft_price` returns U128 string, decimals 24; live: mainnet `1430417388923754712337944` (1.4304), testnet `2284175768908950653602947` (2.2842) [S38][CMD-K2]. Whether the testnet LiNEAR price moves was not verified (archival RPC rate-limited me).

**Mock yield-bearing NEP-141 for testnet (Recommendation, not a vendor fact).** If the vault needs a moving price on testnet: deploy a mock "mock-stNEAR" using `near-contract-standards` `FungibleToken` + NEP-148 metadata (decimals 24), plus (a) `get_st_near_price() -> U128` with the same name and units as Meta Pool so the vault adapter is identical, (b) owner-only `bump_price(new_price)` or `set_apy_bps(bps)` with price = f(block_timestamp) so yield accrues continuously and demos can fast-forward, (c) a faucet-style `mint_for_demo` guarded by cap, (d) NEP-145 `storage_deposit`. The vault should keep the price source an init-time config (real Meta Pool on mainnet-like runs, mock on testnet) and mention in the README that testnet stNEAR's price is frozen (judges' AI screeners run the README).

### 3. Frontend / wallet stack

**Versions (npm registry, 2026-11-09) [CMD-D]:** `next` 16.4.5 (modified 2026-11-08; engines node >=20.9.0; peer react ^18.2 or ^19), `react` 19.3.1, `react-dom` 19.3.1, `tailwindcss` 4.3.5, `@tailwindcss/postcss` 4.3.5, `create-next-app` 16.4.5, `typescript` 7.0.2 (published today), `near-api-js` 7.4.0 (2026-10-23; engines node >=22.22.2; deps borsh 2, @noble/*, etc.), `@hot-labs/near-connect` 0.12.0 (2026-10-26; GitHub also lists v0.11.5 not on npm list), `near-connect-hooks` 1.1.6 (2026-03-12; deps `near-api-js ^7`, `@hot-labs/near-connect ^0.11.1`, `function-call-key-plugin`), `function-call-key-plugin` 2.2.0, `@near-wallet-selector/core` 10.1.4 (2025-12-04), `@near-wallet-selector/react-hook` 10.1.4. `@near-wallet-selector/near-wallet` carries an npm deprecation ("NEAR Wallet has been deprecated") [CMD-D]. Official example `near-examples/hello-near-examples/frontend` uses next 16.2.10, react ^19.2.7, near-api-js ^7.3.1, @hot-labs/near-connect ^0.11.4, function-call-key-plugin ^2.1.0, typescript 5.9.3, node >=22.22.2 [S39].

**Which wallet library.** NEAR docs "Wallet Login": `@hot-labs/near-connect` + `near-api-js`; "Unlike traditional wallet selectors" it loads wallet code from a manifest into sandboxed iframes [S10]. `near/wallet-selector` is not archived (last push 2026-03-01) but its README opens with a recommendation to move to HOT Connect (the NEAR Infra Committee/Foundation recommend it) [S11][CMD-O]. The connector's README says it has "Zero dependencies" and "Unlike near-wallet-selector, this library provides a secure execution environment" and supports `signAndSendTransaction` actions in the old wallet-selector action format or near-api-js action creators [S12]. Wallets listed in the connector manifest with `features.testnet = true`: Meteor, Intear, Ledger, Nightly, WalletConnect, Unity, Ethereum wallets, near-cli; `false`: Near Mobile; unset: HOT, MyNearWallet, OKX, Hana, Trezu [S12 manifest, CMD-P]. Use `new NearConnector({ network: "testnet" })` and optionally `features: {...}` to filter wallets [S10]. v0.12.0 release notes include a fix where MyNearWallet "silently routed testnet RPC calls to mainnet" when `providers` was an empty array, plus a security fix for AddKey permission escalation [CMD-Q].

**Vendor snippets (NEAR docs "Wallet Login", read 2026-11-09 [S10]):**

```bash
npm install @hot-labs/near-connect near-api-js
```

```tsx
import { NearConnector } from "@hot-labs/near-connect";
const connector = new NearConnector({ network: "testnet" });
connector.on('wallet:signIn', handleSignIn);
connector.on('wallet:signOut', handleSignOut);
const connectedWallet = await connector.connect();            // opens wallet modal
const accounts = await connectedWallet.getAccounts();
await connector.disconnect(wallet);                            // sign out
```

Call with deposit and gas (strings in yoctoNEAR / gas units; 30 TGas = `"30000000000000"`):

```tsx
const wallet = await connector.wallet();
const result = await wallet.signAndSendTransaction({
  receiverId: "hello.near-examples.testnet",
  actions: [{ type: "FunctionCall", params: {
    methodName: "set_greeting",
    args: { greeting: "Hello from NEAR Connect!" },
    gas: "30000000000000", deposit: "0" } }],
});
console.log("Transaction:", result.transaction.hash);
```

Multiple transactions in one prompt: `wallet.signAndSendTransactions({ transactions: [{ receiverId, actions: [...] }, ...] })` (docs example uses `deposit: "1"` for `ft_transfer`) [S10]. Because NEP-141 `ft_transfer_call` needs 1 yocto and the receiver needs `storage_deposit`, deposit flows are best batched as `[storage_deposit..., ft_transfer_call]` in one `signAndSendTransactions` call (my inference from [S10][S19]).

View call (NEAR Connect has no view support; docs say use near-api-js) [S10]:

```tsx
import { JsonRpcProvider } from "near-api-js";
const provider = new JsonRpcProvider({ url: "https://test.rpc.fastnear.com" });
const greeting = await provider.callFunction({
  contractId: "hello.near-examples.testnet", method: "get_greeting", args: {} });
const account = await provider.viewAccount({ accountId: "hello.near-examples.testnet" });
```

Official React provider pattern (hello-near-examples `near-provider.tsx`, copied in outline [S39]): memoised `NearConnector({network, providers: { mainnet: ['https://free.rpc.fastnear.com'], testnet: ['https://test.rpc.fastnear.com'] }})`, a `FailoverRpcProvider` over `JsonRpcProvider`s for views, `connector.getConnectedWallet()` on mount to restore the session, `connector.on('wallet:signIn'|'wallet:signOut')`, `callFunction` returning `getTransactionLastResult(result)`, default gas `'30000000000000'`, default deposit `'0'`. Optional function-call key at login via `function-call-key-plugin` (`createAccessKeyPlugin({ signIn: { contractId, methodNames, allowance: nearToYocto('0.25').toString() } })`, `await connector.use(plugin)` before `connect()`); those keys cannot attach deposits, so payable/1-yocto methods still go to the wallet [S10][S21].

**React hooks libraries.** `near-connect-hooks` 1.1.6 (third-party, Matias Benary): `NearProvider` + `useNearWallet()` returning `signedAccountId, loading, signIn, signOut, viewFunction({contractId,method,args}), callFunction({contractId,method,args,gas,deposit}), callFunctionRaw, signAndSendTransaction(s), getBalance, transfer, provider, connector`, defaults gas 30 TGas, deposit 0; ships no `"use client"` directive in `dist` [S40][CMD-R]. It depends on `@hot-labs/near-connect ^0.11.1` so a root install of 0.12.0 would create two copies (npm semver for 0.x caret) [CMD-D]. `@near-wallet-selector/react-hook` 10.1.4 exists for the older selector [CMD-D].

**SSR / Next.js.** The connector registers `window` listeners and posts to `window.parent` in its constructor guarded by `typeof window !== "undefined"` [CMD-R]; the official example is Next.js (pages router) with a provider in `_app.tsx` [S10][S39]. For App Router: put the provider in a client component (`'use client'`) and never import the connector in a Server Component (Assumption: derived from the above, not tested). Calls to read state can run on the server with plain `JsonRpcProvider`.

**near-api-js v7.** Current major 7 (7.4.0); exports `JsonRpcProvider`, `FailoverRpcProvider`, `getTransactionLastResult`, `nearToYocto`; view helper is `provider.callFunction`, account lookup `provider.viewAccount` [S10][S39]. v7 requires Node >=22.22.2 [CMD-D]. Older v2-v6 `Account/Contract` style APIs are not used in current docs.

### 4. Backend / indexing

- **None needed** for core demo: quotes are view calls on the vault/AMM (`get_return`-style views), balances are `ft_balance_of`, price is `get_st_near_price`. Anything history-like (portfolio P&L, tx list) can be derived from contract-side per-user state or the free APIs below.
- **FastNEAR** (docs index): REST families FastNear API (balances/NFTs/staking), Transactions API (history/receipts, `https://tx.test.fastnear.com`, `POST /v0/account` and `/v0/transactions`), NEAR Data API (`https://testnet.neardata.xyz`), KV FastData; auth = one API key (Bearer or `?apiKey=`), browser keys restricted by domain [S28][S41]. Observed: `POST https://tx.test.fastnear.com/v0/account {"account_id":"meta-v2.pool.testnet","limit":40,"desc":true}` returned 40 entries with timestamps and `POST /v0/transactions` resolved hashes to method names, all without a key; `https://test.api.fastnear.com/v1/account/<id>/full` also answered keyless [CMD-N][CMD-S]. Rate limits for keyless use are not published (Assumption: may be throttled).
- **NearBlocks API:** v1/v2 are being switched off on 2026-11-22; testnet is v3-only (v1 on `api-testnet.nearblocks.io` returned "retired on 2026-11-05") [S14][CMD-S]. `GET https://api.nearblocks.io/v3/accounts/{id}/txns?per_page=1` and the testnet equivalent returned data without a key; migration doc says the same `Authorization: Bearer <key>` auth applies when you have one [S14][CMD-S]. Free-tier limits not verified.
- **NEAR Lake:** `near/near-lake-indexer` last push 2025-03-13 (not archived), `near-lake-framework-rs` 2025-12-13; `near-indexer-for-explorer` archived (last push 2023-12-08) [CMD-O]. Lake reads from an S3 bucket (Assumption: needs AWS credentials/requester-pays; not verified) and is overkill for a 5-day demo. "Pagoda indexer": no current Pagoda-hosted indexer found in NEAR docs' data-infra listing I checked [S31 tree]; not verified further.
- **Minimal option (Recommendation):** zero backend; Next.js client reads via `JsonRpcProvider` (FastNEAR). If a history table is wanted, call FastNEAR Transactions API directly from the browser or from a Next.js route handler (keeps a key server-side), cache 15-30 s.

### 5. Hosting limits (Vercel Hobby, docs `last_updated 2026-09-16`) [S42][S43]

- Hobby = "restricted to non-commercial personal use only" [S43]; a hackathon demo is within that, a commercial launch is not.
- 100 deployments/day, 100 builds/hour, build time 45 min, 1 concurrent build, 100 MB static upload, 200 projects; Functions max duration 300 s (Fluid compute), 2 GB/1 vCPU; included allotments: 100 GB Fast Data Transfer, 1,000,000 function invocations/month; runtime logs kept 1 hour [S42][S43]. Nothing here constrains a read-only RPC-driven Next.js app.
- Hackathon rule: keep a hosted demo up until at least 2026-11-18, ideally 2026-11-25 [S2 Q-012]; a local-only demo is allowed with a reproducible README and a video [S2].

### 6. Hackathon and Rhea

**NEAR HACKATHON** (primary source `nearhackathon.com` and its machine-readable `HACKATHON.md`, read 2026-11-09) [S1][S2]:
- Window: starts 2026-11-01 00:00 UTC; development ends 2026-11-14 23:59 UTC; judging 2026-11-16..18; results by 2026-11-18 23:59 UTC. Announcement 2026-10-19: code written since then counts; earlier commits are "baseline" (Q-001). Single payment within 30 days, paid in NEAR; payout account must be a **mainnet** account (`name.near` or 64-char implicit) (Q-016, facts table).
- Prizes: Grand prize US$55k x1; per track 1st US$10k, 2nd US$3k, 3rd US$2k, 13 tracks; total US$250k [S1].
- Tracks (ids): `defi` Unstoppable DeFi, `thesis` Investment Thesis, `privacy`, `business`, `swarms`, `security`, `agents`, `realworld`, `games`, `nfts`, `memecoins`, `social`, `open`. DeFi: "exchanges, perps, lending, vaults and trading agents that settle across chains through NEAR Intents... Lean on: Trading, NEAR Intents, Chain Signatures"; the DeFi prompt example links the Rhea guide `guide.rhea.finance` [S1][S44]. Hints are not requirements; "Own contract on NEAR that fits the track is enough" (Q-011); testnet-only projects are eligible in all tracks (Q-010); NEAR Intents has no testnet (Q-007). A project can select several tracks.
- Judging: Claude Code and Codex screen first (does it run, does it match the README; they do not decide); human judges decide: Illia Polosukhin (NEAR), Eddy Lazzarin (a16z crypto), Mert Mumtaz (Helius), Avichal Garg (Electric Capital), Kain Warwick (Synthetix/Infinex), Haseeb Qureshi (Dragonfly), Stepan Gershuni (cyber•Fund). Criteria are not published; the site says previous NEAR hackathons evaluated technical implementation, design, impact, originality and sustainability [S1][S2 Q-017].
- Submission: public repo (with LICENSE, README written for a machine reader with "do X - see Y" steps), public X demo post (says built at NEAR HACKATHON, tags @NEARProtocol and #NEARHackathon, video or screenshots), form at `nearhackathon.com/#apply` or `POST https://nearhackathon.com/api/applications` (max 2 submissions per email; one per repo; 12,000-byte body; `idea` 20-2000 chars); fixes via `/request-changes` [S2]. An existing product on another chain is allowed but disclose it; only the NEAR integration built in the window is judged (Q-002).
- Ecosystem list on the site includes Rhea ("DeFi on NEAR"), NEAR Intents, Aurora, HOT, Trezu, etc. [S1].

**Rhea Finance (formerly Ref Finance).** Guide at `guide.rhea.finance` describes RHEA as "chain-abstracted liquidity solution"; REF/xREF were converted to RHEA; legacy contracts listed as no longer in use [S35][S45]. Contract list (mainnet) [S45]: exchange `v2.ref-finance.near` (AMM: swaps + liquidity; locked), DCL/concentrated `dclv2.ref-labs.near` ("Ref v2"; limit orders), farming `boostfarm.ref-labs.near`, lending `contract.main.burrow.near`, LST `lst.rhealab.near` (rNEAR), oracle `aggregate-oracle.near`, token `token.rhealab.near`. Testnet [S45]: exchange `ref-finance-101.testnet`, farming `boostfarm.ref-finance.testnet`, DCL `dclv2.ref-dev.testnet`. Pool types per the guide: Classic (x*y=k), Stable and Rated (Curve StableSwap variants; rated pools are for yield-bearing tokens with wNEAR), DCL ("RHEA v2", iZUMi discretized liquidity) [S36][S46]. I could not find the exchange contract repo: `github.com/ref-finance/ref-contracts` returns 404 and is not in the `ref-finance` org listing (org repos include `ref-ui`, `ref-sdk`, `rhea-sdk`, `burrowland`, `rnear-contract`, `token_locker`, ...) [CMD-T]. Exchange API basics (from the guide's CLI page [S47]): `storage_deposit` (0.1 NEAR example) registers a user; tokens are deposited into the exchange by `ft_transfer_call(receiver_id=exchange, amount, msg="")` with 1 yocto after the exchange is registered on the token (`storage_deposit` on the token); `add_simple_pool {tokens:[a,b], fee}` (example fee 25 = 0.3% total, attach 0.1 NEAR); `add_liquidity {pool_id, amounts}`, `get_pool`, `get_pools {from_index, limit}`, `get_deposits {account_id}`, `get_return {pool_id, token_in, amount_in, token_out}`, `swap {actions:[{pool_id, token_in, amount_in, token_out, min_amount_out}]}` (1 yocto), `withdraw {token_id, amount}`; non-whitelisted tokens need `register_tokens`; warning to always check storage deposit on token contracts before swaps/withdrawals. Whether a PT/YT market can plug in: a simple x*y=k pool for PT/stNEAR or YT/stNEAR can be created permissionlessly per `add_simple_pool` (inference from the doc, not tested on testnet) but constant product has no time decay; no time-decaying pool type appears in the guide. Rhea also has an RHEA SDK (`rhea-sdk`, pushed 2026-01-06) and a `CLMM Market Data API` [S45][CMD-T]; not evaluated.

## Recommendations

Pinned versions (as of 2026-11-09; pin exact in `package.json` / `Cargo.toml`):

| Item | Pin | Why / note |
|---|---|---|
| near-sdk (Rust) | `5.30.1` | current; MSRV 1.95 [CMD-A][S3] |
| near-contract-standards | `5.30.1` | NEP-141/145/148 reference impl, same release train [CMD-A] |
| near-workspaces (rs) | `0.24.0` (optional) | maintained, but scaffold/docs use near-sandbox+near-api [S5][S16] |
| near-sandbox / near-api (dev-deps) | `near-sandbox = "0.4.0"`, `near-api = "0.8"` (resolves 0.8.7), `cargo-near-build = "0.11.0"`, `tokio` | exactly the `cargo near new` template [S5] |
| Rust toolchain | local `rustc 1.99.1` (>= MSRV 1.95); target `wasm32-unknown-unknown` | scaffold pins 1.95.0 in `rust-toolchain.toml`; either keep or change channel to 1.99.1 [S5] |
| cargo-near | `0.23.0` | supports nearcore 2.14 [S15] |
| near-cli-rs (`near`) | `0.31.1` | deploy/call/create-account [CMD-A] |
| Client lib | `near-api-js@7.4.0` | docs' pairing with near-connect [S10] |
| Wallet lib | `@hot-labs/near-connect@0.12.0` | recommended by NEAR docs; fixes testnet RPC routing and AddKey escalation [S10][CMD-Q] |
| React glue | own provider copied from hello-near-examples (`near-provider.tsx`), NOT `near-connect-hooks@1.1.6` | the hooks lib pins `^0.11.1` and would duplicate the connector; acceptable as a shortcut if you pin it to `0.11.x` everywhere [CMD-D][S39] |
| next | `16.4.5` (App Router) | latest tag; engines node >=20.9 [CMD-D] |
| react / react-dom | `19.3.1` | [CMD-D] |
| tailwindcss | `4.3.5` with `@tailwindcss/postcss@4.3.5` | [CMD-D] |
| typescript | `5.9.x` | official NEAR example uses 5.9.3; npm `latest` is 7.0.2 (released today), Next 16.4.5 compatibility with TS 7 not verified [S39][CMD-D] |
| node | `22.x` LTS (>= 22.22.2); local 26.12.1 also satisfies engines | near-api-js 7 and the official example need >=22.22.2; Vercel runtime support for Node 26 not verified [CMD-D][S39] |
| Testnet RPC | `https://test.rpc.fastnear.com` primary, `https://testnet-rpc.intea.rs` as failover (use `FailoverRpcProvider`) | both in docs table and answered [S27][CMD-C] |

Install commands for what is missing locally (none run by me; sources are vendor docs):

```bash
# cargo-near (prebuilt, fastest)        [S4]
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/cargo-near/releases/latest/download/cargo-near-installer.sh | sh
#   alternatives: npm install cargo-near   |   cargo install --locked cargo-near
# near-cli-rs                           [S6]
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/near-cli-rs/releases/latest/download/near-cli-rs-installer.sh | sh
# wasm target already installed locally; wasm-opt NOT needed (cargo-near embeds wasm-opt-rs) [S15]
cargo near new rhea-strip-contracts            # scaffold, then: cargo test ; cargo near build non-reproducible-wasm
near create-account <name>.testnet --useFaucet # free testnet account  [S6]
```

Other recommendations:
- **Testnet stNEAR:** treat the live testnet stNEAR price as frozen; use a mock stNEAR with the same `get_st_near_price` interface and a controllable accrual (section 2), and keep a configurable price-source adapter so mainnet Meta Pool can be pointed at later. Document this in the README for the AI screener.
- **Fixture realism:** real mainnet yield is ~3.9% APR (~3.1e-5 per ~6.9 h epoch), so a mock that bumps the price by realistic amounts will make YT payouts look tiny in a demo; make the accrual rate a parameter.
- **Deposit UX:** one `signAndSendTransactions` batch for storage registration + `ft_transfer_call` with 1 yocto; require `assert_one_yocto` on vault `redeem/claim/withdraw`; check `predecessor_account_id` in `ft_on_transfer`; budget gas explicitly (`ft_transfer_call` leaves all remaining gas to the receiver; resolver reserves 5 TGas).
- **Hackathon logistics (deadline 2026-11-14 23:59 UTC):** select tracks `defi` and `open`; public repo + LICENSE; README with "do X - see Y" steps and the mock-price disclosure; X demo post with video; mainnet NEAR account for payout; submit once, early.
- **Backend:** none. Optional history via FastNEAR Transactions API from the browser/route handler.

## Implications per role

**Contracts engineer**
- Start from `cargo near new`; deps as in the table; build with `cargo near build non-reproducible-wasm`; unit tests with `near-sdk` feature `unit-testing`.
- Use `near-contract-standards::fungible_token::FungibleToken` for PT and YT (NEP-141 + NEP-145 + NEP-148 metadata, decimals 24 to match stNEAR); implement `FungibleTokenReceiver::ft_on_transfer` in the vault and check `env::predecessor_account_id()` equals the configured stNEAR contract; return the unused amount as U128.
- Read stNEAR via `ext_contract` call to `get_st_near_price` (returns U128 string, 24-decimal ratio) with a `#[private]` callback using `#[callback_result]`; plan for the price view call to cost its own gas hop. Cache the price in state on each interaction if the accounting needs a deterministic snapshot (my suggestion).
- Maturity from `env::block_timestamp()` (ns) — convert constants as `seconds * 1_000_000_000`; test with sandbox `fast_forward(blocks)`; one block is ~0.57-0.6 s, so 1 day ~ 145-150k blocks, which is slow to fast-forward: prefer a configurable short maturity or an owner-settable clock in the testnet build (Recommendation).
- Storage: each registered account costs 0.00125 NEAR on Meta Pool's stNEAR; on your own FT contracts min==max from `storage_impl.rs`; 1E19 yocto/byte contract storage; a ~250 KB wasm locks ~2.5 NEAR, plan faucet funding (2 NEAR per faucet request) or several deployer accounts.
- Re-entrancy: debit before sending (redeem/claim), credit after success (deposit); callbacks must refund on failure.
- Mock stNEAR contract as described in section 2 (owner `bump_price`, same view name).

**Frontend engineer**
- `npx create-next-app@16.4.5` (App Router, TypeScript 5.9, Tailwind 4); read `node_modules/next/dist/docs/` after install (project AGENTS.md says this Next has breaking changes; not checked by me because node_modules is absent).
- Wallet: own `'use client'` `NearProvider` modelled on `near-provider.tsx`, `@hot-labs/near-connect@0.12.0` + `near-api-js@7.4.0`; `network: "testnet"`; filter to testnet-capable wallets (Meteor, Intear, Nightly, WalletConnect have `testnet: true`); views via `JsonRpcProvider.callFunction`; writes via `wallet.signAndSendTransaction(s)` with string gas/deposit; sign-in state restore with `connector.getConnectedWallet()`.
- Format numbers as BigInt/strings (U128 amounts, 24 decimals, `nearToYocto`/`yoctoToNear` from near-api-js); never use JS `number` for yocto amounts (Assumption: standard practice).
- Explorer links: `https://testnet.nearblocks.io/txns/<hash>` (Assumption on URL shape).
- Hosting: Vercel Hobby is enough for the demo; hosted URL should stay up until at least 2026-11-18.

**QA / integration**
- Sandbox tests: `near-sandbox` 0.4.0 + `near-api` 0.8 (or `near-workspaces` 0.24.0); deploy vault + mock stNEAR + PT/YT; cover: `ft_on_transfer` from a wrong token contract (must refund all), `ft_transfer_call` failure/partial use paths, 1-yocto enforcement, storage-registration errors, re-entrancy between call and callback, rounding at U128 limits, `fast_forward` across maturity, price bump then claim.
- Testnet smoke: confirm `meta-v2.pool.testnet` `get_st_near_price` still equals `3198752259237337050198977` (frozen) before relying on it; RPC failover; faucet availability.
- Sandbox needs Linux x86 or macOS ARM64 and downloads the sandbox binary on first run (network access in CI) [S16][CMD-U].
- README must be runnable by an AI screener from a clean checkout (commands, expected outputs); include the "how to try" steps judges can follow [S2].

## Assumptions and open questions

1. Whether anyone can unfreeze the testnet Meta Pool price by calling the permissionless `distribute_rewards(sp_inx)`, and why it is frozen, is untested (I have read-only access, no keys). Whether `deposit_and_stake` currently works for a fresh testnet account was not executed.
2. Testnet LiNEAR price movement not verified (archival RPC returned HTTP 429).
3. Epoch length figure: epoch_length 43,200 blocks is from RPC; the ~6.9 h mainnet epoch uses 0.5726 s/block measured over 6 epochs; testnet ~0.6 s/block from 4.6k blocks only.
4. APR ~3.9% is a 41-hour sample of mainnet price vs. Meta Pool docs' "~10%"; real forward yield varies (Meta Pool charges a reward fee, 400 bp shown on testnet; mainnet fee not queried).
5. `typescript@7.0.2` compatibility with Next 16.4.5/Tailwind 4.3.5 and Vercel's Node 26 support are unverified; recommended pins are conservative guesses based on the official example.
6. App Router SSR behaviour of `@hot-labs/near-connect` is inferred from source (window guard) and the Pages-Router official example; not run.
7. FastNEAR keyless limits, NearBlocks v3 free-tier limits, Lake bucket access, and the status of any "Pagoda indexer" were not verified.
8. Rhea exchange contract source (`ref-contracts`) could not be located on GitHub under `ref-finance`; API facts come from Rhea's guide CLI page, which uses older `near call` syntax and may lag the deployed `v2.ref-finance.near`. Whether `add_simple_pool` is still permissionless on `ref-finance-101.testnet` and what its token whitelist rules are was not tested.
9. Hackathon judging criteria are not published; the list of five criteria is the site's description of previous NEAR hackathons.
10. Open: does the team want to target mainnet at all (payout needs a mainnet account; Intents has no testnet, so RWA/USDY/BUIDL via Intents cannot be demoed on testnet)? Does the PRD's "one maturity" deployment need its own sub-account naming scheme (e.g. `strip.<deployer>.testnet`)?
11. Vercel Hobby non-commercial limitation matters only after the hackathon.

## Sources

All read 2026-11-09 unless noted.

- [S1] NEAR HACKATHON site, https://nearhackathon.com (tracks, prizes, dates, judges, FAQ).
- [S2] https://nearhackathon.com/HACKATHON.md (rules Q-000..Q-017, submission API, facts table).
- [S3] near-sdk-rs README (MSRV 1.95.0, install), https://github.com/near/near-sdk-rs (via `gh api repos/near/near-sdk-rs/readme`).
- [S4] cargo-near README (installation methods, commands), https://github.com/near/cargo-near.
- [S5] `cargo near new` template: https://github.com/near/cargo-near/tree/main/cargo-near/src/commands/new/new-project-template (`Cargo.template.toml`, `rust-toolchain.toml`).
- [S6] NEAR docs quickstart, https://docs.near.org/smart-contracts/quickstart (source: https://github.com/near/docs `docs/smart-contracts/quickstart.mdx`, branch master).
- [S7] near-workspaces-rs README and CHANGELOG, https://github.com/near/near-workspaces-rs.
- [S8] Meta Pool docs, NEAR Network contracts, https://docs.metapool.app/master/for-developers/meta-pool-contracts/near-network.md.
- [S9] Meta Pool liquid staking contract, https://github.com/Meta-Pool/liquid-staking-contract.
- [S10] NEAR docs Wallet Login, https://docs.near.org/web3-apps/tutorials/wallet-login and https://docs.near.org/tools/near-connect (raw: near/docs `web3-apps/tutorials/wallet-login.mdx`, `tools/near-connect.mdx`).
- [S11] near/wallet-selector README, https://github.com/near/wallet-selector.
- [S12] HOT Connect README and manifest, https://github.com/hot-dao/near-selector (`README.md`, `repository/manifest.json`); docs also cite https://github.com/azbang/near-connect.
- [S13] FastNEAR docs index, https://docs.fastnear.com/llms.txt.
- [S14] NearBlocks API v3 migration, https://api.nearblocks.io/api-docs/migration.
- [S15] cargo-near-build source/CHANGELOG, https://github.com/near/cargo-near/tree/main/cargo-near-build (`src/near/build/mod.rs`, `CHANGELOG.md`), near-sdk `near-sdk/Cargo.toml` `[package.metadata.near]`.
- [S16] NEAR docs Integration Tests, https://docs.near.org/smart-contracts/testing/integration-test (near/docs `smart-contracts/testing/integration-test.mdx`); near-sandbox-rs README https://github.com/near/near-sandbox-rs.
- [S17] near-contract-standards FT source, https://github.com/near/near-sdk-rs/tree/master/near-contract-standards/src/fungible_token (`core_impl.rs`, `storage_impl.rs`).
- [S18] near-contract-standards `metadata.rs` (same dir).
- [S19] NEP-141, https://github.com/near/NEPs/blob/master/neps/nep-0141.md.
- [S20] NEAR docs Fungible Token Implementation (`ft_on_transfer`/`ft_resolve_transfer`), near/docs `smart-contracts/security/cross-contract-calls/ft-transfer-call.mdx`.
- [S21] NEAR docs Require one yoctoNEAR, near/docs `smart-contracts/security/one_yocto.mdx`.
- [S22] NEAR docs reentrancy/balance deduction, near/docs `smart-contracts/security/cross-contract-calls/reentrancy.mdx`.
- [S23] NEAR docs cross-contract calls, near/docs `smart-contracts/anatomy/crosscontract.mdx`.
- [S24] NEAR docs gas, near/docs `protocol/transactions/gas.mdx`.
- [S25] NEAR docs storage staking, near/docs `protocol/storage/storage-staking.mdx`.
- [S26] NEAR docs environment (`block_timestamp`, `epoch_height`), near/docs `smart-contracts/anatomy/environment.mdx`.
- [S27] NEAR docs RPC providers, https://docs.near.org/api/rpc/providers (near/docs `api/rpc/providers.mdx`).
- [S28] FastNEAR Auth & Access, https://docs.fastnear.com/auth.md; Transactions API https://docs.fastnear.com/tx.md.
- [S29] NEAR docs Token Faucet, near/docs `getting-started/faucet.mdx`.
- [S30] NEAR docs Hackathon Guide / awesome-near, near/docs `getting-started/hackathons.mdx`.
- [S31] NEAR docs account IDs, near/docs `protocol/accounts-contracts/account-id.mdx`; docs tree listing via `gh api repos/near/docs/git/trees/master?recursive=1`.
- [S32] (unused; reference removed)
- [S33] Meta Pool contract source `metapool/src/{lib.rs,owner.rs,distribute.rs,empty_nep_145.rs}`, https://github.com/Meta-Pool/liquid-staking-contract.
- [S34] Meta Pool docs "What is $stNEAR?", https://docs.metapool.app/master/meta-pool-by-chains/near-protocol/what-is-usdstnear.md.
- [S35] Rhea guide LST page, https://guide.rhea.finance/x-chain-guides/liquid-staking-tokens-lst.md.
- [S36] Rhea guide Stable & Rated Pools, https://guide.rhea.finance/near-chain-guides/liquidity-pools/stable-and-rated-pools.md.
- [S37] Rhea guide Contracts (Frozen List section), https://guide.rhea.finance/developers/contracts.md.
- [S38] LiNEAR README, https://github.com/linear-protocol/LiNEAR.
- [S39] near-examples/hello-near-examples frontend, https://github.com/near-examples/hello-near-examples/tree/main/frontend (`src/providers/near-provider.tsx`, `package.json`).
- [S40] near-connect-hooks README, https://github.com/matiasbenary/near-connect-hooks.
- [S41] FastNEAR docs: Transactions API, NEAR Data API (https://docs.fastnear.com/neardata.md).
- [S42] Vercel Limits, https://vercel.com/docs/limits (last_updated 2026-09-16).
- [S43] Vercel fair use guidelines, https://vercel.com/docs/limits/fair-use-guidelines.md.
- [S44] NEAR hackathon DeFi prompt, https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/01-defi.md.
- [S45] Rhea guide index and Contracts, https://guide.rhea.finance/llms.txt, https://guide.rhea.finance/developers/contracts.md.
- [S46] Rhea guide RHEA v2 Pools (DCL), https://guide.rhea.finance/near-chain-guides/liquidity-pools/rhea-v2-pools.md.
- [S47] Rhea guide CLI Trading (exchange API), https://guide.rhea.finance/developers-1/cli-trading.md.

Commands run (outputs observed 2026-11-09):
- [CMD-A] crates.io API `https://crates.io/api/v1/crates/{near-sdk,near-contract-standards,near-workspaces,cargo-near,near-sandbox,near-api,near-primitives}` and `https://crates.io/api/v1/crates/near-sdk/5.30.1`; `gh api repos/near/{near-sdk-rs,cargo-near,near-workspaces-rs,near-api-js,near-cli-rs}/releases/latest`.
- [CMD-B] `rustc -V; cargo -V; rustup target list --installed; node -v; npm -v; which near cargo-near wasm-opt cargo-binstall`.
- [CMD-C] JSON-RPC `status` against test.rpc.fastnear.com, rpc.testnet.near.org, rpc.testnet.fastnear.com, archival-rpc.testnet.near.org, testnet-rpc.intea.rs, near-testnet.drpc.org, free.rpc.fastnear.com, rpc.mainnet.near.org, rpc.intea.rs; `EXPERIMENTAL_protocol_config` on testnet and mainnet (protocol 88, epoch_length 43200).
- [CMD-D] `npm view <pkg> version|time.modified|deprecated|engines|dependencies|peerDependencies` for next, react, react-dom, tailwindcss, @tailwindcss/postcss, near-api-js, @near-js/*, @near-wallet-selector/*, @hot-labs/near-connect, near-connect-hooks, near-workspaces, typescript, create-next-app, function-call-key-plugin, cargo-near.
- [CMD-E] `gh api repos/near/near-sdk-rs/contents/near-contract-standards/src/fungible_token`.
- [CMD-F] `gh api repos/near/near-sdk-rs/contents/near-sdk/src/environment/env.rs` (block_timestamp, block_timestamp_ms).
- [CMD-G] FastNEAR Transactions API account history timestamps for `meta-v2.pool.testnet` (block 276924855 vs 276920224).
- [CMD-H] `https://mainnet.neardata.xyz/v0/block/{223771780,223512580}` header timestamps (148,424.7 s over 259,200 blocks).
- [CMD-I] archival-rpc HTTP 429 responses.
- [CMD-J] HTTP status of nearblocks.io, testnet.nearblocks.io, explorer.near.org, explorer.testnet.near.org, near-faucet.io.
- [CMD-K] RPC `call_function` (finality final) on `meta-pool.near` and `meta-v2.pool.testnet`: `get_st_near_price`, `ft_metadata`, `ft_total_supply`, `get_contract_state`, `is_staking_paused`, `get_owner_id`, `get_reward_fee_bp`, `storage_balance_bounds`, `get_contract_info`; [CMD-K2] same on `linear-protocol.near`/`.testnet` `ft_price`, `ft_metadata`, `ft_total_supply`.
- [CMD-L] archival RPC `block_id` price samples on `meta-pool.near` at 21,600/43,200/86,400/172,800/259,200 blocks back.
- [CMD-M] same on `meta-v2.pool.testnet` at 0 ... 7,776,000 blocks back (all equal).
- [CMD-N] FastNEAR `POST https://tx.test.fastnear.com/v0/account` and `/v0/transactions` for `meta-v2.pool.testnet` (40 recent txs, latest 2026-11-09T13:15Z).
- [CMD-O] `gh api repos/near/wallet-selector`, `near/near-lake-indexer`, `near/near-lake-framework-rs`, `near/near-indexer-for-explorer`.
- [CMD-P] manifest `features.testnet` values per wallet from `repository/manifest.json`.
- [CMD-Q] `gh release view v0.12.0 -R azbang/near-connect`.
- [CMD-R] `npm pack` of `near-connect-hooks@1.1.6` and `@hot-labs/near-connect@0.12.0` into the scratchpad and grep of `dist`/`build` for `"use client"` and `window` use.
- [CMD-S] `GET https://api.nearblocks.io/v3/accounts/...`, `https://api-testnet.nearblocks.io/v1/...` (retired message), `https://test.api.fastnear.com/v1/account/.../full`.
- [CMD-T] `gh api orgs/ref-finance/repos`, `gh api repos/ref-finance/ref-contracts` (404), `gh api orgs/rhea-finance/repos`.
- [CMD-U] near-sandbox-rs README requirement lines (Linux x86 / macOS ARM64, downloads binary automatically).
