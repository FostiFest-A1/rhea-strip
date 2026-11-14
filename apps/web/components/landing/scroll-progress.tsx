"use client";

import { motion, useScroll } from "motion/react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-60 h-1.5 origin-left bg-pink"
      style={{ scaleX: scrollYProgress }}
    />
  );
}
