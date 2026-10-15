// Unit tests for src/lib/pricing.ts (multibuy engine). Run:
// node --test src/lib/pricing.test.ts
// Zero-dep: node strips types natively. Keep this file free of enums and
// namespaces so type-stripping keeps working.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOfferDeal,
  lineTotal,
  priceOfferGroup,
  lineSavings,
  formatGBP,
} from './pricing.ts';

describe('parseOfferDeal (fixed set price)', () => {
  it('Any 3 for £12 -> take 3 at £12', () => {
    assert.deepEqual(parseOfferDeal('Any 3 for £12'), { take: 3, payQty: 3, payPrice: 12 });
  });

  it('3 for £5.50 keeps pence', () => {
    assert.deepEqual(parseOfferDeal('3 for £5.50'), { take: 3, payQty: 3, payPrice: 5.5 });
  });

  it('2 for 95p converts pence to pounds', () => {
    assert.deepEqual(parseOfferDeal('2 for 95p'), { take: 2, payQty: 2, payPrice: 0.95 });
  });

  it('word numbers work: any two for £6', () => {
    assert.deepEqual(parseOfferDeal('any two for £6'), { take: 2, payQty: 2, payPrice: 6 });
  });

  it('mix & match prefix is stripped', () => {
    assert.deepEqual(parseOfferDeal('Mix & match 2 for £8'), { take: 2, payQty: 2, payPrice: 8 });
  });
});

describe('parseOfferDeal (pay-for-M and BOGOF)', () => {
  it('3 for 2 -> take 3 pay 2 at unit', () => {
    assert.deepEqual(parseOfferDeal('3 for 2'), { take: 3, payQty: 2, payPrice: null });
  });

  it('BOGOF -> take 2 pay 1', () => {
    assert.deepEqual(parseOfferDeal('BOGOF'), { take: 2, payQty: 1, payPrice: null });
  });

  it('Buy 1 get 1 free -> take 2 pay 1', () => {
    assert.deepEqual(parseOfferDeal('Buy 1 get 1 free'), { take: 2, payQty: 1, payPrice: null });
  });

  it('Buy 2 get 1 free -> take 3 pay 2', () => {
    assert.deepEqual(parseOfferDeal('Buy 2 get 1 free'), { take: 3, payQty: 2, payPrice: null });
  });
});

describe('parseOfferDeal (never guess)', () => {
  it('null and blank -> null', () => {
    assert.equal(parseOfferDeal(null), null);
    assert.equal(parseOfferDeal(''), null);
    assert.equal(parseOfferDeal('   '), null);
  });

  it('loyalty-only and meal-deal copy -> null', () => {
    assert.equal(parseOfferDeal('Clubcard Price'), null);
    assert.equal(parseOfferDeal('Meal Deal'), null);
    assert.equal(parseOfferDeal('Save £1'), null);
  });

  it('inverted bare ratio 2 for 3 -> null', () => {
    assert.equal(parseOfferDeal('2 for 3'), null);
  });
});

describe('lineTotal', () => {
  it('completed fixed set prices at the set price', () => {
    const r = lineTotal(3, 4, null, 'Any 3 for £12', false);
    assert.deepEqual(r, { total: 12, unitPrice: 4, basis: 'offer', sets: 1 });
  });

  it('remainder pays unit on top of completed sets', () => {
    const r = lineTotal(4, 4, null, 'Any 3 for £12', false);
    assert.deepEqual(r, { total: 16, unitPrice: 4, basis: 'offer', sets: 1 });
  });

  it('incomplete set stays unit basis', () => {
    const r = lineTotal(2, 4, null, 'Any 3 for £12', false);
    assert.deepEqual(r, { total: 8, unitPrice: 4, basis: 'unit', sets: 0 });
  });

  it('3 for 2 takes the free unit off', () => {
    const r = lineTotal(3, 2, null, '3 for 2', false);
    assert.deepEqual(r, { total: 4, unitPrice: 2, basis: 'offer', sets: 1 });
  });

  it('loyalty price wins over normal', () => {
    const r = lineTotal(2, 5, 4, null, false);
    assert.deepEqual(r, { total: 8, unitPrice: 4, basis: 'unit', sets: 0 });
  });

  it('expired offer falls back to unit math', () => {
    const r = lineTotal(3, 4, null, 'Any 3 for £12', true);
    assert.deepEqual(r, { total: 12, unitPrice: 4, basis: 'expired', sets: 0 });
  });

  it('no usable price -> unknown, never NaN', () => {
    const r = lineTotal(2, null, null, 'Any 3 for £12', false);
    assert.deepEqual(r, { total: null, unitPrice: null, basis: 'unknown', sets: 0 });
  });
});

describe('priceOfferGroup', () => {
  it('fixed set splits pro-rata across pooled lines', () => {
    const out = priceOfferGroup(
      { take: 3, payQty: 3, payPrice: 12 },
      [{ qty: 2, unitPrice: 4 }, { qty: 1, unitPrice: 4 }],
    );
    assert.equal(out[0]?.total, 8);
    assert.equal(out[1]?.total, 4);
    assert.equal(out[0]?.basis, 'offer');
  });

  it('leftover pennies go to largest fractions, sums stay exact', () => {
    const out = priceOfferGroup(
      { take: 3, payQty: 3, payPrice: 10 },
      [{ qty: 1, unitPrice: 1 }, { qty: 2, unitPrice: 1 }],
    );
    const sum = (out[0]?.total ?? 0) + (out[1]?.total ?? 0);
    assert.equal(sum, 10);
    assert.deepEqual([out[0]?.total, out[1]?.total].sort(), [3.33, 6.67]);
  });

  it('pay-for-M frees the cheapest units first', () => {
    const out = priceOfferGroup(
      { take: 3, payQty: 2, payPrice: null },
      [{ qty: 2, unitPrice: 5 }, { qty: 1, unitPrice: 1 }],
    );
    assert.equal(out[0]?.total, 10);
    assert.equal(out[0]?.basis, 'unit');
    assert.equal(out[1]?.total, 0);
    assert.equal(out[1]?.basis, 'offer');
  });

  it('no completed set -> straight unit pricing', () => {
    const out = priceOfferGroup(
      { take: 3, payQty: 3, payPrice: 12 },
      [{ qty: 1, unitPrice: 4 }, { qty: 1, unitPrice: 5 }],
    );
    assert.deepEqual(out.map(l => l.total), [4, 5]);
    assert.deepEqual(out.map(l => l.basis), ['unit', 'unit']);
  });
});

describe('lineSavings + formatGBP', () => {
  it('savings measured against all-units-at-normal', () => {
    const priced = lineTotal(3, 4, null, 'Any 3 for £12', false);
    assert.equal(lineSavings(3, 4, priced), 0);
    const deal = lineTotal(3, 5, null, 'Any 3 for £12', false);
    assert.equal(lineSavings(3, 5, deal), 3);
  });

  it('savings null without a normal or a total', () => {
    const priced = lineTotal(3, 4, null, 'Any 3 for £12', false);
    assert.equal(lineSavings(3, null, priced), null);
    assert.equal(lineSavings(2, 4, { total: null, unitPrice: null, basis: 'unknown', sets: 0 }), null);
  });

  it('formatGBP always shows two decimals', () => {
    assert.equal(formatGBP(12), '£12.00');
    assert.equal(formatGBP(5.5), '£5.50');
  });
});
