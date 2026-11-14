import { SCALE } from "./constants";
import { bigRatio, mulDiv } from "./math";

const PRICE_FIXED = 10n ** 12n;

export function tauYears(maturityMs: number, nowMs: number, yearSecs: number): number {
  return Math.max(0, maturityMs - nowMs) / 1000 / yearSecs;
}

export function ptPrice(r: number, tau: number): number {
  return Math.pow(1 + r, -tau);
}

export function ytPrice(r: number, tau: number): number {
  return 1 - ptPrice(r, tau);
}

function priceToFixed(price: number): bigint {
  if (!Number.isFinite(price) || price <= 0) return 0n;
  return BigInt(Math.round(price * Number(PRICE_FIXED)));
}

function askFromPrice(amount: bigint, price: number, index: bigint): bigint {
  if (index <= 0n) return 0n;
  return mulDiv(amount * priceToFixed(price), SCALE, index * PRICE_FIXED);
}

export function askSyForYt(amountYt: bigint, r: number, tau: number, index: bigint): bigint {
  return askFromPrice(amountYt, ytPrice(r, tau), index);
}

export function askSyForPt(amountPt: bigint, r: number, tau: number, index: bigint): bigint {
  return askFromPrice(amountPt, ptPrice(r, tau), index);
}

export function impliedApyFromYtAsk(
  amountYt: bigint,
  askSy: bigint,
  index: bigint,
  tau: number,
): number {
  if (tau <= 0 || amountYt <= 0n) return 0;
  const askAsset = bigRatio(askSy * index, SCALE);
  const pt = 1 - askAsset / Number(amountYt);
  if (pt >= 1) return 0;
  if (pt <= 0) return Number.POSITIVE_INFINITY;
  return Math.pow(pt, -1 / tau) - 1;
}

export function impliedApyFromPtAsk(
  amountPt: bigint,
  askSy: bigint,
  index: bigint,
  tau: number,
): number {
  if (tau <= 0 || amountPt <= 0n || askSy <= 0n) return 0;
  const askAsset = bigRatio(askSy * index, SCALE);
  const pt = askAsset / Number(amountPt);
  if (pt >= 1) return 0;
  return Math.pow(pt, -1 / tau) - 1;
}

export function fairYtPrice(underlyingApy: number, tau: number): number {
  return Math.pow(1 + underlyingApy, tau) - 1;
}

export function buyerBreakEvenApy(ytPriceValue: number, tau: number): number {
  if (tau <= 0) return 0;
  return ytPriceValue / tau;
}

export function ytLeverage(ytPriceValue: number): number {
  return ytPriceValue > 0 ? 1 / ytPriceValue : Number.POSITIVE_INFINITY;
}

export function ptFixedReturn(ptPriceValue: number): number {
  return ptPriceValue > 0 ? 1 / ptPriceValue - 1 : Number.POSITIVE_INFINITY;
}

export function underlyingApy(
  indexNow: bigint,
  indexThen: bigint,
  elapsedMs: number,
  yearSecs: number,
): number {
  if (elapsedMs <= 0 || indexThen <= 0n) return 0;
  const growth = bigRatio(indexNow, indexThen);
  return Math.pow(growth, (yearSecs * 1000) / elapsedMs) - 1;
}

export function ytAccruedSy(ytBalance: bigint, indexUser: bigint, indexNow: bigint): bigint {
  if (indexUser <= 0n || indexNow <= indexUser) return 0n;
  return mulDiv(ytBalance * SCALE, indexNow - indexUser, indexUser * indexNow);
}

export function syToAsset(sy: bigint, index: bigint): bigint {
  return mulDiv(sy, index, SCALE);
}

export function assetToSy(asset: bigint, index: bigint): bigint {
  return mulDiv(asset, SCALE, index);
}

export function fmtAmount(value: bigint, decimals = 24, maxFrac = 4): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const unit = 10n ** BigInt(decimals);
  const whole = abs / unit;
  const frac = abs % unit;
  const fracDigits = frac.toString().padStart(decimals, "0").slice(0, maxFrac).replace(/0+$/, "");
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (whole === 0n && fracDigits === "" && frac > 0n) {
    return `${negative ? "-" : ""}<${maxFrac > 0 ? `0.${"0".repeat(maxFrac - 1)}1` : "1"}`;
  }
  const body = fracDigits === "" ? grouped : `${grouped}.${fracDigits}`;
  return negative ? `-${body}` : body;
}

export function parseAmount(text: string, decimals = 24): bigint {
  const trimmed = text.trim().replace(/,/g, "");
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === "" || trimmed === ".") {
    throw new Error(`invalid amount: ${text}`);
  }
  const [wholePart = "", fracPart = ""] = trimmed.split(".");
  if (fracPart.length > decimals) throw new Error(`too many decimals: ${text}`);
  const whole = BigInt(wholePart === "" ? "0" : wholePart);
  const frac = BigInt(fracPart.padEnd(decimals, "0"));
  return whole * 10n ** BigInt(decimals) + frac;
}

export function fmtApy(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return "n/a";
  return `${(value * 100).toFixed(digits)}%`;
}

export function fmtCountdown(ms: number): string {
  if (ms <= 0) return "Matured";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}
