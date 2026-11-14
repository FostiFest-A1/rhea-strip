import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

export type HeadlineSegment = { text: string; accent?: boolean };

type HeadlineProps = {
  segments: HeadlineSegment[];
  as?: "h1" | "h2";
  id?: string;
  className?: string;
  reveal?: boolean;
};

export function Headline({ segments, as: Tag = "h1", id, className, reveal = false }: HeadlineProps) {
  const words = segments.flatMap((segment) =>
    segment.text
      .split(" ")
      .filter(Boolean)
      .map((text) => ({ text, accent: Boolean(segment.accent) })),
  );

  return (
    <Tag id={id} className={className}>
      {words.map((word, index) => (
        <span key={`${word.text}-${index}`}>
          <span
            className={cn(reveal && "word", word.accent && "serif-accent text-pink")}
            style={reveal ? ({ "--i": index } as CSSProperties) : undefined}
          >
            {word.text}
          </span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </Tag>
  );
}
