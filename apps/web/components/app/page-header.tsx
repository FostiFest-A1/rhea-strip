import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/pill";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, aside }: PageHeaderProps) {
  return (
    <header className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[640px]">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-2.5 text-[32px] leading-[35px] font-normal tracking-tightest text-fg md:text-h2 md:leading-[52.8px]">{title}</h1>
        <p className="mt-3 text-lead text-fg-80">{description}</p>
      </div>
      {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
    </header>
  );
}
