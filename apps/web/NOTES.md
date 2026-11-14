# apps/web notes

Next.js 16 App Router, React 19, Tailwind v4. Dark-only, Backgrounds Supply style (void black, pink accent, serif-italic accent words, hairline cards). PT is ice `#B3F4FF`, YT is pink `#FE3D70`.

## Routes
- `/` landing: hero, problems, live ticker, asset cards, series card, FAQ, footer.
- `/strip`, `/trade`, `/portfolio`, `/settle`: in route group `app/(app)` with a shared header and fake-mode demo clock.
- Pages and layouts are Server Components. Every screen is a `'use client'` leaf in `components/app/`.

## Modes
- `NEXT_PUBLIC_RHEA_MODE` is read by `getMode()` from `@rhea/sdk` in `components/app/providers.tsx` (server) and passed to `RheaProvider`.
- `pnpm dev` runs `fake`: in-memory FakeChain, header account switcher (Alice, Bob, Maker), a "Demo clock" panel (+1 min, +5 min, jump to maturity).
- `pnpm dev:testnet` runs `testnet`: wallet via `@hot-labs/near-connect` (`lib/rhea/connector.ts`, loaded lazily, client only). If the SDK cannot build a testnet client (for example `deployed: false`), the provider falls back to fake and shows a notice.
- Both modes run through the same `useTxPlan()` hook (`lib/rhea/use-tx-plan.ts`): plan from the SDK, then `PlanExecutor` (`lib/rhea/executors.ts`) runs each step in order and the Stepper shows progress, simulated tx ids (fake) or explorer links (testnet).

## Layout
- `components/ui/`: Button, Card, Pill, Input/AmountField, Row, Accordion, Marquee, GlassNav, Modal, Toast, Stepper, Countdown, Progress, Tabs, Slider, ChromeCta, Logo.
- `components/landing/`: landing sections. `components/app/`: screens and shared app pieces.
- `lib/rhea/`: context, polling hooks (5 s fake, 10 s testnet), errors, executors. `lib/market.ts`: offer metrics. `lib/format.ts`, `lib/amount.ts`.
- Tokens live in `app/globals.css` (`@theme`). Satoshi is self-hosted from `app/fonts/`, Inter and Instrument Serif come from `next/font/google`.

## Known gaps
- Testnet wallet flow is untested end to end: wallet popups cannot be automated and contracts are not deployed yet.
- Fake state lives in memory and resets on reload.
- Series progress bar uses the deployment time (or first time seen) as the start of the term.
- Instrument Serif stands in for Editor's Note.
- Run `pnpm build` only when no cargo build is running (14 GB machine).
