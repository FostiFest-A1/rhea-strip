import { fairYtPrice, impliedApyFromPtAsk, impliedApyFromYtAsk } from "@rhea/sdk/pricing";
import type { Offer, Series } from "@rhea/sdk";

const SCALE = 10n ** 24n;
const PRECISION = 10n ** 12n;

export function ratio(numerator: bigint, denominator: bigint): number {
  if (denominator === 0n) return 0;
  return Number((numerator * PRECISION) / denominator) / Number(PRECISION);
}

export type OfferMetrics = {
  pricePerUnit: number;
  impliedApy: number;
  discountToFair: number | null;
  fixedReturn: number | null;
};

export function offerMetrics(offer: Offer, series: Series, tau: number, underlyingRate: number): OfferMetrics {
  const askAsset = (offer.askSy * series.liveIndex) / SCALE;
  const pricePerUnit = ratio(askAsset, offer.amount);
  if (offer.kind === "Yt") {
    const impliedApy = impliedApyFromYtAsk(offer.amount, offer.askSy, series.liveIndex, tau);
    const fair = fairYtPrice(underlyingRate, tau);
    return { pricePerUnit, impliedApy, discountToFair: fair > 0 ? 1 - pricePerUnit / fair : null, fixedReturn: null };
  }
  const impliedApy = impliedApyFromPtAsk(offer.amount, offer.askSy, series.liveIndex, tau);
  return { pricePerUnit, impliedApy, discountToFair: null, fixedReturn: pricePerUnit > 0 ? 1 / pricePerUnit - 1 : null };
}

export function bestOffer(offers: Offer[], account: string | null): Offer | null {
  let best: Offer | null = null;
  let bestPrice = Number.POSITIVE_INFINITY;
  for (const offer of offers) {
    if (offer.seller === account || offer.amount === 0n) continue;
    const price = ratio(offer.askSy, offer.amount);
    if (price < bestPrice) {
      best = offer;
      bestPrice = price;
    }
  }
  return best;
}
