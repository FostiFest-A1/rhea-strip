# Contract review (R4, independent pass)

Scope: `contracts/strip-vault/src` (lib, ledger, market, series, math, types, events), `contracts/mock-stnear/src/lib.rs`, `contracts/pt-token/src/lib.rs`, plus the deploy path in `scripts/src/near-cli.ts` and the live testnet accounts (read-only RPC views). Method: the `near-contract-audit` 14-detector checklist applied by reading the source (not by trusting `docs/qa/audit-strip-vault.md`), a manual trace of every cross-contract chain, and read-only inspection of the deployed accounts on 2026-11-09. R4 did not run cargo (no cargo builds allowed for this role): test results quoted here come from the PM's re-run in `docs/handoffs/STATUS.md`. This is not a third-party audit.

Result: no High or Medium contract findings. Two operational risks (Medium, not code defects) and eight Low or Info items. Nothing here blocks the testnet demo; the two operational risks should be handled before public judging.

## Detector checklist (independent)

| # | Detector | Result | Evidence |
|---|---|---|---|
| 1 | `non-private-callback` | pass | Every callback in `strip-vault` carries `#[private]`: `on_pt_metadata` (lib.rs:130), `on_strip_index` (142), `on_strip_minted` (179), `on_sweep_balance` (215), `on_sweep_done` (245), `on_redeem` (256), `on_sync_index` (series.rs:101), `on_settle` (130), `on_claim` (ledger.rs:243), `on_withdraw` (281), `ft_resolve_transfer` (344), `on_buy_yt` (market.rs:245), `on_buy_pt` (277), `on_cancel_pt` (295). Both token contracts mark `ft_resolve_transfer` private |
| 2 | `reentrancy` | pass | Payouts deduct state before the outgoing `ft_transfer` and restore in the callback on failure: redeem (lib.rs:316-317 then 256-277), claim (ledger.rs:208-214 then 243-260), withdraw (266-269 then 281-293), sweep (lib.rs:230-231 then 245-253), PT cancel (market.rs:190 then 295-333). Deposit paths credit only after the external effect succeeds (`on_strip_minted`, `on_buy_pt`) |
| 3 | `incorrect-argument-or-return-types` | pass | Amounts, indexes, ids and timestamps are `U128`/`U64` on the wire. `from_index`, `limit` and `open_offers` are native `u64` as fixed by `contracts.md` 3.3 (small values, no precision risk) |
| 4 | `unsaved-changes` | pass | `store::` collections: every mutated value is re-inserted (`accounts.insert` after each ledger edit) or edited via `get_mut` inside a method that returns normally |
| 5 | `owner-check` | pass | `sweep_residual` requires `predecessor == owner` (lib.rs:203); `cancel_offer` requires `offer.seller == caller` (market.rs:188); `mock-stnear.set_apr_bps` owner only (lib.rs:145); `pt-token` `mint` and `burn` require the minter (lib.rs:89-91). No other privileged method exists |
| 6 | `yocto-attach` | pass | `assert_one_yocto` on `list_yt`, `cancel_offer`, `claim_yield`, `withdraw_sy`, `sweep_residual`, YT `ft_transfer`, `ft_transfer_call`, `storage_withdraw`, `storage_unregister`. `sync_index` and `settle` are intentionally permissionless and non-payable |
| 7 | `storage-collision` | pass | `StorageKey` enum with four distinct prefixes in the vault, one per token contract |
| 8 | `required-initialization-macro` | pass | `new` is `#[init]` and the state structs derive `PanicOnDefault`. The deploy script uses `deploy ... with-init-call` (near-cli.ts:103-125), so deploy and `new` are one transaction and there is no initialisation front-running window |
| 9 | `gas-griefing` | pass | The only loop over user-sized data is `release_yt_offers`, bounded by the 5-offer cap. `get_offers` is a paginated view (see CR-7) |
| 10 | `insecure-random` | pass | No randomness |
| 11 | `prepaid-gas` | pass | Every promise in the strip, buy, redeem, claim and withdraw chains reserves static gas for its callback (`GAS_MINTED`, `GAS_PAYOUT_CALLBACK`, `GAS_SYNC_CALLBACK`), and `ft_transfer_call` on the YT side enforces `prepaid_gas > 30 TGas` (ledger.rs:315-318) |
| 12 | `cover-storage-cost` | pass with findings | Ledger and credit entries are paid by the vault; mitigations exist for strip and PT buy (`has_headroom`) but not everywhere: see CR-1, CR-2, OP-1, OP-2 |
| 13 | `unsafe-math` | pass | `overflow-checks = true` in the release profile; every mul-div goes through U256/U512 (`math.rs`), payouts floor, no `unsafe` in any crate (grep clean) |
| 14 | `float-math` | pass | No `f32`/`f64` in any contract (grep clean) |

Hygiene checks run by R4: `grep -rnE '//|/\*'` over all contract crates returns nothing (no comments); no `unsafe`; no float types; no `unwrap()` outside `strip-vault/src/tests.rs`.

## Operational risks (read from the live testnet accounts)

| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| OP-1 | Medium | The `pt` and `mstnear` accounts have very little free NEAR to pay for the accounts they auto-register. `pt-token.mint` registers the receiver at the token contract's expense (pt-token/src/lib.rs:56-58) and `mock-stnear.faucet` does the same (mock-stnear/src/lib.rs:131-133). Free balance is about 0.15 NEAR on `pt.rhea-strip.testnet` and 0.20 NEAR on `mstnear.rhea-strip.testnet` (balance minus `storage_usage` x 1e19 yocto), roughly 100 to 200 new accounts before `mint` or `faucet` start failing with `LackBalanceForState` (a failed mint refunds cleanly with `E_MINT_FAILED`, lib.rs:181-184; a failed faucet reverts) | RPC `view_account` on 2026-11-09: `pt` 1.77 NEAR with 162,289 bytes; `mstnear` 2.01 NEAR with 181,407 bytes; `strip` 4.43 NEAR with 323,270 bytes (free about 1.19 NEAR, enough for hundreds of ledger entries) | Top up `pt` and `mstnear` by 5 NEAR each from the faucet before the judging window (needs the user) |
| OP-2 | Medium | Every contract account holds a single FullAccess key (RPC `view_access_key_list`). The key holder can redeploy code or move the vault's funds. Fine for a testnet demo, but the system is not trust-minimised and the README must keep saying so | RPC on `strip`, `pt`, `mstnear`, `maker`: one `FullAccess` key each | Keep the "testnet only, not audited" wording; before any mainnet step, lock the keys (delete or move to a multisig) |

## Findings

| ID | Severity | Where | Finding | Suggested action |
|---|---|---|---|---|
| CR-1 | Low | market.rs:269 -> ledger.rs:95-96, 53 | A YT buy creates the buyer's ledger entry at the vault's expense (`move_locked_yt` calls `settle_account(to)`, which inserts the account) and `has_headroom()` is not checked on this path (it is checked in `on_strip_index`, lib.rs:158, and for PT buys, market.rs:124). A griefer can list 1-yocto-ask YT offers and fill them from many fresh accounts; each costs the vault about 0.001 NEAR of storage for roughly the same amount in gas | Call `has_headroom()` in `start_buy` for `OfferKind::Yt` as well (refund `E_STORAGE_LOW`), or require the buyer to be registered |
| CR-2 | Low | strip path, lib.rs:158 | `has_headroom()` protects the vault's balance only. The matching cost on `pt` (auto-registration) is not visible to the vault, so a drained PT token account makes `mint` fail after the price fetch (clean refund, wasted gas, see OP-1) | Documented limit; pre-fund (OP-1). Optionally have the vault read `pt` headroom |
| CR-3 | Low | lib.rs:67-76 | `new` accepts `maturity_ms` in the past (only `year_secs > 0` and `min_strip > 0` are checked), producing a series that is born `Matured` | `require!(maturity_ms > env::block_timestamp_ms())` in `new` (the deploy script already computes a future maturity) |
| CR-4 | Info | series.rs:27-43, 93-110, 143 | `sync_index` is allowed after maturity and before `settle`, so a late `settle()` freezes a higher `maturity_index`. In NEAR terms PT is unharmed (it redeems the same value at the frozen index) but YT keeps earning until someone settles. With the demo clock (1 real hour = 1 protocol year at 8%) a series left unsettled for a day accrues about 190% extra yield to YT. This is documented behaviour (Pendle-style) and the app settles on entry to `/settle`, but a judge opening a stale series sees very large claims | Run `pnpm keeper` during the judging window (it settles within 15 s of maturity); mention it in the demo notes |
| CR-5 | Info | ledger.rs:380-391 | In `ft_resolve_transfer`, if the YT sender has unregistered (`storage_unregister` after emptying the account) the refund path burns the returned YT instead of crediting it, which leaves `pt_supply > yt_supply`. No funds are lost from the vault, but the burned YT's interest stays in the vault | Edge case; either forbid `storage_unregister` while a `ft_transfer_call` is in flight or re-register the sender in the resolver |
| CR-6 | Info | market.rs:286-291 | The `None` branch of `on_buy_pt` (offer vanished) would refund the buyer's payment after the PT already moved. It is unreachable today because a `pending` offer cannot be cancelled or bought twice | Keep the invariant covered by a unit test |
| CR-7 | Info | market.rs:225-239 | `get_offers` collects and sorts every open offer on each call. Offers are capped at 5 per account but not in total, so view gas grows with the number of accounts | Fine for the demo; add an offset index if the book grows |
| CR-8 | Info | ledger.rs:454-467 | `storage_unregister` panics with `E_INSUFFICIENT_YT` for a non-empty account (the code means "not enough YT" elsewhere) and ignores `force`; `storage_deposit` ignores `registration_only` | Cosmetic: pick an error code for "account not empty" |
| CR-9 | Info | pt-token lib.rs:68-79; lib.rs:259-262 | PT `burn` after a redeem payout is fire-and-forget (`.detach()`). A failed burn leaves PT in the vault's balance and inflates `ft_total_supply` of PT without affecting vault accounting | Accepted by R1; mention in docs |
| CR-10 | Info | mock-stnear lib.rs:122-142 | Faucet cap is per account, and accounts are free, so supply is unbounded. Intentional for a mock; it must never be mistaken for a real asset | Labelled "mock" everywhere in the UI and README |

## What was confirmed to be correct

- Accounting: strip mints `floor(sy * I / 1e24)` PT and YT and credits `total_sy`; accrual uses a 512-bit intermediate (`math.rs:32-44`); redeem is `floor(pt * 1e24 / maturity_index)` capped by `total_sy`; claim pays accrual and burns YT. Summing PT redemption and YT accrual for one strip gives back exactly the deposit (`amount*I0/Im + amount*(Im-I0)/Im`), rounding down in the vault's favour.
- Index: high-water mark (`apply_index` only raises), `E_PRICE_ZERO` on a zero price, `cur_index = min(index, maturity_index)` after settlement.
- Attribution on a fill: both ledgers are settled before the move (`move_locked_yt`), so the seller keeps interest accrued before the fill; the worked vector (6.25 stNEAR) is asserted in unit tests and in `pnpm test:sdk`.
- Failure handling: wrong token and malformed messages return the full amount without panicking (`ft_on_transfer`, lib.rs:355-382); every payout has a rollback; a mint failure refunds the deposit.
- Deploy: atomic deploy and init; the vault registers itself on the underlying and on PT inside `new`.
- Live state on testnet (read-only RPC): `get_series` on `strip.rhea-strip.testnet` returned a consistent state (`pt_supply == yt_supply`, `total_sy` 250 mstNEAR, 3 open offers).
