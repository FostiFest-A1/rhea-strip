import { Accordion, type AccordionItem } from "@/components/ui/accordion";
import { Eyebrow } from "@/components/ui/pill";

const items: AccordionItem[] = [
  {
    id: "pt-yt",
    question: "What are PT and YT?",
    answer:
      "Strip a yield-bearing token and you receive two tokens. The principal token (PT) redeems for the deposited value at maturity. The yield token (YT) collects the yield the deposit earns until maturity. PT is ice, YT is pink everywhere in the app.",
  },
  {
    id: "mock",
    question: "Is the yield real?",
    answer:
      "No. This demo runs on NEAR testnet with a mock staked token (mstNEAR) that mirrors the Meta Pool stNEAR interface. Its price grows on a schedule, because the real testnet stNEAR price does not move. The mainnet stNEAR price and APY shown on the page are a read-only reference.",
  },
  {
    id: "clock",
    question: "What is the demo clock?",
    answer:
      "The mock token compresses time so a full year of yield fits in about an hour. Maturities, countdowns and APY labels all use that clock, so you can strip, trade, mature and redeem inside one demo.",
  },
  {
    id: "forward",
    question: "How does selling future yield work?",
    answer:
      "You list YT at a price you choose. The app turns the implied APY you pick into an upfront mstNEAR amount. A buyer pays that amount, takes the YT and collects the yield from then on. The yield you earned before the sale stays with you.",
  },
  {
    id: "maturity",
    question: "What happens at maturity?",
    answer:
      "Anyone can settle the series, which freezes the index. After that, PT redeems for mstNEAR at the frozen index and YT holders claim the yield they accrued. Sale proceeds are withdrawn from the vault whenever you like.",
  },
  {
    id: "audit",
    question: "Is this audited or on mainnet?",
    answer: "No. It is a hackathon MVP on NEAR testnet and has not been audited. Do not use real funds.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-ink px-4 py-20 md:px-8 md:py-30 xl:px-30">
      <div className="mx-auto max-w-[800px]">
        <div className="text-center">
          <Eyebrow>Questions</Eyebrow>
          <h2 id="faq-title" className="mt-2.5 text-title font-normal text-fg md:text-h2">
            What to know before you try it.
          </h2>
        </div>
        <Accordion items={items} className="mt-12 md:mt-21" />
      </div>
    </section>
  );
}
