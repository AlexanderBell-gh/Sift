/**
 * Multibuy-aware line pricing for the shopping list.
 *
 * `offer_deal` is free text from the extension (e.g. "Any 3 for £12"), so
 * offers are matched with conservative regexes. Anything unparseable returns
 * null and the caller falls back to unit math — never guess numbers.
 *
 * Multibuy sets complete within a single store and pool across all lines
 * sharing the same offer tag (e.g. "Buy any 2 for £6" on two different
 * products). Callers must group lines by store + normalised `offer_deal`
 * text and price each group independently.
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
 * - "Any 3 for £12", "3 for £5.50", "2 for 95p", "any two for £6" → fixed set price
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

  // Fixed set price with explicit currency: "3 for £12", "any two for £6", "2 for 95p".
  const poundMatch = s.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+for\s+£\s*(\d+(?:\.\d{1,2})?)\b/);
  const penceMatch = !poundMatch && s.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+for\s+(\d+(?:\.\d{1,2})?)\s*p\b/);
  const priced = poundMatch ?? penceMatch;
  if (priced) {
    const take = wordOrDigit(priced[1]!);
    const raw = parseFloat(priced[2]!);
    const price = penceMatch ? raw / 100 : raw;
    if (take !== null && saneTake(take) && Number.isFinite(price) && price > 0 && price <= 100000) {
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

export interface GroupLineResult {
  /** Line total in GBP (pence-exact). */
  total: number;
  /** Group set count when this line participates, else 0. */
  sets: number;
  /** 'offer' when this line participates in a completed set, else 'unit'. */
  basis: LineBasis;
}

/**
 * Price a pool of lines sharing one store + offer tag. Set units fill in
 * line order; fixed set prices split pro-rata by each line's set-unit value
 * (pence-exact, leftover pennies to largest fractions); pay-for-M sets free
 * the cheapest units first. Per-line totals sum exactly to the group total.
 */
export function priceOfferGroup(
  offer: MultibuyOffer,
  lines: { qty: number; unitPrice: number }[],
): GroupLineResult[] {
  const unitP = lines.map(l => Math.round(l.unitPrice * 100));
  const totalQty = lines.reduce((n, l) => n + l.qty, 0);
  const sets = Math.floor(totalQty / offer.take);
  if (sets === 0) {
    return lines.map((l, i) => ({
      total: (l.qty * (unitP[i] ?? 0)) / 100,
      sets: 0,
      basis: 'unit' as LineBasis,
    }));
  }

  if (offer.payPrice !== null) {
    let remaining = sets * offer.take;
    const consumed = lines.map(l => {
      const take = Math.min(l.qty, remaining);
      remaining -= take;
      return take;
    });
    const setCostP = sets * Math.round(offer.payPrice * 100);
    const values = consumed.map((c, i) => c * (unitP[i] ?? 0));
    const totalValue = values.reduce((n, v) => n + v, 0);
    const shares = values.map(v => (totalValue > 0 ? (setCostP * v) / totalValue : 0));
    const floored = shares.map(Math.floor);
    let leftover = setCostP - floored.reduce((n, s) => n + s, 0);
    const order = shares
      .map((s, i) => ({ i, frac: s - Math.floor(s) }))
      .sort((a, b) => b.frac - a.frac);
    for (const { i } of order) {
      if (leftover <= 0) break;
      floored[i]! += 1;
      leftover -= 1;
    }
    return lines.map((l, i) => {
      const remainder = l.qty - (consumed[i] ?? 0);
      return {
        total: ((floored[i] ?? 0) + remainder * (unitP[i] ?? 0)) / 100,
        sets: (consumed[i] ?? 0) > 0 ? sets : 0,
        basis: ((consumed[i] ?? 0) > 0 ? 'offer' : 'unit') as LineBasis,
      };
    });
  }

  let free = sets * (offer.take - offer.payQty);
  const order = unitP
    .map((p, i) => ({ i, p }))
    .sort((a, b) => (a.p ?? 0) - (b.p ?? 0));
  const freed = lines.map(() => 0);
  for (const { i } of order) {
    if (free <= 0) break;
    const take = Math.min(lines[i]?.qty ?? 0, free);
    freed[i]! += take;
    free -= take;
  }
  return lines.map((l, i) => ({
    total: ((l.qty - (freed[i] ?? 0)) * (unitP[i] ?? 0)) / 100,
    sets: (freed[i] ?? 0) > 0 ? sets : 0,
    basis: ((freed[i] ?? 0) > 0 ? 'offer' : 'unit') as LineBasis,
  }));
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
