import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-[22px]", className)}>
      <rect x="2" y="2" width="28" height="12.5" rx="6" fill="#B3F4FF" />
      <rect x="2" y="17.5" width="28" height="12.5" rx="6" fill="#FE3D70" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-[15px] font-bold tracking-tightest text-fg", className)}>
      <LogoMark />
      Rhea Strip
    </span>
  );
}
