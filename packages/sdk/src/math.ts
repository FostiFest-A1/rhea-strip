import { U256_MAX } from "./constants";

export function mulDiv(a: bigint, b: bigint, c: bigint): bigint {
  if (c === 0n) throw new Error("division by zero");
  if (a < 0n || b < 0n || c < 0n) throw new Error("negative operand");
  const product = a * b;
  if (product > U256_MAX) throw new Error("U256 overflow");
  return product / c;
}

export function maxBig(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function minBig(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function bigRatio(numerator: bigint, denominator: bigint): number {
  if (denominator === 0n) return Number.NaN;
  const fixed = (numerator * 10n ** 12n) / denominator;
  return Number(fixed) / 1e12;
}
