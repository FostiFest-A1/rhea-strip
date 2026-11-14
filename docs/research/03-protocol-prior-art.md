# 03 — Protocol prior art & yield facts

Author: research agent (evidence only, no architecture). Date: 2026-11-09. Every `[Sn]` points to the Sources section; every source was read on 2026-11-09. Anything marked **(derived)** is my own algebra or my own measurement and is not stated in a source. Anything marked **(assumption)** has no citation.

## Summary

1. **"The first ... on NEAR" does NOT hold as written.** On 2026-11-09 there is a public repo, `ayoubbuoya/exodus-near`, created 2026-11-06 and last pushed 2026-11-09 13:17 UTC. It is a PT/YT yield-tokenization protocol for stNEAR / LiNEAR / MockLST with a port of Pendle's logit AMM, YT swaps, a keeper, a backend, a frontend and a NEAR Intents entry tab. It is explicitly entered in the same hackathon (NEAR HACKATHON, DeFi track, deadline 2026-11-14 23:59 UTC) [S16]. It is testnet-stage as far as its docs say, so a narrower claim ("first PT/YT *in production / on mainnet* on NEAR") is still unrefuted. That narrow claim rests on negative evidence only: DefiLlama lists 47 NEAR protocols and none is yield tokenization [S11], Pendle's 14 chains exclude NEAR [S11], and the Rhea guide, GitHub org and hackathon partner notes mention no PT/YT [S20]. The PRD's own caveat ("validate before external publication") is correct and the validation fails for the unqualified wording.
2. **Real target hackathon found: NEAR HACKATHON** (nearhackathon.com). It runs 2026-11-01 to 2026-11-14 23:59 UTC, with a $250K pool, 13 tracks, judging 16-18 Nov and Rhea listed as an ecosystem partner [S15]. Rhea Strip fits the `defi` track ("Unstoppable DeFi"). It is **5 days to the deadline today**. Claude Code and Codex screen every repo first for "runs and does what the README says", so reproducibility is scored before humans look [S15].
3. **Protocol facts are verified against Pendle's source** [S2-S5]. The core is one non-decreasing index `I = max(SY.exchangeRate, stored)`. Mint: `PT = YT = SY × I`. YT interest per holder: `ytBal × (1/I_user − 1/I_now)` in SY units. Pre-maturity redeem: `SY = PY / I`. After maturity the index freezes. The AMM exchange rate is `ln(p/(1−p))/rateScalar + rateAnchor` with `rateScalar = scalarRoot × 365d / τ`. Exact formulas are in Recommendations.
4. **Market context is mixed.** Pendle TVL is about $1.0B, down from an all-time high of $13.39B on 2025-09-19 (about −92%), while 30-day volume is still $1.43B [S11]. NEAR LSTs are small: stNEAR about $76.5M, LiNEAR about $45.2M, rNEAR about $65.6M [S11][S12]. stNEAR price growth measured on-chain is about 3.9% APY **(derived)**. The NEAR issuance cut (HSP-029, 5.2% → 3.3% gross staking yield over 24 months, still pending a veto window and grace period) is the best "why now" for fixed-yield products [S14].
5. **Biggest demo-day risk is time and yield, not code.** The real stNEAR price moves in small discrete steps a few times a day; a 5-minute series would accrue about 4e-7 of principal **(derived)**, which is invisible. The only hackathon precedent found (Exodus) uses an admin-controlled, increase-only MockLST rate plus a short configurable maturity and a "demo-advance" script [S16]. Testnet RPC `rpc.testnet.near.org` is called "deprecated" by that project, which switched to FastNEAR [S16][S19].
6. **Recommended trading mechanism for the hackathon: Option A, a fixed-price YT/PT listing market (peer-to-pool escrow).** Option B (rate-quoted desk with Pendle's linear-discount price) is the stretch. Option C (Pendle logit AMM) is what the competitor already built, so it adds no differentiation and costs the most. Formulas for all three are below.

## Findings

### F1. Prior art (protocol design, primary sources)

| Protocol | Chain(s) | Mechanism (verified) | Status 2026-11-09 | Source |
|---|---|---|---|---|
| **Pendle v2** | 14 chains per DefiLlama: Ethereum, Arbitrum, Base, BNB, Mantle, Optimism, Avalanche, Sonic, Plasma, Berachain, X Layer, Hyperliquid L1, Monad, Robinhood Chain. **No NEAR.** | SY (wrapper) -> PT + YT via a single PY index; PT/SY AMM adapted from Notional; YT traded by flash-mint through the same PT/SY pool; limit orders | TVL $0.999B; 30d volume $1.43B; all-time volume $59.1B | [S1][S2][S5][S11] |
| **Spectra** (ex-APWine) | Ethereum, Base, Arbitrum, Flare, Sonic, Stellar, Katana, etc. | ERC-4626 IBT -> PT (EIP-5095) + YT; Curve pools via Router; on Stellar an order book is used instead of an AMM | V2 TVL $12.8M | [S9][S11] |
| **Exponent** | Solana | Strip/merge SY <-> PT + YT; YT must be deposited into a `YieldTokenPosition` to earn (does not earn in a wallet); exchange layer is a "Rate CLMM" plus a "Rate Order Book" | TVL $45.2M; audited by OtterSec and Offside Labs per its own blog | [S10][S11] |
| **Element** | Ethereum | PT/YT fixed-rate protocol; DAO proposal (July 2024) to rebrand and wind down; ratification not confirmed in what I read | Wound down / proposed | [S18] |
| **Sense** | Ethereum | "Divider" fixed-income protocol, tokenized future yield; Space AMM | TVL $25.6K | [S11][S18] |
| **Notional** | Ethereum, Arbitrum | Fixed-rate lend/borrow with maturities; Pendle credits its AMM design to Notional | v3 TVL $626 | [S1][S11][S18] |
| **Yield Protocol** | Ethereum, Arbitrum | fyTokens (zero-coupon bonds) and the YieldSpace AMM `x^(1−t)+y^(1−t)=k` | TVL $234K | [S8][S11] |
| **Term Finance** | Ethereum | Not PT/YT: sealed-bid fixed-rate auctions and "Term Repo Tokens" (secondary sources only) | n/a | [S18] |
| **Timeless** | Ethereum | "Perpetual Yield Tokens" (no maturity); repo only | archived-looking (last push 2025) | [S18] |
| **Tonstakers** | TON | PT/YT for tsTON (search snippet only, not opened) | unverified | [S18] |
| **Sui / Aptos** | | I found **no** PT/YT protocol on either (one weak search) | not found | [S18] |
| **Perena / Kamino-Pendle forks** | Solana | Not confirmed. DefiLlama lists "Perena Vaults" and "Perena Dex" as non-PT/YT categories. Kamino listing of Exponent PTs (kySOL, fragSOL) is a Substack claim | unconfirmed | [S11][S18] |

Academic framing: Nadkarni and Viswanath, "Split the Yield, Share the Risk" (v4 dated 2026-10-13) gives a formal no-arbitrage treatment, but I only read the abstract [S18].

### F2. Does any PT/YT protocol exist on NEAR? (positioning check)

| Evidence | Finding | Source |
|---|---|---|
| DefiLlama protocol list, chain = Near | 47 protocols. Categories: CEX 12, Liquid Staking 6, Dexs 6, Bridge 5, Lending 3, Restaking 2, Yield 2 (PembRock, MoreMarkets), Yield Aggregator 1 (Phoenix Bonds), Options Vault, Derivatives (Spin Perps), etc. **No yield-tokenization or fixed-rate protocol.** | [S11] |
| Pendle chain list (DefiLlama) | No NEAR | [S11] |
| Pendle docs / web search "Pendle on NEAR", "PT-stNEAR" | Nothing | [S1][S18] |
| Rhea Finance (Ref + Burrow merged): guide, GitHub org (12 repos), hackathon "Partner notes" | Products: swaps, cross-chain lending, rNEAR LST, SDKs. Partner note suggests "CLMM and AMM pools, the cross-chain swap API or vaults on top of its lending". No PT/YT/fixed-rate. | [S15][S20] |
| Meta Pool / LiNEAR GitHub orgs | No yield tokenization. LiNEAR's `phoenix-bonds` is a bonding mechanism (BlockSec-audited), not PT/YT. | [S18][S20] |
| GitHub search, web search, "NEAR forum" search | The search tools do not index gov.near.org or X well. One hit only, see next row. | [S18] |
| **`ayoubbuoya/exodus-near`** (public, MIT) | Created 2026-11-06, pushed 2026-11-09. "Fixed yield and yield trading on NEAR... Tokenize stNEAR, LiNEAR into PT/YT... on-chain Logit AMM". Contracts `market` and `mock-lst`, a `exodus-math` fixed-point crate (ported Balancer LogExpMath), Axum backend with keeper and indexer, React frontend (Fix yield, Pool, Mint/Redeem, Long yield, Intents tabs). Entered in NEAR HACKATHON, DeFi track. HANDOFF says steps 1-11 of 13 done on 2026-11-09, deployment scripts target testnet, mainnet "only with explicit OK". Prior-work disclosure: derived from "Exodus on Canton" (HackCanton S3, 2nd place). | [S16] |

**Verdict on the PRD positioning note:**
- "The first yield-tokenization **and interest-rate-derivatives protocol** on NEAR" is **not supportable**: a public same-window competitor exists and its repo predates any Rhea Strip artifact.
- The only still-defensible superlatives are narrow and must be checked again right before publishing: "first PT/YT **live on NEAR mainnet**" (only if Rhea Strip actually ships to mainnet first; Exodus is testnet-stage as of 2026-11-09), or feature-level claims such as "first to make **forward-selling yield** the flagship flow" (not found in Exodus docs: its YT trade is an AMM flash-mint, its personas are fixed-yield saver / yield trader / LP / cross-chain user [S16]).
- Evidence quality: absence of evidence in DefiLlama / GitHub / web search. X and gov.near.org were not searchable. A second hackathon team may exist that I could not see.
- Name collision (low risk): DefiLlama has "Strips Finance" (Arbitrum, Derivatives, TVL 0) [S11].

### F3. Core protocol facts (verified against Pendle source; formulas)

Notation: `I` = PY index (accounting-asset value of one SY, e.g. NEAR per stNEAR). `PY` = PT or YT amount. `τ` = years to expiry.

1. **Index is non-decreasing.** `pyIndexCurrent = max(SY.exchangeRate(), pyIndexStored)` [S2] (also stated in docs [S1]). If the SY rate falls, the index stays; YT accrual pauses; pre-expiry redemptions return fewer SY per PY until recovery [S1]. Pendle docs' example: stored index 1.20, rate drops to 1.15, user holding 120 PT redeems 120/1.20 = 100 SY which is worth 115 USDe at maturity, i.e. PT holders absorb the loss [S1].
2. **Mint:** `PY_minted = SY_deposited × I` [S1][S2 `_calcPYToMint`]. Example in docs: 100 SY at I = 1.2 -> 120 PT + 120 YT.
3. **Redeem PT+YT (pre-expiry):** `SY_out = PY / I`; interest is claimed separately [S1][S2 `_calcSyRedeemableFromPY`].
4. **YT interest per holder** (per-unit accrual via a global index, settled lazily) [S3]:
   `interest_SY = ytBal × (I_now − I_user) / (I_user × I_now)  =  ytBal × (1/I_user − 1/I_now)`, then `I_user := I_now`. If `I_user == 0` the snapshot is just initialised to `I_now` (no accrual). The accrual runs before every YT balance change: `_beforeTokenTransfer` calls `_distributeInterestForTwo(from, to)` so **both** sender and receiver are settled [S2 line 505-508]. Interest is paid in SY (here: stNEAR) and can be claimed any time before or after maturity [S1].
5. **Maturity:** The first call at or after expiry stores `postExpiry.firstPYIndex = _pyIndexCurrent()` and from then `_getInterestIndex()` returns that frozen value, so YT stops accruing [S2 `_setPostExpiryData`, `_getInterestIndex`]. Note: the snapshot is the index at the **first post-expiry call, not at the expiry instant**, so a late first call overshoots slightly (**derived** from code).
6. **PT after expiry:** `SY_out = PT / I_current`; the surplus `PT/I_firstPostExpiry − PT/I_current` is booked to treasury; unredeemed matured PT keeps generating yield that is redirected to the treasury [S2 `_calcSyRedeemableFromPY`][S1 Fees]. PT is redeemed 1:1 against the **accounting asset** value, not 1 unit of the yield token: "1 PT-ezETH = 1 ETH worth of ezETH, not 1 ezETH" [S1 "Redemption Value"]. For NEAR: 1 PT = 1 NEAR worth of stNEAR.
7. **Price identity:** `P(PT) + P(YT) = P(underlying)` (accounting asset) [S1 AMM/Flash swaps]. YT price tends to 0 at maturity; PT price tends to 1 [S1]. Confirmed live on Pendle's API for PT-stETH-30DEC2027: `pt/acc + yt/acc = 0.9991` [S7] (derived check).
8. **Implied APY** `= (1 + P_YT/P_PT)^(365/days_to_expiry) − 1`; Fixed APY is numerically equal; Underlying APY is a 7-day moving average; Long Yield APY is "approximated annualized return from buying YT assuming underlying APY stays constant" and can be negative [S1 Glossary]. Live check on the same market: formula returns 2.3259% vs API `impliedApy` 2.3259% [S7] (derived check; matches to 6 digits).
9. **Exchange-rate form used by the AMM** (code) [S5][S6]:
   - `rateScalar = scalarRoot × 365d / τ_seconds`
   - `totalAsset = totalSy × I`
   - `p = (totalPt − netPtToAccount) / (totalPt + totalAsset)`; revert if `p > 0.96`
   - `ER = ln(p/(1−p)) / rateScalar + rateAnchor`, require `ER ≥ 1` (so PT price `1/ER ≤ 1`)
   - `rateAnchor = ER_last − ln(p0/(1−p0))/rateScalar`, with `ER_last = exp(lastLnImpliedRate × τ/365d)` (re-anchored before each trade so the pre-trade implied rate equals the post-last-trade rate)
   - `lnImpliedRate = ln(ER) × 365d / τ`; implied APY `= exp(lnImpliedRate) − 1` [S1 Market contracts]
   - PT price in asset `= 1/ER`, i.e. `PT price = (1 + r)^(−τ)` for implied APY `r` when `lnImpliedRate = ln(1+r)` (identity, **derived**, same as Pendle's "E = e^(rt)" comment in code [S5]).
   - Fee: `feeRate = exp(lnFeeRateRoot × τ/365d)` (so fee scales with time to maturity: "Trading Fee = (Fee Tier/365) × Days to Maturity" [S1 Fees]); buy-PT requires `ER/feeRate ≥ 1`.
   - First liquidity: `lp = sqrt(pt × sy) − 1000` (MINIMUM_LIQUIDITY = 10^3 locked) [S5].
10. **Why not constant product:** Pendle states standard `x × y = k` "do not account for the unique properties of fixed-yield assets" and that its curve "pushes PT price towards its underlying value as time passes" [S1]. The YieldSpace paper says generic AMMs give "higher price impact and fees for traders of close-to-maturity fyTokens, and predictable losses due to arbitrage for liquidity providers" [S8].
11. **Fees at Pendle:** 5% of all YT yield; swap fee scaled by maturity; 20% of swap fees to LPs [S1].

### F4. NEAR/stNEAR facts that affect yield accounting

| Fact | Value | How obtained |
|---|---|---|
| stNEAR price function | `meta-pool.near :: get_st_near_price` returns a 24-decimal string. At block 223771842 (2026-11-09 13:14 UTC): `1514411535945873749259456` = **1.514412 NEAR/stNEAR** | direct RPC view call [S12] |
| Price definition | `price = total_for_staking / total_stake_shares` (shares_from_amount / amount_from_shares in contract). On-chain state: `total_for_staking = 21,611,284.4 NEAR`, `total_stake_shares = 14,270,417.2` -> ratio 1.51441 | contract source [S13], `get_contract_state` [S12] |
| stNEAR supply / value | 14.27M stNEAR ≈ 21.61M NEAR ≈ **$76.5M** at NEAR $3.54; DefiLlama Meta Pool TVL $76.3M | [S11][S12] |
| LiNEAR | `linear-protocol.near`: supply 8.93M, `ft_price` 1.430417 -> 12.77M NEAR ≈ **$45.2M** (DefiLlama $45.1M) | [S11][S12] |
| rNEAR (Rhea LST) | DefiLlama "RHEA LST" TVL $66.4M; pool "RNEAR" APY 4.51% (30d mean 4.61%) | [S11] |
| NEAR chain TVL | $166.2M (DefiLlama `Near`); Rhea Lend $141.8M, NEAR Intents $189.9M (all chains) | [S11] |
| stNEAR realised APY | price 1.511639 (2026-10-23 02:52 UTC, block 221179842) -> 1.514412 (2026-11-09 13:14 UTC): +0.1834% in 17.43 days => **≈3.9% APY** compounded | **derived** from two RPC reads [S12] |
| Update granularity | Price is not smooth: reads at 6 consecutive points spaced 21,600 blocks (~3.6 h) showed jumps such as 1514295839 -> 1514319784 -> 1514364635 -> 1514365888 -> 1514411411 -> 1514411535 (e8 relative: +1.6e-5, +3.0e-5, +0.8e-6, +3.1e-5, +8e-8) | **derived** from RPC reads [S12]; Meta Pool says LST value increases "every epoch" (~12 h) [S13] |
| Decimals | stNEAR / NEAR 24; price 24; `u128` max ≈ 3.4e38. `amount (1e30 for 1M stNEAR) × index (1.5e24)` ≈ 1.5e54 overflows `u128`; use a 256-bit mul-div | **derived** |
| Testnet underlying | `meta-v2.pool.testnet :: get_st_near_price` = 3.198752 (live, my read; Exodus recorded the same) and `linear-protocol.testnet` exists | [S12][S16] |
| Yield outlook | HSP-029: max issuance 2.5% -> 1.6% phased over 24 months; gross staking yield 5.2% -> 3.3%; passed 99.9%; still subject to a 14-day Security Council veto then 90-day grace before reduction starts. NEAR $3.82 on 2026-11-03. Article date 2026-11-03 | [S14] |
| Liquid vs delayed unstake | Liquid unstake via pool at a fee (docs example 100 stNEAR -> 99.8 NEAR; "0.3%-1.5% are normal"); delayed unstake 39-54 h (docs) vs other sources 52-65 h / six days (sources conflict) | Meta Pool docs via search snippet [S13] |

Interpretation (derived): at ~3.9% APY, one year of yield on 100 NEAR of stNEAR is about 3.9 NEAR, so a 30-day YT is worth about 0.32% of notional (0.48 NEAR per 150 NEAR). The product is economically small in absolute terms, so the demo must show percentages, rates and mechanics, not dollar size.

### F5. Pitfalls and attack vectors (with sources)

| # | Pitfall | Evidence | Mitigation seen in prior art |
|---|---|---|---|
| 1 | **Share-price donation / inflation attack** (first depositor donates to move the rate; later deposits round to 0) | OpenZeppelin ERC-4626 docs describe it and the virtual-offset defense [S17]. Pendle's YT contract uses a "floating SY" pattern (`balance − syReserve`) so unsolicited transfers are credited to the next minter [S2]. | Do not derive mint amounts from a raw token balance; account deposits from explicit transfer amounts. Here mint is `SY × I` with `I` read from the LST, so no vault share price exists to inflate. The LST's own price (`total_for_staking/total_stake_shares`) is outside the protocol's control. |
| 2 | **Rounding** | Pendle has `assetToSy` (floor) and `assetToSyUp` / `syToAssetUp` (ceil) [S4]; docs warn that low-decimal assets have large rounding margins [S1]. Exodus spec: "rounding always in favor of the contract, max 1 yocto loss" [S16]. | Round what the user receives down, what the user owes up; test `mint -> redeem` returns <= input. |
| 3 | **YT flash claim / stale snapshot on transfer** | Pendle settles both parties in the transfer hook [S2 505-508]. Exodus: "Accrual runs before every change of a user's YT balance (mint, redeem, swap, transfer)" [S16]. | Settle sender and receiver before the balance moves; initialise a new holder's snapshot to the current index so they cannot claim yield accrued before they held YT. |
| 4 | **PT priced above 1 asset / trading after expiry** | Pendle reverts `MarketExchangeRateBelowOne` when `ER < 1`, `MarketExpired` on trade after expiry, `MarketProportionTooHigh` above 0.96 [S5]. | Require `ER ≥ 1`; block trades after expiry; show PT = 1.0 after maturity. |
| 5 | **Rate goes down (slashing, depeg)** | Index stored as running max; YT pauses; PT is exposed (Pendle docs "Negative Yield") [S1]. Watermark Rate definition: when the rate falls below it, PT redeems below its expected value and YT stops earning [S1 Glossary]. | Use `max(stored, new)` and state the PT loss case in the UI risk note. |
| 6 | **Settlement overshoot** | Post-expiry snapshot is taken at the first post-expiry call, not at expiry [S2 `_setPostExpiryData`]. | Make `settle()` / `refresh_index` permissionless and keep a keeper; accept the overshoot as protocol/treasury surplus. |
| 7 | **Post-maturity yield on idle PT** | Pendle redirects yield on unredeemed matured PT to the treasury [S1 Fees]. | Same, or burn it into the surplus; document it. |
| 8 | **Oracle/PT price manipulation downstream** | Pendle recommends deterministic linear-discount pricing for PT collateral because AMM-derived prices are manipulable [S1]. | Out of MVP scope; do not use spot AMM price for any collateral/health logic. |
| 9 | **Stale index (NEAR-specific)** | The LST price changes only a few times a day and cross-contract view reads are asynchronous, so Exodus gates state changes on `index_epoch == current epoch` and uses a permissionless `refresh_index` plus a keeper with a function-call key [S16]. | Same freshness rule; one stale-index failure mode to test live. |

### F6. Market and domain validation

- **Pendle TVL trajectory (DefiLlama):** $4.4B (2025-01-01) -> $10.6B (2025-09-01) -> all-time high **$13.39B on 2025-09-19** -> $3.7B (2026-01-01) -> $1.45B (2026-06-01) -> **$1.01B (2026-11-01) and $0.999B (2026-11-09)**. Per chain now: Ethereum $771M, Monad $148M, Arbitrum $36M, X Layer $22M, Hyperliquid $9M, BNB $7M; plus $150M staking (excluded from TVL series) [S11].
- **Pendle volume (DefiLlama, methodology: pool volume plus limit-order fills; a YT trade counts the size of the position it opens, so it overstates cash volume):** 24h $13.9M, 7d $550M, 30d **$1.43B**, 1y $9.89B, all-time $59.1B [S11].
- **Others (TVL, DefiLlama):** Exponent $45.2M (Solana), Spectra V2 $12.8M, Yield Protocol $0.23M, Sense $0.03M, Notional V3 ~$0 [S11].
- **Why NEAR needs it:** (a) NEAR LST capital is idle: about $190M across stNEAR, LiNEAR and rNEAR with no way to separate principal from yield [S11][S12]; (b) yield is trending down (HSP-029, 5.2% -> 3.3% gross) so locking a fixed rate has a clear story [S14]; (c) Rhea combines DEX, lending and an LST, which makes it a natural venue [S20]; (d) PT as a stable-value collateral is a stated Pendle use case on money markets (Aave, Morpho, Euler, Silo) [S1].
- **Personas (Pendle docs + PRD + Exodus):** fixed-yield saver / DAO treasury (buys PT); yield speculator (buys YT, "longs yield", leveraged exposure); LP; LST holder who wants cash now (forward-sell, the PRD flagship); points farmers (YT captures points; N/A for stNEAR unless Meta Pool issues points) [S1][S16].
- **Risks:** (1) Pendle's own TVL fell ~92% from peak, so demand for the primitive is cyclical and unproven for a small chain; (2) NEAR LST TVL is down 12-20% over 7 days per DefiLlama (Meta Pool -14.2%, LiNEAR -20.7%, Rhea LST -13.9%) [S11]; (3) low absolute yield (about 3.9%); (4) LST/validator slashing and LST depeg risk; (5) smart-contract risk with no audit before demo; (6) a same-hackathon competitor.

### F7. Target hackathon: NEAR HACKATHON

| Item | Value | Source |
|---|---|---|
| URL | https://nearhackathon.com ; agent file https://nearhackathon.com/HACKATHON.md | [S15] |
| Dates (UTC) | Start 2026-11-01 00:00; **submission deadline 2026-11-14 23:59**; judging 2026-11-16 to 11-18; results by 2026-11-18 23:59 | [S15] |
| Prize pool | $250K paid in NEAR: grand prize $55K x1; per track $10K / $3K / $2K x 13 tracks | [S15] |
| Tracks (13) | Unstoppable DeFi (`defi`): "exchanges, perps, lending, vaults and trading agents that settle across chains through NEAR Intents"; Investment Thesis; Privacy & Private AI; Autonomous Business; AI Swarms; AI Security & Defense; Agent Economy; Real-World Money; Games; NFTs; Memecoins; Social Money; Open Innovation. Multi-track entries allowed. | [S15] |
| Judges | Illia Polosukhin (NEAR), Eddy Lazzarin (a16z crypto), Mert Mumtaz (Helius), Avichal Garg (Electric Capital), Kain Warwick, Haseeb Qureshi (Dragonfly), Stepan Gershuni (cyber•Fund), plus Claude Code and Codex as screeners | [S15] |
| Criteria | Not a formal rubric. Prior editions: technical implementation, design, impact, originality, sustainability. AI screening checks that the project "runs and does what its README says"; low AI score alone cannot reject. | [S15] |
| Submission rules | Public repo (with LICENSE, README with "do X - see Y" steps); public X demo post that says built at NEAR HACKATHON, tags @NEARProtocol and #NEARHackathon, with video or screenshots; one submission per project via form or `POST /api/applications`; edits only through "request changes"; NEAR mainnet wallet for payout; testnet-only projects allowed (Q-010); local-only demo allowed but video required, hosted demo kept to at least 11-18 (ideally 11-25) (Q-012); no mandatory integrations (Q-011); no testnet for Intents (Q-007); testnet NEAR is free (Q-008) | [S15] |
| Rhea | Listed as ecosystem partner. Partner note suggests CLMM/AMM pools, cross-chain swap API or vaults on lending; SDK docs at github.com/rhea-finance/rhea-sdk-docs | [S15] |
| Demo post advice | Lead with the user problem, show one complete moment, explain NEAR's role concretely, give a next step | [S15] |

### F8. Demo-day risk list

| Risk | Evidence | Note |
|---|---|---|
| **Real yield does not move on stage** | stNEAR price steps a few times per day; 5 minutes of 3.9% APY is ~3.7e-7 of principal (derived) [S12] | Needs a labeled DEMO rate source or a rate-bump script; keep one read-only real-stNEAR market for credibility. Exodus did exactly this: MockLST, admin can only raise the rate, "Demo market maturity is short (default 3 days after deploy, configurable)", `demo-advance` bumps the rate [S16]. |
| **Maturity needs wall-clock time** | I found no PT/YT hackathon project documenting a block-time "time warp" in the sources I could open. Exodus's open item U5 "near-sandbox time/block fast-forward available?" is still `todo` [S16]. NandMala (ETHGlobal) sets pool maturity at creation [S18]; Mantle "Yield Tokenizer" says it tested maturity-timestamp edge cases on testnet [S18]. | Options in use or plausible: (1) maturity set at deploy a few hours or days out; (2) admin-only increase for the rate; (3) record video, run live only for the short steps; (4) sandbox fast-forward (unverified on NEAR). |
| **Testnet RPC** | Exodus switched from `rpc.testnet.near.org` ("deprecated") to `test.rpc.fastnear.com` on 2026-11-09 [S16]. `archival-rpc.mainnet.near.org` returned `-429 THIS ENDPOINT IS DEPRECATED` and HTTP 429 in my calls today [S12]. NEAR docs list FastNEAR, dRPC, Intear for testnet and call NEAR's archival endpoints "severely rate limited" [S19]. | Pin FastNEAR in env; keep a fallback list; no batch JSON-RPC (nearcore does not accept batches) [S19]. |
| **Wallet popups / multi-step flows** | `ft_transfer_call` flows need 1 yoctoNEAR deposit and storage registration (NEP-145 is used by Exodus for PT) [S16] | Pre-register demo accounts for storage, pre-fund, use function-call keys for repetitive calls; rehearse with the same wallet. |
| **Stale index** | Exodus gates ops on same-epoch index and runs a keeper [S16] | Run `refresh_index` right before the demo. |
| **Faucets / gas** | Testnet NEAR is free from faucets (Q-008) [S15] | Pre-fund two accounts (seller, buyer). |
| **Intents** | No testnet; mainnet with tiny amounts, `dry: true` quotes (Q-007) [S15] | Only matters if Intents is used. |
| **AI screening** | README is read by Claude Code/Codex first [S15] | One-command run, "do X - see Y" steps, deployed contract IDs and tx links. |
| **Deadline** | Deadline in 5 days; X post + public repo + single submission; mistakes only via request-changes [S15] | Freeze scope. |

## Recommendations

### R1. Trading mechanism options, ranked for a hackathon demo

Notation: `I` = index (NEAR per stNEAR). `d` = days to maturity, `τ = d/365`. Prices are in NEAR per 1 PT or 1 YT (PT and YT are denominated in NEAR of principal, as `PY = SY × I`). `f` = fee fraction. `û` = expected underlying APY (display input).

Common identities (verified, F3): `P_PT + P_YT = 1`; `Implied APY r = (1 + P_YT/P_PT)^(1/τ) − 1 = (1/P_PT)^(1/τ) − 1` (the second form is **derived** by substituting `P_PT = 1 − P_YT`).

#### Option A (rank 1): Fixed-price listing market for YT and PT ("peer-to-pool forward sale")

Precedent for order-style rate venues: Pendle limit orders [S1], Exponent "Rate Order Book" [S10], Spectra on Stellar uses an order book [S18].

- **List:** seller escrows `y` YT (or PT) and sets `ask p` in NEAR per YT, `0 < p < 1`. Seller's already-accrued yield stays with the seller: settle seller interest first (F3.4), then move the balance.
- **Fill:** buyer pays `cost = ceil(y × p)` NEAR (or the stNEAR equivalent `cost / I`, rounded up); seller receives `floor(cost × (1 − f))`; settle buyer's interest snapshot to `I_now` before crediting YT (F3.4). Partial fills pro-rata.
- **Display for a listing (all derived):** ask-implied APY `= (1/(1−p))^(1/τ) − 1`; fair price `p* = û × τ` (simple) or `(1+û)^τ − 1` (compounded); discount to fair `= 1 − p/p*`; buyer break-even underlying APY `= p / τ`; buyer leverage `= 1/p`; seller upfront `= y × p × (1 − f)`.
- **Example (derived, real numbers):** 100 stNEAR at I = 1.5 mints 150 PT + 150 YT. Over 1 year at û = 3.9%: `p* ≈ 0.039`, upfront `= 150 × 0.039 = 5.85 NEAR`; the seller keeps 150 PT redeemable for 150 NEAR-worth of stNEAR at maturity.
- **Pros:** about 1 contract module, no `ln/exp`, matches the PRD flagship literally ("sell future yield for upfront liquidity"), easy to test, price is visible and explainable. **Cons:** needs a counterparty (seed a second account in the demo), no continuous price discovery, no LP story, can look thin next to a Pendle-style AMM.
- **Judge-convincing 3-minute script:** 0:00 problem (stNEAR yield is locked inside the token); 0:20 deposit -> PT + YT; 0:50 "sell the next 30 days of yield" -> instant NEAR in wallet and implied APY shown; 1:20 second account buys; 1:45 advance the DEMO rate -> buyer's claimable yield increases; 2:15 maturity -> PT redeems, YT claims, YT price 0; 2:45 tx links and the one-line "NEAR's role" sentence required by the post guide [S15].

#### Option B (rank 2, stretch): Rate-quoted desk with Pendle's linear-discount price

Price rule is Pendle's own deterministic PT pricing: `discount factor = min(1, 1 − (maturity − t) × baseDiscountPerYear / 365d)` [S1 Linear Discount Oracle]. Using it as a *quote* (not a collateral oracle) is **my adaptation (derived)**.

- `δ` = quoted discount rate per year (stored, bounded `0 ≤ δ ≤ δ_max`). `P_PT(t) = 1 − δ × τ`, `P_YT(t) = δ × τ`, implied APY `= (1/(1 − δτ))^(1/τ) − 1`.
- Buy PT with `x` NEAR: `pt_out = floor( x / (P_PT × (1 + f)) )`. Sell PT: `x_out = floor( pt × P_PT × (1 − f) )`. Same for YT with `P_YT`.
- Inventory skew (derived, tune): `δ = δ0 + κ × (PT_sold_net / L)` where `L` is desk size in NEAR; clamp to `δ_max`.
- **Pros:** instant two-sided liquidity, PT visibly converges to par as `τ -> 0` (good demo chart), no `ln/exp`. **Cons:** pool is the counterparty so owner/LP bears the inventory risk; `δ` is a parameter, not market-discovered; not a real "AMM", so label it honestly.

#### Option C (rank 3): Pendle-style time-decaying logit AMM on PT/SY (+ YT by flash mint)

Exact algorithm from `MarketMathCore.sol` [S5] (formulas in F3.9). Implement in 18-decimal fixed point with Balancer-style `ln/exp`; no floats (whether NEAR rejects float instructions was not confirmed, see open questions).

1. `τ_s = expiry − now`; `rateScalar = scalarRoot × 365d / τ_s`; `totalAsset = totalSy × I`.
2. Re-anchor: `rateAnchor = exp(lastLnImpliedRate × τ_s/365d) − ln(p0/(1−p0))/rateScalar`, with `p0 = totalPt/(totalPt + totalAsset)`.
3. Trade `d` PT to the user (`d>0` buy PT): `p = (totalPt − d)/(totalPt + totalAsset)` (must be ≤ 0.96); `ER = ln(p/(1−p))/rateScalar + rateAnchor` (must be ≥ 1); `asset_pre = −d / ER`; `feeRate = exp(lnFeeRateRoot × τ_s/365d)`; if `d>0` require `ER/feeRate ≥ 1`, `fee = asset_pre × (1 − feeRate)`; else `fee = −(asset_pre × (1 − feeRate)/feeRate)`; `asset_user = asset_pre − fee`; `Δsy = asset_user / I`.
4. New state: `totalPt −= d`, `totalSy −= Δsy (+ reserve share)`, `lastLnImpliedRate = ln(ER_new) × 365d/τ_s`.
5. Buy YT with SY: flash-mint PT+YT from `s + borrowed` SY, sell the PT to the pool for `borrowed` SY, deliver YT. Sell YT: buy PT with SY, merge with YT to SY, repay. Exact-input needs a bounded solver (Exodus uses binary search, max 64 iterations).
6. Sanity vector (Exodus's own, re-checked by me, derived): `scalarRoot=10`, 90 days left, target implied APY 8.5% -> `rateScalar = 40.556`, `ER = 1.0203`, `PT price = 0.98009`.
- **Pros:** the design Pendle runs in production; PT and YT liquidity from one pool; strongest "real protocol" story. **Cons:** by far the most code and test surface (fixed-point log/exp, solver, gas on NEAR); 5 days left; **Exodus already ships this**, so it does not differentiate; a mispriced anchor on stage breaks the demo.

**Rejected baseline:** naive `x × y = k` PT/SY pool. It has no convergence to par, lets PT drift above 1, and gives LPs predictable losses [S1][S8]. If used, label it "demo AMM, not time-aware".

**Ranking for the next 5 days:** A first (smallest, flagship-aligned, most reliable under AI screening). Add B only if A is done and tested. Do C only if the contracts engineer has spare capacity and wants parity with Exodus; otherwise list it as "future work: time-decaying AMM", which is exactly what the PRD says (§10).

### R2. Display formulas for the frontend

All derived from F3 unless a source is named. `d = (expiry − now)/86400` (days, decimal), `τ = d/365`.

| Number | Formula | Notes |
|---|---|---|
| Days to maturity / countdown | `expiry − now` shown as D:H:M:S; status `Active` / `Matured` | Pendle shows expiry in market names, e.g. `PT-stETH-30DEC2027` [S7] |
| Underlying APY | `(I_now / I_7d_ago)^(365/7) − 1` | Pendle: "7-day moving average yield rate" [S1]; Exodus uses this formula [S16]; with a stepwise LST price use a 7-day window, not a 1-hour window |
| Index `I` | NEAR per stNEAR from `get_st_near_price / 1e24` | [S12] |
| PT price (NEAR) | `1 / ER` (AMM) or `1 − δτ` (Option B) or `1 − p_YT` (Option A) | `P_PT + P_YT = 1` [S1] |
| YT price (NEAR) | `1 − P_PT` | |
| Implied APY | `(1 + P_YT/P_PT)^(1/τ) − 1` | Pendle glossary [S1] |
| Fixed APY | same number as Implied APY | Pendle glossary [S1] |
| Fixed return at maturity | `1/P_PT − 1` per NEAR spent; `PT received = NEAR spent / P_PT` | |
| PT discount | `1 − P_PT` | Pendle API field `ptDiscount` [S7] |
| YT leverage | `1 / P_YT` | |
| Long Yield APY | `ROI = û × τ × (1 − f_YT) / P_YT − 1`; `APY = (1 + ROI)^(1/τ) − 1` | Pendle only defines it in words [S1]. I checked this formula against Pendle's live API for the PT-stETH-30DEC2027 market (`û`=2.3576%, 415 days, `f_YT`=5%, `P_YT`=0.025808): predicted ROI −1.22% vs API `ytRoi` −1.15% and APY −1.08% vs `ytFloatingApy` −1.01%. Close, not exact, so show it as an estimate (derived) [S7] |
| YT break-even underlying APY | `P_YT / τ` | |
| Accrued YT yield (portfolio) | `ytBal × (1/I_user − 1/I_now)` stNEAR, times `I_now` for NEAR | F3.4 |
| PT value now | `ptBal × P_PT` NEAR; at maturity `ptBal` NEAR | |
| Redeemable at maturity | `ptBal / I_now` stNEAR (value `ptBal × I_now/I_matured` if the rate fell) | F3.6 |
| Price impact | `(P_exec − P_spot)/P_spot` | standard |
| Min received | `quote × (1 − slippage)` | |

Worked check (derived): 100 stNEAR at I = 1.5 -> 150 PT + 150 YT. Index moves to 1.6: YT accrual `= 150 × (1/1.5 − 1/1.6) = 6.25 stNEAR = 10.0 NEAR`. Vault retains `93.75 stNEAR × 1.6 = 150 NEAR` = PT supply, so it stays solvent.

### R3. UI vocabulary (Pendle conventions)

Use these exact terms and field names (API field in parentheses where Pendle exposes it [S1][S7]):

- **Market** (one underlying + one maturity); **Maturity** / **Expiry** (`expiry`); **Days to maturity**; **Matured** state.
- **Underlying asset / Accounting asset** (shown in brackets in names: `PT stNEAR (NEAR)`); **Standardized Yield (SY)** is internal; show "stNEAR".
- **PT (Principal Token)**, **YT (Yield Token)**, naming `PT-stNEAR-<DDMMMYYYY>`, `YT-stNEAR-<DDMMMYYYY>` (Pendle pattern `PT-stETH-30DEC2027` [S7]).
- **Underlying APY** (`underlyingApy`), **Implied APY** (`impliedApy`), **Fixed APY**, **Long Yield APY** (`ytFloatingApy`; `ytRoi`), **PT Discount** (`ptDiscount`), **Liquidity**, **24h Volume**, **Fee**, **Yield range** (`yieldRange`).
- Actions: **Mint** (deposit -> PT + YT), **Redeem** (PT + YT, or PT after maturity), **Buy / Sell PT**, **Buy / Sell YT**, **Claim yield**, **Add / Remove liquidity** (if an AMM exists), plus **Sell future yield** (flagship; wording is the PRD's "Forward-Selling Yield").
- Screens (from Pendle docs; app UI itself not inspected): **Markets list**; **Market detail** (trade panel, implied vs underlying APY chart, PT/YT price, specs); **Mint/Redeem**; **Dashboard/Portfolio** with positions, accrued yield and a Claim button; maturity banner after expiry.
- Messages to copy in spirit from Pendle: "YT value trends toward 0 as maturity approaches" and "PT is redeemable 1:1 for the accounting asset" [S1].
- Label any DEMO rate source as "DEMO" everywhere (Exodus rule [S16]) and add a "not audited" note.

## Implications per role

**Contracts engineer**
- Core accounting: index `I = max(stored, current)`; mint `SY × I`; redeem `PY / I`; YT interest `ytBal × (1/I_user − 1/I_now)`; settle both sides on any YT transfer; freeze the index at the first post-expiry settle (F3).
- Use a 256-bit mul-div; stNEAR amounts times a 24-decimal index overflow `u128` (F4).
- Rounding: floor payouts, ceil debts (F5).
- Index source must be pluggable: real `meta-pool.near::get_st_near_price`, plus a labeled DEMO source with an increase-only rate so the demo can show yield and maturity in minutes (F8). The real price moves in steps a few times a day (F4).
- Gate state changes on index freshness and expose a permissionless refresh (the real read is async); keep a keeper path (F5 #9).
- Pick Option A first (R1). It needs no `ln/exp`. Test vectors: the 1.5 -> 1.6 example (6.25 stNEAR), and mint-then-redeem never returns more than deposited.
- Do not commit to Option C unless A is finished; a same-window competitor already has it.

**Frontend engineer**
- Implement the R2 display formulas and R3 vocabulary; the single most important screen is Market detail with Implied vs Underlying APY, countdown, and a "Sell future yield" panel.
- Show percentages and APY, not NEAR value: a 30-day YT on 150 NEAR is about 0.48 NEAR at 3.9% APY (F4), so large numbers are only possible with a long maturity or the DEMO rate.
- Read the index from RPC through FastNEAR with a fallback; do not hard-wire `rpc.testnet.near.org` [S16][S19].
- Always render a visible `DEMO` badge on the demo market.
- Handle three states cleanly: active, matured-unsettled, matured-settled.

**QA / demo**
- Treat the 3-minute script in Option A as the acceptance test; rehearse on the target wallet. Pre-register storage and pre-fund seller and buyer accounts.
- Prepare two paths: a live path on testnet (short maturity + DEMO rate bump) and a recorded fallback video; the post needs a video anyway [S15].
- The README must give "do X - see Y" steps, contract IDs and tx links; Claude Code/Codex will run it first [S15].
- Re-check the competitor before filing (github.com/ayoubbuoya/exodus-near) and re-check the "first" wording; reword to a narrow claim (F2).
- Before publishing externally, re-run the DefiLlama protocol query for chain `Near`.
- Deadline checklist: public repo + LICENSE, X post with @NEARProtocol and #NEARHackathon, one form submission, hosted demo kept alive to 11-18 (ideally 11-25).

## Assumptions and open questions

1. **Positioning wording** is a product decision. My evidence says unqualified "first on NEAR" fails today because of Exodus; the narrow forms need a re-check on the day of publishing. X and gov.near.org were not searchable, so a third project could exist (assumption).
2. **Exodus's current deployment status** (testnet contract IDs, whether anything is on mainnet) was not verified on-chain; I read only its docs and commit log [S16].
3. **Floats on NEAR:** I could not confirm whether the NEAR runtime rejects floating-point instructions at deploy time. Community material is mixed [S18]. Exodus's "no floats on-chain" is a design choice, not proof. The toolchain research should settle this before choosing Option C.
4. **Meta Pool price update cadence:** I measured jumps but not the exact update trigger; Meta Pool's FAQ says "every epoch" (read via a search snippet, not opened). The 3.9% APY is two reads 17 days apart, not a long-run APY.
5. **Pendle fee/revenue figures** on DefiLlama were inconsistent with its volume series (30d fees $0.52M vs volume $1.43B) and are not used. Volume methodology counts the position size for YT trades [S11].
6. **Long Yield APY formula** is my reconstruction (R2); Pendle publishes no formula, so it should be labelled "estimate".
7. **Time-warp evidence:** only one hackathon project (Exodus) documents a mock-rate plus short-maturity demo; I found no NEAR-sandbox fast-forward confirmation (Exodus U5 is `todo`). I did not find hackathon projects that time-warp on EVM chains in the sources I could open. Anything beyond "short maturity at deploy + admin rate bump" is untested.
8. **Spectra, Tonstakers, Perena/Kamino items** come partly from search snippets and a Substack post (marked in F1); treat as leads, not facts.
9. **NEAR hackathon scoring** is not a formal rubric; the "technical implementation, design, impact, originality, sustainability" list is from the organizers' page describing previous editions [S15].
10. **rNEAR (Rhea's own LST, TVL $66M) as an underlying** might resonate with a Rhea-partnered hackathon; I did not check its rate interface. The PRD scopes stNEAR for MVP (assumption: keep stNEAR, treat rNEAR as roadmap).
11. Pendle's app UI itself was not opened; screen names come from docs, the API and the glossary.

## Sources

All read on 2026-11-09. Data pulled live on that date (DefiLlama, RPC, GitHub, Pendle API) reflects values at that time.

- **[S1]** Pendle docs, concatenated reference (Glossary, PT, YT, SY, Minting, AMM, Fees, Yield Tokenization contracts, PendleMarket, Linear Discount Oracle, FAQ): https://docs.pendle.finance/llms-full.txt (index at https://docs.pendle.finance/llms.txt)
- **[S2]** `PendleYieldToken.sol`: https://raw.githubusercontent.com/pendle-finance/pendle-core-v2-public/main/contracts/core/YieldContracts/PendleYieldToken.sol
- **[S3]** `InterestManagerYT.sol`: https://raw.githubusercontent.com/pendle-finance/pendle-core-v2-public/main/contracts/core/YieldContracts/InterestManagerYT.sol
- **[S4]** `PYIndex.sol`, `SYUtils.sol`: https://raw.githubusercontent.com/pendle-finance/pendle-core-v2-public/main/contracts/core/StandardizedYield/PYIndex.sol and `.../SYUtils.sol`
- **[S5]** `MarketMathCore.sol`: https://raw.githubusercontent.com/pendle-finance/pendle-core-v2-public/main/contracts/core/Market/MarketMathCore.sol
- **[S6]** Pendle V2 AMM whitepaper: https://github.com/pendle-finance/pendle-v2-resources/raw/main/whitepapers/V2_AMM.pdf
- **[S7]** Pendle API (live market data, field names): https://api-v2.pendle.finance/core/v1/1/markets/active and https://api-v2.pendle.finance/core/v1/1/markets/0x34280882267ffa6383b363e278b027be083bbe3b
- **[S8]** YieldSpace paper (Niemerg, Robinson, Livnev): https://yield.is/YieldSpace.pdf
- **[S9]** Spectra: https://docs.spectra.finance/docs/spectra/core-concepts/principal-and-yield-token and https://github.com/perspectivefi/spectra-core
- **[S10]** Exponent docs: https://docs.exponent.finance/developer-core/overview , https://docs.exponent.finance/user-documentation/overview-protocol-concepts , https://docs.exponent.finance/user-documentation/yield-markets
- **[S11]** DefiLlama: https://api.llama.fi/protocols , https://api.llama.fi/protocol/pendle-v2 , https://api.llama.fi/v2/chains , https://api.llama.fi/summary/dexs/pendle-v2 , https://api.llama.fi/summary/dexs/pendle , https://yields.llama.fi/pools , https://coins.llama.fi/prices/current/coingecko:near (NEAR $3.54 at read time)
- **[S12]** NEAR RPC reads (mainnet): `meta-pool.near` `get_st_near_price`, `ft_total_supply`, `get_contract_state`; `linear-protocol.near` `ft_total_supply`, `ft_price`; testnet `meta-v2.pool.testnet` `get_st_near_price`; block 223771842 (2026-11-09 13:14 UTC) and block 221179842 (2026-10-23 02:52 UTC); endpoints https://rpc.mainnet.near.org , https://free.rpc.fastnear.com , https://archival-rpc.mainnet.near.org , https://rpc.testnet.near.org
- **[S13]** Meta Pool contract source: https://github.com/Meta-Pool/liquid-staking-contract (`metapool/src/internal.rs`); Meta Pool FAQ (opened via search result only): https://docs.metapool.app/master/faq-frequently-asked-questions/faq-meta-pool
- **[S14]** Cointelegraph, NEAR issuance proposal HSP-029, 2026-11-03: https://cointelegraph.com/markets/near-sinks-7-proposal-cut-annual-token-issuance-passes
- **[S15]** NEAR HACKATHON: https://nearhackathon.com , https://nearhackathon.com/HACKATHON.md , https://github.com/nearai/near-hackathon-prompt-examples/blob/main/tracks/01-defi.md (raw: https://raw.githubusercontent.com/nearai/near-hackathon-prompt-examples/main/tracks/01-defi.md)
- **[S16]** Exodus on NEAR (competitor): https://github.com/ayoubbuoya/exodus-near (README.md, docs/SPEC.md, docs/HANDOFF.md, docs/overview.md, commit log read via `gh api`)
- **[S17]** OpenZeppelin ERC-4626 inflation attack: https://docs.openzeppelin.com/contracts/5.x/erc4626
- **[S18]** Other prior art and leads: Sense v1 https://github.com/sense-finance/sense-v1 ; Notional v3 docs https://docs.notional.finance/notional-v3/ ; Term Finance (secondary) https://www.blocmates.com/protocol-focus/term-finance-introducing-collateralized-fixed-rate-auctions-on-chain ; Element DAO proposal https://gl.app/dao/elfi.eth/proposals/0x45071a161b2364a9fa2d4c86cd9059d11a118d7deaeae9db8ceed65d0d7bd4ff ; Timeless https://github.com/timeless-fi/timeless ; Spectra on Stellar https://cryptobriefing.com/spectra-finance-fixed-term-markets-stellar/ ; Tonstakers https://tonstakers.com/faq/en/article/how-does-yield-tokenization-work-in-tonstakers-earn (snippet) ; Solana Pendle comps (Substack, snippet) https://wrpro.substack.com/p/exploring-pendle-comps-on-solana ; Phoenix Bonds https://github.com/linear-protocol/phoenix-bonds ; hackathon PT/YT projects: https://hackquest.io/projects/Yield-Tokenizer-Pension , https://ethglobal.com/showcase/nandmala-rhc28 , https://github.com/skar8848/XRPL-Hack ; arXiv https://arxiv.org/abs/2505.22784 ; NEAR float discussion (community) https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/65770753/can-i-use-floating-points-in-near-protocol
- **[S19]** NEAR RPC providers: https://docs.near.org/api/rpc/providers
- **[S20]** Rhea: https://guide.rhea.finance/ ; GitHub org https://github.com/rhea-finance (via `gh repo list`); Rhea partner notes in [S15]
