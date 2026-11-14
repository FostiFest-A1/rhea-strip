"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Wordmark } from "./logo";

export type NavLink = { href: string; label: string };

type GlassNavProps = {
  links: NavLink[];
  actions?: ReactNode;
  brandHref?: string;
};

export function GlassNav({ links, actions, brandHref = "/" }: GlassNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <nav aria-label="Primary" className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4">
      <div className="pointer-events-auto relative">
        <div className="glass flex items-center gap-4 rounded-nav py-2.5 pr-2.5 pl-5 md:gap-9 md:pl-[22px]">
          <Link href={brandHref} aria-label="Rhea Strip home" className="rounded-sm">
            <Wordmark />
          </Link>
          <ul className="hidden items-center gap-5 md:flex xl:gap-7">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "text-ui font-medium transition-colors duration-300",
                      active ? "text-fg" : "text-fg-65 hover:text-fg",
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex size-[33px] items-center justify-center rounded-pill bg-fill-10 text-fg transition-transform duration-160 ease-out-expo active:scale-[.94] md:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4" aria-hidden="true">
                {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
              </svg>
            </button>
          </div>
        </div>
        <div
          id="mobile-menu"
          inert={!menuOpen}
          className={cn(
            "glass absolute top-[calc(100%+8px)] left-1/2 flex w-[min(358px,calc(100vw-32px))] -translate-x-1/2 flex-col gap-1 rounded-2xl bg-ink-glass/85 p-3 md:hidden",
            "transition-[opacity,transform,visibility] duration-250 ease-out-expo",
            menuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
          )}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-4 py-3 text-body font-medium text-fg-80 transition-colors hover:bg-fill-10 hover:text-fg"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
