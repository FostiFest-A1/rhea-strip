import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Row({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl shadow-row transition-shadow duration-300 ease-out-expo hover:shadow-row-hover",
        className,
      )}
      {...rest}
    />
  );
}
