// Tests for workers/lib/resolve.js. Run: node --test workers/lib/resolve.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeStore,
  normalizeName,
  validateResolveInput,
  emptyFacts,
  toInheritedFacts,
  pickBestRow,
} from './resolve.js';

function row(overrides) {
  return {
    product_name: 'Oat Milk 1L',
    store: 'Tesco',
    image_url: '',
    normal_price: 1.9,
    loyalty_price: null,
    offer_deal: null,
    offer_expires_at: null,
    category: 'Chilled',
    taxonomy_version: 3,
    product_url: 'https://example.com/p',
    unit: null,
    updated_at: 100,
    ...overrides,
  };
}

describe('normalizeStore', () => {
  it('maps ids to display names', () => {
    assert.equal(normalizeStore('tesco'), 'Tesco');
    assert.equal(normalizeStore('marksandspencer'), 'M&S');
    assert.equal(normalizeStore('sainsburys'), "Sainsbury's");
  });

  it('accepts display names case-insensitively', () => {
    assert.equal(normalizeStore('  TESCO  '), 'Tesco');
    assert.equal(normalizeStore('m&s'), 'M&S');
  });

  it('rejects unknown stores', () => {
    assert.equal(normalizeStore('corner shop'), '');
    assert.equal(normalizeStore(''), '');
    assert.equal(normalizeStore(null), '');
  });
});

describe('validateResolveInput', () => {
  it('accepts id or display name', () => {
    const r = validateResolveInput({ store: 'tesco', name: 'Oat Milk' });
    assert.equal(r.ok, true);
    assert.equal(r.store, 'Tesco');
    assert.equal(r.name, 'oat milk');
  });

  it('rejects missing fields', () => {
    assert.equal(validateResolveInput({ store: '', name: '' }).ok, false);
    assert.equal(validateResolveInput({ store: 'Tesco' }).ok, false);
  });

  it('rejects unknown store', () => {
    const r = validateResolveInput({ store: 'corner shop', name: 'Milk' });
    assert.equal(r.ok, false);
    assert.equal(r.error, 'Unknown store');
  });
});

describe('pickBestRow', () => {
  it('prefers exact same-store match over substring', () => {
    const best = pickBestRow([
      row({ product_name: 'Oat Milk Barista 1L', store: 'Tesco', updated_at: 200 }),
      row({ product_name: 'Oat Milk 1L', store: 'Tesco', updated_at: 100 }),
    ], 'Tesco', 'oat milk 1l');
    assert.equal(best.product_name, 'Oat Milk 1L');
  });

  it('prefers same store over cross-store exact name', () => {
    const best = pickBestRow([
      row({ product_name: 'Oat Milk 1L', store: 'Asda', updated_at: 999 }),
      row({ product_name: 'Oat Milk 1L', store: 'Tesco', updated_at: 1 }),
    ], 'Tesco', 'oat milk 1l');
    assert.equal(best.store, 'Tesco');
  });

  it('prefers image on tie, then newest', () => {
    const withImage = row({ product_name: 'Oat Milk 1L', store: 'Tesco', image_url: 'https://img', updated_at: 1 });
    const newer = row({ product_name: 'Oat Milk 1L', store: 'Tesco', image_url: '', updated_at: 999 });
    assert.equal(pickBestRow([newer, withImage], 'Tesco', 'oat milk 1l'), withImage);
    const a = row({ product_name: 'Oat Milk 1L', store: 'Tesco', updated_at: 1 });
    const b = row({ product_name: 'Oat Milk 1L', store: 'Tesco', updated_at: 2 });
    assert.equal(pickBestRow([a, b], 'Tesco', 'oat milk 1l'), b);
  });

  it('returns null when nothing matches', () => {
    assert.equal(pickBestRow([row({ product_name: 'Baked Beans', store: 'Tesco' })], 'Tesco', 'oat milk'), null);
    assert.equal(pickBestRow([], 'Tesco', 'oat milk'), null);
  });
});

describe('facts shape', () => {
  it('emptyFacts matches InheritedFacts defaults', () => {
    assert.deepEqual(emptyFacts(), {
      image_url: '',
      normal_price: null,
      loyalty_price: null,
      offer_deal: null,
      offer_expires_at: null,
      category: null,
      taxonomy_version: 0,
      product_url: '',
      unit: null,
    });
  });

  it('toInheritedFacts maps row, null for empty', () => {
    const f = toInheritedFacts(row({ image_url: 'https://img', normal_price: 2.5 }));
    assert.equal(f.image_url, 'https://img');
    assert.equal(f.normal_price, 2.5);
    assert.equal(f.taxonomy_version, 3);
    assert.deepEqual(toInheritedFacts(null), emptyFacts());
  });
});
