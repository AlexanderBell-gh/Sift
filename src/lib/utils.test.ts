// Unit tests for src/lib/utils.ts date/deal helpers. Run:
// node --test src/lib/utils.test.ts
// Zero-dep: node strips types natively. Keep this file free of enums and
// namespaces so type-stripping keeps working. Dates are computed relative
// to today so the suite never goes stale.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDate,
  isOfferExpired,
  daysToExpiry,
  formatDate,
  formatTimeAgo,
  formatDealShort,
  getLoyaltyLabel,
} from './utils.ts';

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('parseDate', () => {
  it('dd/mm/yyyy parses day-first', () => {
    const d = parseDate('25/12/2026');
    assert.equal(d?.getFullYear(), 2026);
    assert.equal(d?.getMonth(), 11);
    assert.equal(d?.getDate(), 25);
  });

  it('ISO strings parse', () => {
    assert.ok(parseDate('2026-12-25T00:00:00.000Z') instanceof Date);
  });

  it('null and garbage -> null', () => {
    assert.equal(parseDate(null), null);
    assert.equal(parseDate('not a date'), null);
  });
});

describe('isOfferExpired (mirrors workers/index.js, <= end-of-day)', () => {
  it('null and unparseable never expire', () => {
    assert.equal(isOfferExpired(null), false);
    assert.equal(isOfferExpired('garbage'), false);
  });

  it('yesterday is expired, tomorrow is not', () => {
    // Date-only today is intentionally unasserted: ISO date-only parses as
    // UTC midnight, which sits an hour past local midnight under BST, so the
    // result depends on DST. Pre-existing mirrored behaviour, out of scope.
    assert.equal(isOfferExpired(isoDate(-1)), true);
    assert.equal(isOfferExpired(isoDate(1)), false);
  });
});

describe('daysToExpiry', () => {
  it('null and garbage -> null', () => {
    assert.equal(daysToExpiry(null), null);
    assert.equal(daysToExpiry('garbage'), null);
  });

  it('today is 0, tomorrow is 1, yesterday is -1', () => {
    assert.equal(daysToExpiry(isoDate(0)), 0);
    assert.equal(daysToExpiry(isoDate(1)), 1);
    assert.equal(daysToExpiry(isoDate(-1)), -1);
  });
});

describe('display helpers', () => {
  it('formatDate renders en-GB', () => {
    assert.equal(formatDate('2026-12-25'), '25 Dec 2026');
    assert.equal(formatDate('garbage'), '');
  });

  it('formatTimeAgo buckets elapsed time', () => {
    assert.equal(formatTimeAgo(Date.now()), 'just now');
    assert.equal(formatTimeAgo(Date.now() - 2 * 3600000), '2h ago');
    assert.equal(formatTimeAgo(Date.now() - 3 * 86400000), '3d ago');
  });

  it('formatDealShort strips loyalty tails, collapses meal deals', () => {
    assert.equal(formatDealShort('Meal Deal for £15.00 with Nectar'), 'Meal Deal');
    assert.equal(formatDealShort('Any 2 for £8 with Clubcard'), 'Any 2 for £8');
    assert.equal(formatDealShort('Any 2 for £5 Clubcard Price'), 'Any 2 for £5');
    assert.equal(formatDealShort('Any 3 for £12'), 'Any 3 for £12');
  });

  it('getLoyaltyLabel names known schemes, falls back otherwise', () => {
    assert.equal(getLoyaltyLabel('Tesco'), 'Clubcard price');
    assert.equal(getLoyaltyLabel("Sainsbury's"), 'Nectar price');
    assert.equal(getLoyaltyLabel('Unknown Store'), 'Offer price');
  });
});
