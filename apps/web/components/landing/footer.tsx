import Link from "next/link";
import { Wordmark } from "@/components/ui/logo";

const appLinks = [
  { href: "/strip", label: "Strip" },
  { href: "/trade", label: "Trade" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/settle", label: "Settle" },
];

const networkLinks = [
  { href: "https://testnet.nearblocks.io", label: "Testnet explorer" },
  { href: "https://docs.near.org", label: "NEAR docs" },
];

function LinkColumn({ title, links, external }: { title: string; links: { href: string; label: string }[]; external?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-num text-ui font-medium text-fg">{title}</h2>
      <ul className="flex flex-col gap-4">
        {links.map((link) => (
          <li key={link.href}>
            {external ? (
              <a href={link.href} target="_blank" rel="noreferrer" className="font-num text-ui text-fg-50 transition-colors duration-300 hover:text-fg">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="font-num text-ui text-fg-50 transition-colors duration-300 hover:text-fg">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink px-4 pt-10 pb-40 md:px-10 md:pt-20 xl:px-20">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12 md:flex-row md:justify-between">
        <div className="flex max-w-[320px] flex-col gap-4">
          <Wordmark />
          <p className="font-num text-[15px] leading-6 text-fg-50">
            Yield stripping for liquid-staked NEAR, with forward-selling of future yield as the main flow. Hackathon MVP on
            testnet, not audited.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-12 md:gap-20">
          <LinkColumn title="App" links={appLinks} />
          <LinkColumn title="Network" links={networkLinks} external />
        </div>
      </div>
      <div className="mx-auto mt-16 flex max-w-[1200px] flex-col gap-3 font-num text-ui text-fg-50 md:flex-row md:justify-between">
        <p>Rhea Strip, NEAR hackathon 2026. Testnet only. Mock yield on a demo clock.</p>
      </div>
    </footer>
  );
}
