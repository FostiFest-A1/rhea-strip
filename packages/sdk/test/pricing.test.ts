import { describe, expect, it } from "vitest";
import {
  askSyForPt,
  askSyForYt,
  buyerBreakEvenApy,
  fairYtPrice,
  fmtAmount,
  fmtApy,
  fmtCountdown,
  impliedApyFromYtAsk,
  parseAmount,
  ptFixedReturn,
  ptPrice,
  tauYears,
  underlyingApy,
  ytAccruedSy,
  ytLeverage,
  ytPrice,
} from "../src/pricing";
import { SCALE } from "../src/constants";

const INDEX = 1514400000000000000000000n;

describe("pricing", () => {
  it("matches the worked check at r=8%, tau=0.5, I=1.5144", () => {
    const pPT = ptPrice(0.08, 0.5);
    const pYT = ytPrice(0.08, 0.5);
    expect(pPT).toBeCloseTo(0.9623, 4);
    expect(pYT).toBeCloseTo(0.0377, 4);
    expect(pPT + pYT).toBeCloseTo(1, 12);
    const ask = askSyForYt(100n * SCALE, 0.08, 0.5, INDEX);
    expect(Number(ask) / 1e24).toBeCloseTo(2.49, 2);
  });

  it("prices PT asks and inverts the YT ask into an implied APY", () => {
    const ask = askSyForPt(100n * SCALE, 0.08, 0.5, INDEX);
    expect(Number(ask) / 1e24).toBeCloseTo((100 * 0.9623) / 1.5144, 2);
    const ytAsk = askSyForYt(100n * SCALE, 0.08, 0.5, INDEX);
    expect(impliedApyFromYtAsk(100n * SCALE, ytAsk, INDEX, 0.5)).toBeCloseTo(0.08, 6);
  });

  it("derives leverage, break-even, fixed return and fair price", () => {
    const pYT = ytPrice(0.08, 0.5);
    expect(ytLeverage(pYT)).toBeCloseTo(1 / pYT, 10);
    expect(buyerBreakEvenApy(pYT, 0.5)).toBeCloseTo(pYT / 0.5, 10);
    expect(ptFixedReturn(ptPrice(0.08, 0.5))).toBeCloseTo(Math.pow(1.08, 0.5) - 1, 10);
    expect(fairYtPrice(0.08, 0.5)).toBeCloseTo(Math.pow(1.08, 0.5) - 1, 12);
  });

  it("computes tau and the underlying APY", () => {
    expect(tauYears(1_800_000, 0, 3600)).toBeCloseTo(0.5, 12);
    expect(tauYears(1000, 5000, 3600)).toBe(0);
    const apy = underlyingApy((SCALE * 11n) / 10n, SCALE, 1800_000, 3600);
    expect(apy).toBeCloseTo(1.1 ** 2 - 1, 8);
  });

  it("replays the section 3.4 accrual vector (6.25 stNEAR)", () => {
    const accrued = ytAccruedSy(150n * SCALE, (SCALE * 3n) / 2n, (SCALE * 16n) / 10n);
    expect(accrued).toBe(6_250_000_000_000_000_000_000_000n);
  });

  it("formats and parses amounts", () => {
    expect(parseAmount("1")).toBe(SCALE);
    expect(parseAmount("0.5")).toBe(SCALE / 2n);
    expect(parseAmount("1,234.000001")).toBe(1234n * SCALE + 10n ** 18n);
    expect(() => parseAmount("abc")).toThrow();
    expect(() => parseAmount("")).toThrow();
    expect(fmtAmount(1234n * SCALE + SCALE / 4n)).toBe("1,234.25");
    expect(fmtAmount(0n)).toBe("0");
    expect(fmtAmount(10n ** 10n)).toBe("<0.0001");
    expect(fmtAmount(SCALE * 2n, 24, 0)).toBe("2");
  });

  it("formats APY and countdowns", () => {
    expect(fmtApy(0.08)).toBe("8.00%");
    expect(fmtApy(Number.NaN)).toBe("n/a");
    expect(fmtCountdown(-1)).toBe("Matured");
    expect(fmtCountdown(59_000)).toBe("59s");
    expect(fmtCountdown(9 * 60_000 + 5_000)).toBe("9m 05s");
    expect(fmtCountdown(3_720_000)).toBe("1h 02m");
    expect(fmtCountdown(2 * 86_400_000 + 3 * 3_600_000)).toBe("2d 3h");
  });
});
