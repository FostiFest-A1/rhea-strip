import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "white" | "spark" | "glass" | "pink";
export type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  white: "bg-fg text-ink-card hover:shadow-pink",
  spark: "bg-fg text-ink-card hover:bg-pink hover:text-fg hover:shadow-pink",
  glass: "bg-fill-10 text-fg shadow-glass hover:bg-fill-20 hover:shadow-glass-hover",
  pink: "bg-pink text-fg hover:bg-pink-hover hover:shadow-pink",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-[33px] px-5 text-[13px] leading-[13px] font-medium",
  md: "h-12 px-5 text-lead font-bold tracking-tightest",
  lg: "h-14 px-6 text-lead font-bold tracking-tightest w-full",
};

export function buttonStyles(variant: ButtonVariant, size: ButtonSize = "md"): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-pill whitespace-nowrap select-none",
    "transition-[transform,background-color,color,box-shadow,opacity] duration-300 ease-out-expo",
    "active:scale-[.98] disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60",
    variantStyles[variant],
    sizeStyles[size],
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant = "white", size = "md", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={cn(buttonStyles(variant, size), className)} {...rest} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({ variant = "white", size = "md", className, ...rest }: ButtonLinkProps) {
  return <Link className={cn(buttonStyles(variant, size), className)} {...rest} />;
}
