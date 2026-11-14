"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

export const EASE_OUT_EXPO: [number, number, number, number] = [0.22, 1, 0.36, 1];

const REVEAL_SHIFT_PX = 20;
const REVEAL_SECONDS = 0.7;
const REVEAL_ROOT_MARGIN = "0px 0px -10% 0px";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: REVEAL_ROOT_MARGIN });
  const visible = inView || Boolean(reduced);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: REVEAL_SHIFT_PX }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: REVEAL_SHIFT_PX }}
      transition={reduced ? { duration: 0 } : { duration: REVEAL_SECONDS, ease: EASE_OUT_EXPO, delay }}
    >
      {children}
    </motion.div>
  );
}
