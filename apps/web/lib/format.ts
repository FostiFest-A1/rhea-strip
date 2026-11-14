import { fmtAmount } from "@rhea/sdk/pricing";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;

export function seriesSuffix(maturityMs: number): string {
  if (maturityMs <= 0) return "TBD";
  const date = new Date(maturityMs);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = MONTHS[date.getUTCMonth()] ?? "";
  const year = String(date.getUTCFullYear());
  return `${day}${month}${year}`;
}

export function ptSymbol(maturityMs: number): string {
  return `PT-mstNEAR-${seriesSuffix(maturityMs)}`;
}

export function ytSymbol(maturityMs: number): string {
  return `YT-mstNEAR-${seriesSuffix(maturityMs)}`;
}

export function maturityLabel(maturityMs: number): string {
  if (maturityMs <= 0) return "Not deployed";
  return new Date(maturityMs).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export function shortAccount(account: string): string {
  if (account.length <= 22) return account;
  return `${account.slice(0, 10)}...${account.slice(-8)}`;
}

export function amount(value: bigint, maxFrac = 4): string {
  return fmtAmount(value, 24, maxFrac);
}

export function elapsedFraction(startMs: number, endMs: number, nowMs: number): number {
  if (endMs <= startMs) return 0;
  return Math.min(1, Math.max(0, (nowMs - startMs) / (endMs - startMs)));
}

export function ageLabel(createdMs: number, nowMs: number): string {
  const seconds = Math.max(0, Math.floor((nowMs - createdMs) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

export function txUrl(explorerUrl: string, hash: string): string {
  return `${explorerUrl}/txns/${hash}`;
}
