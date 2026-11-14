import { Eyebrow } from "@/components/ui/pill";
import { Headline } from "./headline";
import { LockIcon, RateIcon, SellIcon } from "./icons";

const problems = [
  {
    id: "fixed",
    icon: <LockIcon />,
    title: "Fixed yield",
    text: "Hold the principal token and know what it redeems for at maturity.",
  },
  {
    id: "sell",
    icon: <SellIcon />,
    title: "Sell yield early",
    text: "List the yield you have not earned yet and receive mstNEAR today.",
  },
  {
    id: "rates",
    icon: <RateIcon />,
    title: "Speculate on rates",
    text: "Buy yield tokens to take a view on where staking yield is heading.",
  },
];

export function Problems() {
  return (
    <section id="how" aria-labelledby="how-title" className="bg-ink px-4 py-20 md:px-8 md:py-30 xl:px-30">
      <div className="mx-auto max-w-[1104px] text-center">
        <Eyebrow>Why split a stake</Eyebrow>
        <Headline
          as="h2"
          id="how-title"
          segments={[{ text: "A plain stake" }, { text: "cannot", accent: true }, { text: "do these three things." }]}
          className="mt-2.5 text-title font-normal text-fg md:text-h2"
        />
        <ul className="mx-auto mt-14 grid max-w-[1104px] grid-cols-1 justify-items-center gap-12 md:mt-21 md:grid-cols-3 md:gap-8">
          {problems.map((problem) => (
            <li key={problem.id} className="flex w-full max-w-[260px] flex-col items-center gap-5">
              <span
                aria-hidden="true"
                className="flex size-16 items-center justify-center rounded-xl bg-[radial-gradient(50%_50%_at_50%_0%,#ff3d714d_0%,#040611_100%)] shadow-card"
              >
                {problem.icon}
              </span>
              <h3 className="text-title font-medium text-fg">{problem.title}</h3>
              <p className="text-lead text-fg-80">{problem.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
