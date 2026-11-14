"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AccordionItem = { id: string; question: string; answer: ReactNode };

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden="true"
      className={cn("size-5 shrink-0 text-fg-50 transition-transform duration-300 ease-out-expo", open && "rotate-180")}
    >
      <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
    </svg>
  );
}

export function Accordion({ items, className }: { items: AccordionItem[]; className?: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {items.map((item) => {
        const open = openId === item.id;
        const panelId = `${baseId}-${item.id}`;
        return (
          <div key={item.id} className="rounded-xl shadow-row transition-shadow duration-300 ease-out-expo hover:shadow-row-hover">
            <h3>
              <button
                id={`${panelId}-button`}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex w-full items-center justify-between gap-4 rounded-xl px-6 py-6 text-left text-lead font-medium text-fg"
              >
                {item.question}
                <Chevron open={open} />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={`${panelId}-button`}
              className="grid transition-[grid-template-rows] duration-350 ease-out-expo"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="px-6 pb-6 text-body text-fg-80" inert={!open}>
                  {item.answer}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
