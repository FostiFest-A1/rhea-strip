import { cn } from "@/lib/cn";

export type StepState = "idle" | "active" | "done" | "error";
export type StepperStep = { id: string; label: string; state: StepState; href?: string; detail?: string };

function Marker({ state, index }: { state: StepState; index: number }) {
  if (state === "done") {
    return (
      <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" className="size-4">
        <path d="M232.49,80.49l-128,128a12,12,0,0,1-17,0l-56-56a12,12,0,1,1,17-17L96,183,215.51,63.51a12,12,0,0,1,17,17Z" />
      </svg>
    );
  }
  if (state === "error") return <span aria-hidden="true">!</span>;
  return <span className="num">{index + 1}</span>;
}

const markerStyles: Record<StepState, string> = {
  idle: "bg-fill-10 text-fg-65",
  active: "bg-fg text-ink-card",
  done: "bg-ok text-ink",
  error: "bg-danger text-ink",
};

const stateLabel: Record<StepState, string> = {
  idle: "Waiting",
  active: "In progress",
  done: "Done",
  error: "Failed",
};

export function Stepper({ steps, className }: { steps: StepperStep[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col gap-3", className)} aria-label="Transaction steps">
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-start gap-3" aria-current={step.state === "active" ? "step" : undefined}>
          <span
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-pill text-[12px] font-bold",
              markerStyles[step.state],
              step.state === "active" && "animate-skeleton",
            )}
          >
            <Marker state={step.state} index={index} />
          </span>
          <div className="min-w-0">
            <p className={cn("text-body leading-6 font-medium", step.state === "idle" ? "text-fg-65" : "text-fg")}>
              {step.label}
              <span className="sr-only">{`: ${stateLabel[step.state]}`}</span>
            </p>
            {step.detail ? <p className="text-ui text-fg-50">{step.detail}</p> : null}
            {step.href ? (
              <a
                href={step.href}
                target="_blank"
                rel="noreferrer"
                className="text-ui font-medium text-ice underline-offset-4 hover:underline"
              >
                View on explorer
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
