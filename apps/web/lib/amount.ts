import { fmtAmount, parseAmount } from "@rhea/sdk/pricing";

export function tryParse(text: string): bigint | null {
  if (text.trim() === "") return null;
  try {
    return parseAmount(text);
  } catch {
    return null;
  }
}

export function toInputText(value: bigint): string {
  return fmtAmount(value, 24, 24).replace(/,/g, "");
}

export function pyFromSy(sy: bigint, index: bigint): bigint {
  return (sy * index) / 10n ** 24n;
}
