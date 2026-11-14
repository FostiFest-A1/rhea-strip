import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { Pill } from "@/components/ui/pill";
import { Headline } from "./headline";
import { HeroDots } from "./hero-dots";

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-ink px-4 pt-28 pb-28 md:px-8 xl:px-30"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div className="hero-ribbon" data-drift="true" />
        <HeroDots className="absolute inset-0 size-full" />
        <div className="hero-bowl" />
        <div className="hero-fade" />
      </div>

      <div className="mx-auto flex max-w-[1000px] flex-col items-center text-center">
        <LogoMark className="mb-6 size-16 md:size-20" />
        <Pill className="mb-8">NEAR testnet demo with mock yield and a demo clock</Pill>
        <Headline
          reveal
          id="hero-title"
          segments={[{ text: "Split yield from principal." }, { text: "Trade", accent: true }, { text: "either side." }]}
          className="text-[44px] leading-[1.02] font-normal tracking-tightest text-fg md:text-[64px] md:leading-[72px] xl:text-display"
        />
        <p className="mt-4 max-w-[640px] text-lead text-fg-80">
          Rhea Strip splits a liquid-staked NEAR token into a principal token and a yield token. Lock in a fixed return,
          or sell the yield you have not earned yet.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          <ButtonLink href="/strip" variant="spark">
            Launch app
          </ButtonLink>
          <ButtonLink href="#how" variant="glass">
            How it works
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
