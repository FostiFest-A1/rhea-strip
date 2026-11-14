"use client";

import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; radius: number; vx: number; vy: number; alpha: number };

const DOT_COUNT = 44;
const FRAME_MS = 1000 / 30;
const MAX_BACKING_WIDTH = 960;

function createDots(): Dot[] {
  return Array.from({ length: DOT_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    radius: 0.6 + Math.random() * 0.9,
    vx: (Math.random() - 0.5) * 0.004,
    vy: -0.002 - Math.random() * 0.006,
    alpha: 0.2 + Math.random() * 0.25,
  }));
}

export function HeroDots({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const dots = createDots();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastTick = 0;
    let visible = true;
    let width = 0;
    let height = 0;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const dot of dots) {
        context.fillStyle = `rgba(255,255,255,${dot.alpha})`;
        context.beginPath();
        context.arc(dot.x * width, dot.y * height, dot.radius * (width / 960 + 0.6), 0, Math.PI * 2);
        context.fill();
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, MAX_BACKING_WIDTH / Math.max(rect.width, 1));
      width = Math.max(1, Math.round(rect.width * ratio));
      height = Math.max(1, Math.round(rect.height * ratio));
      canvas.width = width;
      canvas.height = height;
      draw();
    };

    const step = (time: number) => {
      frame = 0;
      if (!visible || document.hidden || motionQuery.matches) return;
      if (time - lastTick >= FRAME_MS) {
        lastTick = time;
        for (const dot of dots) {
          dot.x += dot.vx * 0.5;
          dot.y += dot.vy * 0.5;
          if (dot.y < -0.02) dot.y = 1.02;
          if (dot.x < -0.02) dot.x = 1.02;
          if (dot.x > 1.02) dot.x = -0.02;
        }
        draw();
      }
      frame = requestAnimationFrame(step);
    };

    const start = () => {
      if (frame === 0 && visible && !document.hidden && !motionQuery.matches) {
        frame = requestAnimationFrame(step);
      }
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start();
    });
    const resizeObserver = new ResizeObserver(resize);

    observer.observe(canvas);
    resizeObserver.observe(canvas);
    resize();
    start();
    document.addEventListener("visibilitychange", start);
    motionQuery.addEventListener("change", start);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", start);
      motionQuery.removeEventListener("change", start);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
