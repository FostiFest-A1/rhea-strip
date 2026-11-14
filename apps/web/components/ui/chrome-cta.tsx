import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function ChromeCta({ className, children, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "group relative inline-flex h-12 items-center justify-center rounded-pill px-10 text-[17px] leading-[1.2] font-medium tracking-[-0.02em] text-fg",
        "shadow-chrome transition-transform duration-300 ease-out-expo active:scale-[.98]",
        className,
      )}
      {...rest}
    >
      <span className="absolute inset-0 rounded-pill bg-linear-to-b from-[#5c5c5c] to-[#383838] shadow-[inset_0_10px_10px_-5px_#707070]" aria-hidden="true" />
      <span className="absolute inset-0 rounded-pill bg-linear-to-b from-transparent via-[#ffffff1a] via-60% to-[#ffffff4d]" aria-hidden="true" />
      <span className="chrome-rim" aria-hidden="true" />
      <span className="absolute inset-0 rounded-pill bg-[#ffffff14] opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-hidden="true" />
      <span className="relative [text-shadow:0_1px_3px_#0c101426]">{children}</span>
    </Link>
  );
}
