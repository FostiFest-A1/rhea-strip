"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type TargetAndTransition,
  type Transition,
  type Variants,
} from "motion/react";
import { fmtApy, ptPrice, tauYears, ytPrice } from "@rhea/sdk/pricing";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { Pill } from "@/components/ui/pill";
import { Progress } from "@/components/ui/progress";
import { amount, elapsedFraction, maturityLabel, ptSymbol } from "@/lib/format";
import { cn } from "@/lib/cn";
import { useRhea } from "@/lib/rhea/context";
import { useNow, usePolled, useTermStart } from "@/lib/rhea/hooks";
import { MainnetReferenceStat } from "./mainnet-reference-stat";
import { EASE_OUT_EXPO } from "./reveal";

const INTRO_MS = 2000;
const TALLY_DELAY_SECONDS = 1.35;
const TALLY_SECONDS = 0.9;
const RIPPLE_SECONDS = 2.4;
const RIPPLE_PAUSE_SECONDS = 0.9;
const SPLIT_PX = 7;
const SPREAD_PX = 12;
const CARD_LIFT_PX = 4;

type StageState = "hidden" | "show" | "rest" | "spread";

function timing(reduced: boolean, delay: number, duration: number): Transition {
  return reduced ? { duration: 0 } : { delay, duration, ease: EASE_OUT_EXPO };
}

function buildVariants(reduced: boolean) {
  const t = (delay: number, duration: number) => timing(reduced, delay, duration);
  const settle: Transition = reduced ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 26 };
  const splitTiming: Transition = reduced ? { duration: 0 } : { y: { delay: 1, duration: 0.55, ease: EASE_OUT_EXPO } };

  const variant = (
    hidden: TargetAndTransition,
    final: TargetAndTransition,
    intro: Transition,
    spread: TargetAndTransition = final,
  ): Variants => ({
    hidden,
    show: { ...final, transition: intro },
    rest: { ...final, transition: settle },
    spread: { ...spread, transition: settle },
  });

  return {
    stage: variant({ opacity: 0, y: 24 }, { opacity: 1, y: 0 }, t(0, 0.8)),
    block: variant({ opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 }, t(0.25, 0.7)),
    label: {
      ...variant({ opacity: 0 }, { opacity: 0 }, t(0.25, 1)),
      show: {
        opacity: [0, 1, 1, 0],
        transition: reduced ? { duration: 0 } : { delay: 0.25, duration: 1, times: [0, 0.3, 0.75, 1] },
      },
    },
    top: variant({ y: 0 }, { y: -SPLIT_PX }, splitTiming, { y: -SPREAD_PX }),
    bottom: variant({ y: 0 }, { y: SPLIT_PX }, splitTiming, { y: SPREAD_PX }),
    tint: variant({ opacity: 0 }, { opacity: 1 }, t(1, 0.4)),
    letters: variant({ opacity: 0 }, { opacity: 1 }, t(1.15, 0.4)),
    trunk: variant({ scale: 0 }, { scale: 1 }, t(0.55, 0.35)),
    bar: variant({ scale: 0 }, { scale: 1 }, t(0.8, 0.25)),
    branch: variant({ scale: 0 }, { scale: 1 }, t(0.95, 0.3)),
    ptCard: variant({ opacity: 0, x: -20, y: 0 }, { opacity: 1, x: 0, y: 0 }, t(1.15, 0.6), { opacity: 1, x: 0, y: -CARD_LIFT_PX }),
    ytCard: variant({ opacity: 0, x: -20, y: 0 }, { opacity: 1, x: 0, y: 0 }, t(1.27, 0.6), { opacity: 1, x: 0, y: CARD_LIFT_PX }),
    glow: variant({ opacity: 0 }, { opacity: 0.4 }, t(1.3, 0.6), { opacity: 1 }),
  } satisfies Record<string, Variants>;
}

function Tally({ value, digits, play }: { value: number | undefined; digits: number; play: boolean }) {
  const reduced = useReducedMotion();
  const progress = useMotionValue(0);
  const target = useMotionValue(value ?? 0);
  const text = useTransform(() => (target.get() * progress.get()).toFixed(digits));

  useEffect(() => {
    target.set(value ?? 0);
  }, [value, target]);

  useEffect(() => {
    if (!play) return;
    if (reduced) {
      progress.set(1);
      return;
    }
    const controls = animate(progress, 1, { delay: TALLY_DELAY_SECONDS, duration: TALLY_SECONDS, ease: EASE_OUT_EXPO });
    return () => controls.stop();
  }, [play, reduced, progress]);

  if (value === undefined) return <span>...</span>;
  return <motion.span>{text}</motion.span>;
}

const TOKENS = {
  pt: {
    symbol: "PT",
    name: "Principal Token",
    line: "Redeems your principal in mstNEAR after maturity. The fixed side.",
    value: "text-ice",
    ring: "shadow-pt-line",
    glow: "bg-[radial-gradient(90%_130%_at_0%_50%,#b3f4ff29,transparent_70%)]",
  },
  yt: {
    symbol: "YT",
    name: "Yield Token",
    line: "Collects the staking yield until maturity. The variable side.",
    value: "text-pink",
    ring: "shadow-yt-line",
    glow: "bg-[radial-gradient(90%_130%_at_0%_50%,#fe3d702e,transparent_70%)]",
  },
} as const;

type OutputCardProps = {
  token: keyof typeof TOKENS;
  price: number | undefined;
  play: boolean;
  variants: Variants;
  glowVariants: Variants;
  className?: string;
};

function OutputCard({ token, price, play, variants, glowVariants, className }: OutputCardProps) {
  const config = TOKENS[token];
  return (
    <motion.div
      variants={variants}
      className={cn("relative h-full overflow-hidden rounded-2xl bg-ink p-4 md:p-5", config.ring, className)}
    >
      <motion.span aria-hidden="true" variants={glowVariants} className={cn("pointer-events-none absolute inset-0", config.glow)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-1.5">
          <Pill tone={token}>{config.symbol}</Pill>
          <p className="text-ui text-fg-65">{config.name}</p>
        </div>
        <p className="num text-right">
          <span className={cn("block text-title leading-none font-medium", config.value)}>
            <Tally value={price} digits={4} play={play} />
          </span>
          <span className="mt-1 block text-ui text-fg-50">NEAR</span>
        </p>
      </div>
      <p className="relative mt-3 text-ui leading-5 text-fg-80">{config.line}</p>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <dl className="flex flex-col gap-1">
      <dt className="text-ui text-fg-65">{label}</dt>
      <dd className="num text-lead font-medium text-fg">{value}</dd>
    </dl>
  );
}

export function AssetStage() {
  const { client } = useRhea();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.25 });
  const onScreen = useInView(ref, { amount: 0.05 });
  const play = seen || Boolean(reduced);
  const [introDone, setIntroDone] = useState(false);
  const [engaged, setEngaged] = useState(false);

  const { data: series, error } = usePolled((c) => c.series(), 5000);
  const now = useNow();
  const deployment = client.deployment();
  const maturityMs = series?.maturityMs ?? deployment.maturityMs;
  const termStart = useTermStart(maturityMs, deployment.deployedAt);
  const rate = deployment.aprBps / 10_000;
  const tau = series ? tauYears(series.maturityMs, now, series.yearSecs) : undefined;
  const ptAtMock = tau === undefined ? undefined : ptPrice(rate, tau);
  const ytAtMock = tau === undefined ? undefined : ytPrice(rate, tau);

  const variants = useMemo(() => buildVariants(Boolean(reduced)), [reduced]);

  useEffect(() => {
    if (!play) return;
    const timer = window.setTimeout(() => setIntroDone(true), INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [play]);

  const spread = engaged && introDone && !reduced;
  const ripple = introDone && onScreen && !reduced;
  const state: StageState = !play ? "hidden" : !introDone ? "show" : spread ? "spread" : "rest";

  return (
    <motion.div ref={ref} variants={variants.stage} initial="hidden" animate={state}>
      <Card className="bg-ink-card p-5 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Pill tone="warn">Mock stNEAR, demo clock</Pill>
        </div>

        <h3 className="mt-5 text-title font-normal text-fg md:text-h3">
          1 mstNEAR in. A <span className="serif-accent text-ice">PT</span> and a <span className="serif-accent text-pink">YT</span> out.
        </h3>
        <p className="mt-3 max-w-[560px] text-body text-fg-65">
          mstNEAR is a demo token with the Meta Pool stNEAR interface. Its price rises on a schedule, so yield is visible in
          minutes.
        </p>

        <div className="mt-8 grid grid-cols-[64px_minmax(0,1fr)] grid-rows-[auto_1fr_1fr] md:grid-cols-[auto_minmax(56px,1fr)_minmax(0,1.5fr)] md:grid-rows-[1fr_1fr]">
          <div className="col-start-1 row-start-1 md:row-span-2 md:self-center">
            <motion.div variants={variants.block} className="relative size-16 md:size-28">
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-px rounded-3xl border border-fg-40"
                initial={{ opacity: 0, scale: 1 }}
                animate={ripple ? { opacity: [0.5, 0], scale: [1, 1.55] } : { opacity: 0, scale: 1 }}
                transition={
                  ripple
                    ? { duration: RIPPLE_SECONDS, ease: "easeOut", repeat: Infinity, repeatDelay: RIPPLE_PAUSE_SECONDS }
                    : { duration: 0 }
                }
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div variants={variants.top} className="relative h-[44%] w-full overflow-hidden rounded-pill bg-fill-20 shadow-glass">
                  <motion.span aria-hidden="true" variants={variants.tint} className="absolute inset-0 bg-ice" />
                  <motion.span
                    variants={variants.letters}
                    className="absolute inset-0 grid place-items-center text-[13px] font-bold text-ink-card md:text-lead"
                  >
                    PT
                  </motion.span>
                </motion.div>
                <motion.div variants={variants.bottom} className="relative h-[44%] w-full overflow-hidden rounded-pill bg-fill-20 shadow-glass">
                  <motion.span aria-hidden="true" variants={variants.tint} className="absolute inset-0 bg-pink" />
                  <motion.span
                    variants={variants.letters}
                    className="absolute inset-0 grid place-items-center text-[13px] font-bold text-fg md:text-lead"
                  >
                    YT
                  </motion.span>
                </motion.div>
              </div>
              <span className="absolute top-full left-1/2 mt-3 hidden -translate-x-1/2 text-ui font-medium whitespace-nowrap text-fg-65 md:block">
                from 1 mstNEAR
              </span>
              <motion.p
                variants={variants.label}
                className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none"
              >
                <span className="num text-title font-medium text-fg">1</span>
                <span className="mt-1 text-[11px] font-bold text-fg md:text-ui">mstNEAR</span>
              </motion.p>
            </motion.div>
          </div>

          <p className="col-start-2 row-start-1 self-center pl-4 text-ui text-fg-65 md:hidden">1 mstNEAR splits into two tokens</p>

          <div aria-hidden="true" className="relative col-start-1 row-span-2 row-start-2 md:col-start-2 md:row-start-1">
            <motion.span
              variants={variants.trunk}
              className="absolute top-0 left-1/2 -ml-px h-1/4 w-0.5 origin-top bg-fg-40 md:top-1/2 md:left-0 md:-mt-px md:ml-0 md:h-0.5 md:w-1/2 md:origin-left"
            />
            <motion.span
              variants={variants.bar}
              className="absolute top-1/4 left-1/2 -ml-px h-1/2 w-0.5 origin-center bg-linear-to-b from-ice to-pink"
            />
            <motion.span
              variants={variants.branch}
              className="absolute top-1/4 right-0 left-1/2 -mt-px h-0.5 origin-left bg-ice after:absolute after:top-1/2 after:right-0 after:size-2 after:-translate-y-1/2 after:rounded-pill after:bg-ice after:content-['']"
            />
            <motion.span
              variants={variants.branch}
              className="absolute top-3/4 right-0 left-1/2 -mt-px h-0.5 origin-left bg-pink after:absolute after:top-1/2 after:right-0 after:size-2 after:-translate-y-1/2 after:rounded-pill after:bg-pink after:content-['']"
            />
          </div>

          <div className="col-start-2 row-start-2 py-1.5 md:col-start-3 md:row-start-1">
            <OutputCard token="pt" price={ptAtMock} play={play} variants={variants.ptCard} glowVariants={variants.glow} />
          </div>
          <div className="col-start-2 row-start-3 py-1.5 md:col-start-3 md:row-start-2">
            <OutputCard token="yt" price={ytAtMock} play={play} variants={variants.ytCard} glowVariants={variants.glow} />
          </div>
        </div>

        <p className="mt-4 text-ui text-fg-50">
          Prices at the mock rate{series ? ` of ${fmtApy(rate)}` : ""}. A PT and a YT add up to the 1 mstNEAR you strip.
        </p>

        {series ? (
          <div className="mt-8 rounded-2xl bg-fill-5 p-4 shadow-input md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-ui text-fg-65">Series</p>
                <h3 className="mt-1 text-title font-normal text-fg">{ptSymbol(series.maturityMs)}</h3>
                <p className="mt-1 text-ui text-fg-65">Matures {maturityLabel(series.maturityMs)}</p>
              </div>
              <Countdown remainingMs={series.maturityMs - now} />
            </div>
            <Progress
              className="mt-5"
              label="Series term elapsed"
              value={play ? elapsedFraction(termStart, series.maturityMs, now) : 0}
              tone="pink"
            />
            <div className="mt-5 grid grid-cols-2 gap-5 md:grid-cols-[1fr_1fr_2fr] md:items-center">
              <Stat label="Underlying APY (mock)" value={fmtApy(rate)} />
              <Stat label="Stripped so far" value={`${amount(series.totalSy, 2)} mstNEAR`} />
              <div className="col-span-2 md:col-span-1">
                <MainnetReferenceStat />
              </div>
            </div>
          </div>
        ) : (
          <div
            aria-busy={!error}
            className="mt-8 flex min-h-[232px] items-center rounded-2xl bg-fill-5 p-5 shadow-input"
          >
            <p className="text-body text-fg-65">{error ? `Series unavailable: ${error}` : "Loading series"}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <ButtonLink
            href="/strip"
            variant="pink"
            size="lg"
            className="group shadow-pink md:w-auto md:min-w-[280px]"
            onPointerEnter={(event) => setEngaged(event.pointerType === "mouse")}
            onPointerLeave={() => setEngaged(false)}
            onFocus={() => setEngaged(true)}
            onBlur={() => setEngaged(false)}
          >
            Strip mstNEAR
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="size-5 transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 10h12M11 5l5 5-5 5" />
            </svg>
          </ButtonLink>
          <ButtonLink href="/trade" variant="glass" className="md:w-auto">
            View offers
          </ButtonLink>
          <Link
            href="/portfolio"
            className="inline-flex h-12 items-center justify-center px-3 text-ui font-medium text-fg-65 transition-colors hover:text-fg"
          >
            Portfolio
          </Link>
        </div>
        <p className="mt-4 text-ui text-fg-50">Next: hold both until maturity, or trade either one.</p>
      </Card>
    </motion.div>
  );
}
