# X post draft

Rules from the hackathon (`https://nearhackathon.com/HACKATHON.md`): the post is public, says the project was built at NEAR HACKATHON, tags @NEARProtocol and #NEARHackathon, and carries the demo video or screenshots. The human posts it and gives the link for the submission form (`demoUrl`). Fill the `<...>` placeholders; do not post before the repo is public and the hosted demo works.

Wording rules for this project: no "first" or "only"; say what is mocked (mock yield on a demo clock, NEAR testnet, not audited); explain NEAR's role concretely; lead with the user problem; end with a next step.

## Main post (275 characters with a 23-character link, inside the 280 limit)

```
Staked NEAR earns yield you can't touch until later.

Rhea Strip splits it into PT (principal) and YT (yield) so you can sell future yield today.

Built at NEAR HACKATHON. Testnet, mock yield on a demo clock, not audited.

<repo-url> @NEARProtocol #NEARHackathon
```

Attach: the 3-minute video (`docs/demo/demo-script.md`), or the two screenshots `qa/artifacts/demo-3a-sell-yield.png` and `qa/artifacts/demo-6-settled.png` if the video is not ready.

## Optional replies (a short thread)

1. How it works, one moment:
```
The flow in the video: Alice strips 10 mock staked NEAR into PT + YT, lists 5 YT at the APY she will accept, Bob buys it, Alice withdraws the upfront mstNEAR. At maturity PT redeems and YT claims. Interest Alice earned before the sale stays hers.
```
2. NEAR's role:
```
Why NEAR: the vault, the YT token and the offer book are Rust contracts on NEAR testnet. A strip or a buy is one ft_transfer_call that reads the staking token's price in the same receipt chain, and the app batches storage registration with the deposit in one wallet prompt.
```
3. Honest labels and next step:
```
What is mocked: the staking token (Meta Pool stNEAR interface, price rises on a schedule, 1 hour = 1 year), the book is maker-priced instead of an AMM, testnet only. Try it without a wallet: pnpm install && pnpm e2e:fake && pnpm dev. What would you want to trade first, PT or YT?
```

## Variants

Short (under 200 characters, for the quote-tweet or a reply to the NEAR hackathon post):
```
Sell your staking yield before you earn it. Rhea Strip splits staked NEAR into PT + YT on testnet. Built at NEAR HACKATHON. <repo-url> @NEARProtocol #NEARHackathon
```

Optional extra tags (the organizers say they amplify): @NearLegion @NearBuilders.

## Claims checklist before posting

| Claim in the post | Evidence |
|---|---|
| "Contracts on testnet" | `deployments/testnet.json` (`deployed: true`), account ids in the README, `get_series` view works |
| "mock yield on a demo clock" | `contracts/mock-stnear`, `year_secs` 3600 |
| "not audited" | `docs/qa/contract-review.md` is a self-run review, not a third-party audit |
| "Alice keeps interest earned before the sale" | `pnpm e2e:fake` asserts attribution; `qa/specs/demo-path.spec.ts` step 5 checks Alice's accrual is positive and survives the fill |
| "one ft_transfer_call reads the price in the same receipt chain" | `contracts/strip-vault/src/lib.rs` `start_strip` and `on_strip_index` |
| "no wallet needed to try" | `pnpm dev` runs fake mode |
| No "first", "only", "audited", "mainnet", "real yield" | re-read the final text; also re-check `github.com/ayoubbuoya/exodus-near` (active on 2026-11-09, testnet contracts and a demo script) before posting |
