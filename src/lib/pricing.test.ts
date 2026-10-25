// Unit tests for src/lib/pricing.ts (multibuy engine). Run:
// node --test src/lib/pricing.test.ts
// Zero-dep: node strips types natively. Keep this file free of enums and
// namespaces so type-stripping keeps working.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOfferTiers,
  lineTotal,
  priceOfferGroup,
  lineSavings,
  formatGBP,
} from './pricing.ts';

describe('parseOfferTiers (fixed set price)', () => {
  it('Any 3 for £12 -> take 3 at £12', () => {
    assert.deepEqual(parseOfferTiers('Any 3 for £12'), [{ take: 3, payQty: 3, payPrice: 12 }]);
  });

  it('3 for £5.50 keeps pence', () => {
    assert.deepEqual(parseOfferTiers('3 for £5.50'), [{ take: 3, payQty: 3, payPrice: 5.5 }]);
  });

  it('2 for 95p converts pence to pounds', () => {
    assert.deepEqual(parseOfferTiers('2 for 95p'), [{ take: 2, payQty: 2, payPrice: 0.95 }]);
  });

  it('word numbers work: any two for £6', () => {
    assert.deepEqual(parseOfferTiers('any two for £6'), [{ take: 2, payQty: 2, payPrice: 6 }]);
  });

  it('mix & match prefix is stripped', () => {
    assert.deepEqual(parseOfferTiers('Mix & match 2 for £8'), [{ take: 2, payQty: 2, payPrice: 8 }]);
  });

  it('tiered deal keeps every tier in order', () => {
    assert.deepEqual(
      parseOfferTiers('5 for £5 or 10 for £9 Clubcard Price - Heinz Soup 400g'),
      [
        { take: 5, payQty: 5, payPrice: 5 },
        { take: 10, payQty: 10, payPrice: 9 },
      ],
    );
  });
});

describe('parseOfferTiers (pay-for-M and BOGOF)', () => {
  it('3 for 2 -> take 3 pay 2 at unit', () => {
    assert.deepEqual(parseOfferTiers('3 for 2'), [{ take: 3, payQty: 2, payPrice: null }]);
  });

  it('BOGOF -> take 2 pay 1', () => {
    assert.deepEqual(parseOfferTiers('BOGOF'), [{ take: 2, payQty: 1, payPrice: null }]);
  });

  it('Buy 1 get 1 free -> take 2 pay 1', () => {
    assert.deepEqual(parseOfferTiers('Buy 1 get 1 free'), [{ take: 2, payQty: 1, payPrice: null }]);
  });

  it('Buy 2 get 1 free -> take 3 pay 2', () => {
    assert.deepEqual(parseOfferTiers('Buy 2 get 1 free'), [{ take: 3, payQty: 2, payPrice: null }]);
  });
});

describe('parseOfferTiers (never guess)', () => {
  it('null and blank -> no tiers', () => {
    assert.deepEqual(parseOfferTiers(null), []);
    assert.deepEqual(parseOfferTiers(''), []);
    assert.deepEqual(parseOfferTiers('   '), []);
  });

  it('loyalty-only and meal-deal copy -> no tiers', () => {
    assert.deepEqual(parseOfferTiers('Clubcard Price'), []);
    assert.deepEqual(parseOfferTiers('Meal Deal'), []);
    assert.deepEqual(parseOfferTiers('Save £1'), []);
  });

  it('inverted bare ratio 2 for 3 -> no tiers', () => {
    assert.deepEqual(parseOfferTiers('2 for 3'), []);
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

  it('tiered deal prices the qty at the cheaper tier', () => {
    const deal = '5 for £5 or 10 for £9 Clubcard Price - Heinz Soup 400g';
    assert.deepEqual(lineTotal(5, 2, null, deal, false), {
      total: 5, unitPrice: 2, basis: 'offer', sets: 1,
    });
    assert.deepEqual(lineTotal(10, 2, null, deal, false), {
      total: 9, unitPrice: 2, basis: 'offer', sets: 1,
    });
  });

  it('tiered deal takes the cheaper whole tier, remainder at unit', () => {
    const r = lineTotal(15, 2, null, '5 for £5 or 10 for £9', false);
    assert.deepEqual(r, { total: 15, unitPrice: 2, basis: 'offer', sets: 3 });
  });

  it('loyalty price wins over normal', () => {
    const r = lineTotal(2, 5, 4, null, false);
    assert.deepEqual(r, { total: 8, unitPrice: 4, basis: 'unit', sets: 0 });
  });

  it('expired offer falls back to unit math', () => {
    const r = lineTotal(3, 4, null, 'Any 3 for £12', true);
    assert.deepEqual(r, { total: 12, unitPrice: 4, basis: 'expired', sets: 0 });
  });

  it('expired loyalty offer prices at normal, not the stale discount', () => {
    const r = lineTotal(2, 5, 4, null, true);
    assert.deepEqual(r, { total: 10, unitPrice: 5, basis: 'expired', sets: 0 });
  });

  it('expired multibuy with both prices still prices at normal', () => {
    const r = lineTotal(3, 4, 3, 'Any 3 for £12', true);
    assert.deepEqual(r, { total: 12, unitPrice: 4, basis: 'expired', sets: 0 });
  });

  it('expired with no normal falls back to loyalty', () => {
    const r = lineTotal(2, null, 4, null, true);
    assert.deepEqual(r, { total: 8, unitPrice: 4, basis: 'expired', sets: 0 });
  });

  it('no usable price -> unknown, never NaN', () => {
    const r = lineTotal(2, null, null, 'Any 3 for £12', false);
    assert.deepEqual(r, { total: null, unitPrice: null, basis: 'unknown', sets: 0 });
  });
});

describe('priceOfferGroup', () => {
  it('fixed set splits pro-rata across pooled lines', () => {
    const out = priceOfferGroup(
      [{ take: 3, payQty: 3, payPrice: 12 }],
      [{ qty: 2, unitPrice: 4 }, { qty: 1, unitPrice: 4 }],
    );
    assert.equal(out[0]?.total, 8);
    assert.equal(out[1]?.total, 4);
    assert.equal(out[0]?.basis, 'offer');
  });

  it('leftover pennies go to largest fractions, sums stay exact', () => {
    const out = priceOfferGroup(
      [{ take: 3, payQty: 3, payPrice: 10 }],
      [{ qty: 1, unitPrice: 1 }, { qty: 2, unitPrice: 1 }],
    );
    const sum = (out[0]?.total ?? 0) + (out[1]?.total ?? 0);
    assert.equal(sum, 10);
    assert.deepEqual([out[0]?.total, out[1]?.total].sort(), [3.33, 6.67]);
  });

  it('pay-for-M frees the cheapest units first', () => {
    const out = priceOfferGroup(
      [{ take: 3, payQty: 2, payPrice: null }],
      [{ qty: 2, unitPrice: 5 }, { qty: 1, unitPrice: 1 }],
    );
    assert.equal(out[0]?.total, 10);
    assert.equal(out[0]?.basis, 'unit');
    assert.equal(out[1]?.total, 0);
    assert.equal(out[1]?.basis, 'offer');
  });

  it('no completed set -> straight unit pricing', () => {
    const out = priceOfferGroup(
      [{ take: 3, payQty: 3, payPrice: 12 }],
      [{ qty: 1, unitPrice: 4 }, { qty: 1, unitPrice: 5 }],
    );
    assert.deepEqual(out.map(l => l.total), [4, 5]);
    assert.deepEqual(out.map(l => l.basis), ['unit', 'unit']);
  });

  it('pooled tiers land on the cheaper tier', () => {
    const out = priceOfferGroup(
      [
        { take: 5, payQty: 5, payPrice: 5 },
        { take: 10, payQty: 10, payPrice: 9 },
      ],
      [{ qty: 5, unitPrice: 2 }, { qty: 5, unitPrice: 2 }],
    );
    assert.deepEqual(out.map(l => l.total), [4.5, 4.5]);
    assert.deepEqual(out.map(l => l.basis), ['offer', 'offer']);
  });
});

describe('lineSavings + formatGBP', () => {
  it('savings measured against all-units-at-normal', () => {
    const priced = lineTotal(3, 4, null, 'Any 3 for £12', false);
    assert.equal(lineSavings(3, 4, priced), 0);
    const deal = lineTotal(3, 5, null, 'Any 3 for £12', false);
    assert.equal(lineSavings(3, 5, deal), 3);
  });

  it('expired loyalty lines show zero savings against shelf', () => {
    const priced = lineTotal(2, 5, 4, null, true);
    assert.equal(lineSavings(2, 5, priced), 0);
  });

  it('group totals leave no float dust in savings', () => {
    const priced = priceOfferGroup(
      [
        { take: 5, payQty: 5, payPrice: 5 },
        { take: 10, payQty: 10, payPrice: 9 },
      ],
      [{ qty: 3, unitPrice: 1.1 }],
    )[0]!;
    const r = lineSavings(3, 1.1, { total: priced.total, unitPrice: 1.1, basis: priced.basis, sets: priced.sets });
    assert.equal(r, 0);
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
