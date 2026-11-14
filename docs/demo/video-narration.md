# Demo video narration (about 2:05, English, 9 segments)

One voice file per segment: `video/audio/s01.mp3` ... `s09.mp3`. Each scene in the video is cut to its segment's length.
Rule: say what is mocked, never say "first" or "only".

## s01 — hook (landing)
If you stake NEAR, your yield trickles in slowly, and you can't spend it before you earn it. Rhea Strip splits a staked NEAR token into principal and yield, and lets you sell the yield early.

## s02 — what is mocked (series card)
This is a hackathon build on NEAR testnet. The token is a mock with the Meta Pool stNEAR interface, and a demo clock squeezes a year of yield into about an hour.

## s03 — connect
Connect with a ready-funded demo account, or bring your own wallet. I'll use Alice. Every click from here is a real testnet transaction.

## s04 — strip
Ten staked NEAR goes into the vault. The app syncs the index, registers my tokens, and mints a principal token, PT, and a yield token, YT, of equal value. Ice is principal. Pink is yield.

## s05 — sell future yield
Now the flagship move: selling yield I haven't earned yet. I choose the implied APY I'll accept, and the upfront price follows from the formula. A lower APY means less money now. I list five YT in the vault's offer book. No AMM, no fees, all-or-nothing fills.

## s06 — Bob buys
Bob is a second account who wants yield exposure. He buys the offer, paying in mstNEAR, and takes over the YT. Interest earned before the fill stays with Alice. Bob earns from now on.

## s07 — portfolio
Back on Alice's portfolio: her PT, the rest of her YT, and the sale proceeds waiting as a credit. One click withdraws them as mstNEAR.

## s08 — settlement
At maturity the series settles and the index freezes. PT redeems for the underlying at that index. The YT pays out the yield it accrued, and is burned. Bob claims only what accrued since his fill.

## s09 — close
Rhea Strip: split yield from principal, and trade either side. NEAR testnet, mock yield, not audited. The repo and a one-command test are in the post.
