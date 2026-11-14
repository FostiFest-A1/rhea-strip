import Link from "next/link";
import type { ReactNode } from "react";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/cn";

type AssetCardProps = {
  symbol: string;
  name: string;
  description: string;
  href?: string;
  selected?: boolean;
  badge?: ReactNode;
  children?: ReactNode;
};

function SelectedMark() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-pink px-2.5 py-1 text-[12px] leading-none font-bold text-fg">
      <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 6.5 5 9l4.5-5.5" />
      </svg>
      Selected
    </span>
  );
}

export function AssetCard({ symbol, name, description, href, selected = false, badge, children }: AssetCardProps) {
  const active = Boolean(href);
  const body = (
    <div
      className={cn(
        "relative flex h-full min-h-[92px] flex-col justify-between gap-3 overflow-hidden rounded-2xl p-4 transition-[box-shadow,background-color] duration-300 ease-out-expo md:p-5",
        selected
          ? "bg-[radial-gradient(120%_140%_at_0%_0%,#fe3d702e,transparent_60%)] bg-ink-card shadow-selected group-hover:shadow-[inset_0_0_0_1px_#ffffff80]"
          : active
            ? "bg-ink-card shadow-card group-hover:shadow-row-hover"
            : "bg-ink shadow-card",
        !active && "opacity-60",
      )}
    >
      {selected ? <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-pink" /> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 xl:flex-nowrap">
        <div className="min-w-0">
          <h3 className="text-title font-normal text-fg">{symbol}</h3>
          <p className="mt-0.5 text-ui text-fg-65">{name}</p>
        </div>
        {badge ?? (selected ? <SelectedMark /> : active ? null : <Pill>Coming soon</Pill>)}
      </div>
      <p className="hidden text-ui leading-5 text-fg-50 xl:block">{description}</p>
      {children}
    </div>
  );

  if (!href) {
    return <div aria-disabled="true">{body}</div>;
  }

  return (
    <Link
      href={href}
      className="group relative block rounded-2xl transition-transform duration-300 ease-out-expo hover:-translate-y-0.5 active:scale-[.985]"
    >
      {body}
      {selected ? (
        <span aria-hidden="true" className="absolute top-1/2 left-full hidden h-0.5 w-6 -translate-y-1/2 bg-pink xl:block" />
      ) : null}
    </Link>
  );
}
