# Audit: strip-vault (R1)

Scope: `contracts/strip-vault/src/*` at the state delivered by R1 (lib, ledger, series, market, math, types, events). Method: `near-contract-audit` 14-detector checklist, manual review of every cross-contract chain, unit tests, sandbox tests (`contracts/tests`), a low-gas probe. Not a third-party audit.

## Checklist result

| # | Detector | Severity | Result | Notes |
|---|---|---|---|---|
| 1 | `non-private-callback` | High | pass | Every callback (`on_pt_metadata`, `on_sync_index`, `on_settle`, `on_strip_index`, `on_strip_minted`, `on_redeem`, `on_claim`, `on_withdraw`, `on_buy_yt`, `on_buy_pt`, `on_cancel_pt`, `on_sweep_balance`, `on_sweep_done`, `ft_resolve_transfer`) carries `#[private]`. |
| 2 | `reentrancy` | High | fixed | Payout paths (`redeem`, `claim_yield`, `withdraw_sy`, `cancel_offer` PT, `sweep_residual`) deduct state before the outgoing `ft_transfer` and restore in the callback on failure. Deposit paths (strip mint, PT buy) credit only after the external effect succeeded: first version minted PT after crediting; reordered so YT and `total_sy` are credited in `on_strip_minted` only after `pt.mint` succeeded, so there is nothing to unwind if YT moved in the gap. PT offers being bought are marked `pending` (cancel and a second buyer are refused) until `pt.ft_transfer` resolves. |
| 3 | `incorrect-argument-or-return-types` | High | pass with accepted deviation | Amounts, indexes, offer ids, timestamps use `U128`/`U64`. Pagination args `from_index`/`limit` and `open_offers` are native `u64` as fixed by `contracts.md` 3.3 (small counts; reported). |
| 4 | `unsaved-changes` | High | pass | `store::LookupMap`/`IterableMap` values are re-inserted after mutation or mutated through `get_mut` inside methods that return normally; state is flushed when the contract struct drops. Covered by sandbox state assertions. |
| 5 | `owner-check` | High | pass | `sweep_residual` is owner only (`E_NOT_OWNER`, tested by a stranger call). `cancel_offer` is seller only. Callbacks are private. There is no other privileged method (no pause, no upgrade). |
| 6 | `yocto-attach` | High | pass | `assert_one_yocto` on `list_yt`, `cancel_offer`, `claim_yield`, `withdraw_sy`, `sweep_residual`, `ft_transfer`, `ft_transfer_call`, `storage_withdraw`, `storage_unregister`. |
| 7 | `storage-collision` | High | pass | `StorageKey` enum with four distinct prefixes (`Accounts`, `Credits`, `Offers`, `SellerOffers`), derived through `BorshStorageKey`. |
| 8 | `required-initialization-macro` | High | pass | `new` is `#[init]`; state struct derives `PanicOnDefault`. |
| 9 | `gas-griefing` | Medium | pass | The only loop over user-sized data is `release_yt_offers`, bounded by the 5-offer cap per account. `get_offers` is a view and paginated. |
| 10 | `insecure-random` | Medium | pass | No randomness. |
| 11 | `prepaid-gas` | Medium | pass | Gas for every callback is reserved with `with_static_gas` at scheduling time, so a call with too little gas fails before any external effect (and the whole receipt reverts). Probe test `low_gas_never_creates_unbacked_pt`: strip at 30-60 TGas is refunded cleanly, at 80 TGas it succeeds, and `pt_supply`, `yt_supply`, `total_sy` stay consistent with balances in every case. |
| 12 | `cover-storage-cost` | Low | fixed | Two findings. (a) Ledger and credit entries are paid by the vault. Added `has_headroom()` (free balance above storage cost must be at least 0.02 NEAR) checked in `on_strip_index` and before a PT buy, because a callback that fails on `LackBalanceForState` after an external effect would refund the user while the PT already moved. Refund code `E_STORAGE_LOW`. (b) Explicit YT `storage_deposit` requires 0.00125 NEAR and keeps it, so entries registered by users are paid; only strip and buy auto-create entries (the caller paid at least `min_strip`/ask). |
| 13 | `unsafe-math` | Low | pass | `overflow-checks = true` in the release profile; every mul-div goes through U256/U512 (`math.rs`); payouts floor; accruals saturate instead of panicking inside callbacks; additions to counters in callbacks use `saturating_*`. No `unsafe`. |
| 14 | `float-math` | Low | pass | No `f32`/`f64` in the contract. |

## Manual review (beyond the 14 detectors)

| Topic | Result |
|---|---|
| `ft_on_transfer` token authentication | Decides by `predecessor_account_id` (underlying or PT); any other token, unknown action or malformed message returns the full amount (`E_WRONG_TOKEN`, `E_BAD_MSG`), never panics. |
| Donation / first-depositor | Accounting uses internal counters (`total_sy`, `pt_supply`, `yt_supply`, `total_credit`, `total_accrued`) only; `ft_balance_of` is read only inside `sweep_residual`. `min_strip` is the floor. |
| Index | High-water mark; `E_PRICE_ZERO` on price 0; `cur_index = min(index, maturity_index)` once settled. Unit tests and sandbox samples assert it never decreases. |
| Ledger settle order | `settle_account` runs for both parties before any balance move (`move_unlocked_yt`, `move_locked_yt`, `credit_yt`, claim). Locked YT cannot be transferred. |
| Conservation | Property test (40 seeds x 120 random strips, index bumps, transfers, list and fills) asserts `pt_supply == yt_supply`, sum of balances == supply, and at maturity `paid <= deposited` with dust below `8 * steps + 16` yocto. Sandbox: vault dust after a full lifecycle is below 10 yocto and `sum(balances) == total_supply`. |
| YT transfer in `Matured` | Refused (`E_NOT_SETTLED`) so interest cannot be split against an index that is about to rise; before maturity it needs index age <= 120 s. |
| Claim with open offers | `claim_yield` releases the caller's YT offers first so the burned balance is never partially locked. |
| Failed payouts | `E_PAYOUT_FAILED` logged, credit/ledger/PT restored; sandbox test: seller unregistered on the underlying keeps `sy_credit` after a failed `withdraw_sy`, then withdraws after registering. |
| Lazy settle | Permissionless and idempotent; a late caller raises `maturity_index` slightly (documented Pendle behaviour). |
| Accepted risks | Vault storage drain by spam is bounded by `min_strip` and the headroom check, not eliminated (testnet). The last redeemer absorbs any shortfall if the index ever falls below the high-water mark. YT minted between price read and mint callback accrues from the later index (value stays in the vault). PT `burn` after a successful redeem payout is fire and forget; if it failed, PT would stay in the vault balance without affecting accounting. |

## Plan decision

Plan A (async pull-price chain) is green: strip, buy, settle, sync all pull `get_st_near_price` inside the receipt chain and every failure path refunds. Plan B (stored-index mode) was not needed. YT `ft_transfer` still requires index age <= 120 s before maturity as specified.

## Measured gas (sandbox, mock underlying; TGas)

`total` is gas burnt across the whole receipt chain; `max receipt` is the heaviest single receipt. Recommended attach is what the sandbox suite passes with, with margin; the vault reserves the static gas below inside the chain.

| Entry point | Burnt total | Max receipt | Spec value | Tested attach / recommendation |
|---|---|---|---|---|
| `underlying.ft_transfer_call` strip | 15.1 | 2.5 | 300 | passes at 80, refunds cleanly at <= 60; use 100 |
| strip refused (wrong token, bad msg, below min, after maturity) | 6.8 | 2.5 | 300 | refund path |
| `ft_transfer_call` buy YT | 11.6 | 2.8 | 250 | passes at 80; use 100 |
| `ft_transfer_call` buy PT | 12.3 | 2.5 | 250 | passes at 80; use 100 |
| `pt.ft_transfer_call` list_pt | 6.9 | 2.5 | 100 | passes at 40; use 60 |
| `pt.ft_transfer_call` redeem | 13.0 | 2.5 | 150 | passes at 70; use 100 |
| `list_yt` | 2.8 | 2.2 | 30 | passes at 20; use 30 |
| `cancel_offer` YT | 2.8 | 2.3 | 50 | use 30 |
| `cancel_offer` PT | 7.1 | 2.7 | 50 | passes at 40; use 60 |
| `sync_index` | 6.0 | 2.2 | 50 | passes at 25, fails at 20; use 50 |
| `settle` | 6.1 | 2.2 | 50 | passes at 40; use 50 |
| `claim_yield` | 7.0 | 2.6 | 100 | passes at 50; use 60 |
| `withdraw_sy` | 6.7 | 2.4 | 80 | passes at 50; use 60 |
| `sweep_residual` | 10.4 | 2.2 | n/a | passes at 80 |
| YT `ft_transfer` | 2.5 | 2.0 | n/a | 30 |
| YT `storage_deposit` | 2.9 | 1.9 | n/a | 30 |

Real Meta Pool `get_st_near_price` is a heavier view than the mock; the vault reserves 10 TGas for that hop. Re-measure against `meta-v2.pool.testnet` before any real-underlying run.

## Deviations and notes for `contracts.md`

1. Extra error codes used beyond the list: `E_MATH`, `E_STORAGE_LOW`, `E_NOT_REGISTERED`, plus log-only codes `E_PAYOUT_FAILED`, `E_MINT_FAILED`, `E_PT_TRANSFER_FAILED`, `E_SWEEP_FAILED`, `E_PRICE_FETCH_FAILED`.
2. YT `storage_deposit`: min = max = 0.00125 NEAR, kept by the vault (refund of the excess only). Strip and buy auto-create the receiver's ledger entry at the vault's cost. `ft_transfer` to an unregistered receiver panics `E_NOT_REGISTERED`. `storage_unregister` removes an empty entry without refund.
3. `new` also schedules `pt.ft_metadata` (YT symbol = `YT-` + PT symbol minus `PT-`) and a first `get_st_near_price`; `pt` must be deployed and initialised before the vault. It attaches 0.00125 NEAR to the underlying `storage_deposit` and 0.0025 NEAR to PT's (excess is refunded by the standard impl), so the vault account needs about 0.004 NEAR free at init.
4. `settle()` returns the maturity index (immediately if already settled); `sync_index()` returns a promise resolving to the stored index; `list_yt` returns the offer id; `cancel_offer` returns a bool. Offer ids start at 1.
5. `claim_yield` returns the paid amount and auto-cancels the caller's open YT offers; claiming with nothing owed is a no-op returning 0.
6. YT `ft_transfer` is refused while `Matured` (not yet settled) with `E_NOT_SETTLED`; allowed once `Settled`.
7. Sandbox worked vector: the mock price cannot be pinned to exactly 1.5 then 1.6, so the sandbox suite asserts the same formulas on the measured indexes (to the yocto); the literal 100 stNEAR at 1.5 to 1.6 vector (6.25 stNEAR, 93.75 retained) is asserted in the unit tests `worked_vector_conserves_value` and `math::tests::accrue_worked_vector`.
