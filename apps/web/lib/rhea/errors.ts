const MESSAGES: Record<string, string> = {
  E_NOT_ACTIVE: "This series is no longer active, so the action is closed.",
  E_NOT_MATURED: "The series has not matured yet.",
  E_NOT_SETTLED: "The series has not been settled yet.",
  E_STALE_INDEX: "The index is out of date. Try again in a moment.",
  E_BAD_MSG: "The request was malformed.",
  E_WRONG_TOKEN: "That token is not accepted here.",
  E_OFFER_GONE: "That offer is gone. Someone else filled it or the seller cancelled it.",
  E_PRICE_MISMATCH: "The price changed. Your tokens were returned.",
  E_INSUFFICIENT_YT: "Not enough unlocked YT for that amount.",
  E_MIN_AMOUNT: "That amount is below the minimum.",
  E_TOO_MANY_OFFERS: "You already have the maximum number of open offers.",
  E_NOT_OWNER: "Only the offer owner can do that.",
  E_PRICE_ZERO: "The price source returned zero. Try again shortly.",
};

const CODE_PATTERN = /E_[A-Z_]+/;

export function describeError(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : typeof cause === "string" ? cause : "";
  const code = CODE_PATTERN.exec(raw)?.[0];
  if (code && code in MESSAGES) return MESSAGES[code] ?? raw;
  if (/reject|denied|cancel|closed/i.test(raw)) return "The request was cancelled in the wallet.";
  return raw || "Something went wrong. Try again.";
}

export class PlanError extends Error {
  readonly stepIndex: number;

  constructor(message: string, stepIndex: number) {
    super(message);
    this.name = "PlanError";
    this.stepIndex = stepIndex;
  }
}
