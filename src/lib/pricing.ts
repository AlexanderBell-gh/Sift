/**
 * Multibuy-aware line pricing for the shopping list.
 *
 * `offer_deal` is free text from the extension (e.g. "Any 3 for £12"), so
 * offers are matched with conservative regexes. Anything unparseable returns
 * null and the caller falls back to unit math — never guess numbers.
 *
 * Multibuy sets only complete within a single store. Callers must group
 * lines by store and price each group independently.
 */

export interface MultibuyOffer {
  /** Items taken per completed set. */
  take: number;
  /** Items paid for per completed set (at unit price when payPrice is null). */
  payQty: number;
  /** Fixed set price in GBP, or null when the set is priced at payQty × unit. */
  payPrice: number | null;
}

export type LineBasis = 'offer' | 'unit' | 'expired' | 'unknown';

export interface LineTotal {
  /** Line total in GBP, or null when no usable price exists. */
  total: number | null;
  /** Unit price used (loyalty preferred), or null. */
  unitPrice: number | null;
  /** How the total was derived. */
  basis: LineBasis;
  /** Completed multibuy sets included in the total. */
  sets: number;
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

function wordOrDigit(token: string): number | null {
  const t = token.toLowerCase();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  return WORD_NUMBERS[t] ?? null;
}

function saneTake(n: number): boolean {
  return Number.isInteger(n) && n >= 2 && n <= 99;
}

/**
 * Parse a free-text multibuy term into a structured offer.
 * Returns null when the text is not a recognised multibuy.
 *
 * Recognised (case-insensitive, "Any"/"Mix & match" prefixes stripped):
 * - "Any 3 for £12", "3 for £5.50", "2 for 95p" → fixed set price
 * - "3 for 2" (bare second integer) → take 3, pay for 2 at unit price
 * - "Buy 1 get 1 free", "Buy 2 get 1 free", "BOGOF" → take n+m, pay n
 */
export function parseOfferDeal(text: string | null): MultibuyOffer | null {
  if (!text) return null;
  let s = text.toLowerCase().trim().replace(/\s+/g, ' ');
  if (!s) return null;
  s = s
    .replace(/\bany\b/g, '')
    .replace(/mix\s*&?\s*match/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (/\bbogof\b/.test(s) || /\bbuy\s+one\s+get\s+one\s+free\b/.test(s)) {
    return { take: 2, payQty: 1, payPrice: null };
  }

  const buyGet = s.match(/\bbuy\s+(\d+|one|two|three|four|five)\s+get\s+(\d+|one|two|three|four|five)\s+free\b/);
  if (buyGet) {
    const n = wordOrDigit(buyGet[1]!);
    const m = wordOrDigit(buyGet[2]!);
    if (n !== null && m !== null && n >= 1 && m >= 1 && n + m <= 99) {
      return { take: n + m, payQty: n, payPrice: null };
    }
    return null;
  }

  // Fixed set price with explicit currency: "3 for £12", "3 for £5.50", "2 for 95p".
  const poundMatch = s.match(/\b(\d+)\s+for\s+£\s*(\d+(?:\.\d{1,2})?)\b/);
  const penceMatch = !poundMatch && s.match(/\b(\d+)\s+for\s+(\d+(?:\.\d{1,2})?)\s*p\b/);
  const priced = poundMatch ?? penceMatch;
  if (priced) {
    const take = parseInt(priced[1]!, 10);
    const raw = parseFloat(priced[2]!);
    const price = penceMatch ? raw / 100 : raw;
    if (saneTake(take) && Number.isFinite(price) && price > 0 && price <= 100000) {
      return { take, payQty: take, payPrice: price };
    }
    return null;
  }

  // Bare "N for M": take N, pay for M at unit price ("3 for 2").
  const bare = s.match(/\b(\d+)\s+for\s+(\d+)\b/);
  if (bare) {
    const take = parseInt(bare[1]!, 10);
    const pay = parseInt(bare[2]!, 10);
    if (saneTake(take) && pay >= 1 && pay < take) {
      return { take, payQty: pay, payPrice: null };
    }
    return null;
  }

  return null;
}

/**
 * Price one list line. Loyalty price preferred (matches watchlist best-item
 * logic). Expired offers are ignored and priced at normal.
 */
export function lineTotal(
  qty: number,
  normal: number | null,
  loyalty: number | null,
  offerDeal: string | null,
  expired: boolean,
): LineTotal {
  const unitPrice = loyalty ?? normal;
  if (unitPrice === null || unitPrice === undefined) {
    return { total: null, unitPrice: null, basis: 'unknown', sets: 0 };
  }
  if (expired) {
    return { total: qty * unitPrice, unitPrice, basis: 'expired', sets: 0 };
  }
  const offer = parseOfferDeal(offerDeal);
  if (!offer) {
    return { total: qty * unitPrice, unitPrice, basis: 'unit', sets: 0 };
  }
  const sets = Math.floor(qty / offer.take);
  const remainder = qty % offer.take;
  const setPrice = offer.payPrice ?? offer.payQty * unitPrice;
  return {
    total: sets * setPrice + remainder * unitPrice,
    unitPrice,
    basis: sets > 0 ? 'offer' : 'unit',
    sets,
  };
}

/** Savings of a priced line against all-units-at-normal. */
export function lineSavings(
  qty: number,
  normal: number | null,
  priced: LineTotal,
): number | null {
  if (normal === null || normal === undefined || priced.total === null) return null;
  return qty * normal - priced.total;
}

export function formatGBP(value: number): string {
  return `£${value.toFixed(2)}`;
}
