import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/pill";
import { AssetCard } from "./asset-card";
import { AssetStage } from "./asset-stage";
import { Headline } from "./headline";
import { Reveal } from "./reveal";

const upcoming = [
  { symbol: "LiNEAR", name: "Liquid staked NEAR", description: "Another NEAR liquid staking token." },
  { symbol: "RHEA LP", name: "Rhea liquidity position", description: "Fees earned by liquidity providers." },
  { symbol: "USDY", name: "Tokenized treasury yield", description: "Dollar-denominated yield from treasuries." },
  { symbol: "BUIDL", name: "Tokenized money market", description: "Institutional money market fund shares." },
] as const;

function StepLabel({ step, children }: { step: number; children: ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2.5 text-ui font-medium text-fg-65">
      <span className="num inline-flex size-6 items-center justify-center rounded-pill bg-fill-10 text-[12px] text-fg">{step}</span>
      {children}
    </p>
  );
}

export function AssetSelect() {
  return (
    <section id="markets" aria-labelledby="markets-title" className="bg-ink px-4 py-20 md:px-8 md:py-30 xl:px-30">
      <div className="mx-auto max-w-page">
        <Reveal className="text-center">
          <Eyebrow>Markets</Eyebrow>
          <Headline
            as="h2"
            id="markets-title"
            segments={[{ text: "Pick an asset to" }, { text: "strip.", accent: true }]}
            className="mt-2.5 text-title font-normal text-fg md:text-h2"
          />
          <p className="mx-auto mt-4 max-w-[560px] text-body text-fg-65">
            Stripping splits one staked token into a principal token and a yield token. Start with mstNEAR, then hold or trade
            each half.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-8 md:mt-16 xl:grid-cols-[300px_minmax(0,1fr)] xl:gap-6">
          <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
            <StepLabel step={1}>Choose an asset</StepLabel>
            <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-8 md:px-8 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0 xl:pb-0 [&::-webkit-scrollbar]:hidden">
              <li className="w-[250px] shrink-0 snap-start md:w-[280px] xl:w-auto">
                <Reveal className="h-full">
                  <AssetCard
                    symbol="mstNEAR"
                    name="Mock staked NEAR"
                    description="A demo token with the Meta Pool stNEAR interface."
                    href="/strip"
                    selected
                  />
                </Reveal>
              </li>
              {upcoming.map((asset, index) => (
                <li key={asset.symbol} className="w-[210px] shrink-0 snap-start md:w-[230px] xl:w-auto">
                  <Reveal className="h-full" delay={0.08 * (index + 1)}>
                    <AssetCard {...asset} />
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <StepLabel step={2}>See the split, then strip it</StepLabel>
            <AssetStage />
          </div>
        </div>
      </div>
    </section>
  );
}
