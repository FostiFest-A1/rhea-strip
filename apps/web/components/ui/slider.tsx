import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/cn";

type SliderProps = Omit<ComponentProps<"input">, "type"> & { label: string; valueLabel: string; tone?: "pink" | "ice" };

export function Slider({ label, valueLabel, tone = "pink", id, className, ...rest }: SliderProps) {
  const inputId = id ?? `slider-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const min = Number(rest.min ?? 0);
  const max = Number(rest.max ?? 100);
  const current = Number(rest.value ?? min);
  const percent = max > min ? ((current - min) / (max - min)) * 100 : 0;
  const color = tone === "pink" ? "#FE3D70" : "#B3F4FF";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3 text-ui font-medium text-fg-65">
        <label htmlFor={inputId}>{label}</label>
        <output htmlFor={inputId} className="num text-body font-medium text-fg">
          {valueLabel}
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        className="rs-slider h-6 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
        style={{ "--fill": `${percent}%`, "--accent": color } as CSSProperties}
        {...rest}
      />
    </div>
  );
}
