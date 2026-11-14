"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type MarqueeProps = {
  children: ReactNode;
  durationSeconds?: number;
  reverse?: boolean;
  className?: string;
  label: string;
};

export function Marquee({ children, durationSeconds = 60, reverse = false, className, label }: MarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
      rootMargin: "80px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={label}
      className={cn("marquee-mask overflow-hidden", className)}
    >
      <div
        className="flex w-max animate-marquee"
        style={
          {
            "--dur": `${durationSeconds}s`,
            animationDirection: reverse ? "reverse" : "normal",
            animationPlayState: inView ? "running" : "paused",
            willChange: inView ? "transform" : "auto",
          } as CSSProperties
        }
      >
        <div className="flex shrink-0 items-center gap-3 pr-3">{children}</div>
        <div className="flex shrink-0 items-center gap-3 pr-3" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
