export const SCALE = 10n ** 24n;
export const U128_MAX = (1n << 128n) - 1n;
export const U256_MAX = (1n << 256n) - 1n;
export const TGAS = 10n ** 12n;
export const YOCTO_PER_NEAR = 10n ** 24n;
export const STORAGE_DEPOSIT_YOCTO = 1_250_000_000_000_000_000_000n;
export const ONE_YOCTO = 1n;
export const INDEX_STALE_PLAN_MS = 20_000;
export const INDEX_STALE_CONTRACT_MS = 120_000;
export const MAX_OPEN_OFFERS = 5;
export const FAUCET_AMOUNT = 100n * SCALE;
export const FAUCET_CAP = 1000n * SCALE;
export const DEFAULT_P0 = 1514411535945873749259456n;
export const DEFAULT_APR_BPS = 800;
export const DEFAULT_YEAR_SECS = 3600;
export const DEFAULT_MIN_STRIP = SCALE / 100n;

export const GAS = {
  syncIndex: 50n * TGAS,
  settle: 50n * TGAS,
  listYt: 30n * TGAS,
  cancelOffer: 50n * TGAS,
  claimYield: 80n * TGAS,
  withdrawSy: 80n * TGAS,
  strip: 150n * TGAS,
  buy: 150n * TGAS,
  redeem: 100n * TGAS,
  listPt: 60n * TGAS,
  storageDeposit: 30n * TGAS,
  faucet: 30n * TGAS,
} as const;

export const ERROR_CODES = [
  "E_NOT_ACTIVE",
  "E_NOT_MATURED",
  "E_NOT_SETTLED",
  "E_STALE_INDEX",
  "E_BAD_MSG",
  "E_WRONG_TOKEN",
  "E_OFFER_GONE",
  "E_PRICE_MISMATCH",
  "E_INSUFFICIENT_YT",
  "E_MIN_AMOUNT",
  "E_TOO_MANY_OFFERS",
  "E_NOT_OWNER",
  "E_PRICE_ZERO",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
