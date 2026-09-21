// Regression tests for workers/lib/category.js. Run: node --test workers/lib/category.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCategory, clampLegacyCategory, TAXONOMY_VERSION } from './category.js';

function signals(overrides) {
  return {
    breadcrumb_raw: [],
    breadcrumb_leaf: '',
    title: '',
    brand: '',
    store_id: 'tesco',
    url_path: '',
    jsonld_category: null,
    ...overrides,
  };
}

describe('section 7 regression list (locked 21-09-2026, oat milk Chilled, cookies Snacks)', () => {
  it('Graze Oat Boosts Sticky Toffee Flapjacks -> Food Cupboard', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Food Cupboard', 'Cereals', 'Flapjacks'],
      breadcrumb_leaf: 'Flapjacks',
      title: 'Graze Oat Boosts Sticky Toffee Flapjacks',
      brand: 'Graze',
    }));
    assert.equal(r.category, 'Food Cupboard');
    assert.equal(r.taxonomy_version, TAXONOMY_VERSION);
  });

  it('Lemon & Blueberry Flapjacks -> Food Cupboard (flavour veto)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Food Cupboard', 'Cereals', 'Flapjacks'],
      breadcrumb_leaf: 'Flapjacks',
      title: 'Lemon & Blueberry Flapjacks',
      brand: 'Graze',
    }));
    assert.equal(r.category, 'Food Cupboard');
  });

  it('Blueberry Yoghurt 500g -> Chilled (dairy context wins)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Chilled', 'Yoghurts'],
      breadcrumb_leaf: 'Yoghurts',
      title: 'Blueberry Yoghurt 500g',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('Frozen Blueberries -> Frozen (frozen veto)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Frozen', 'Berries'],
      breadcrumb_leaf: 'Berries',
      title: 'Frozen Blueberries 400g',
    }));
    assert.equal(r.category, 'Frozen');
  });

  it('Fresh Blueberries title-only -> Other (bare fresh, no berry keywords)', () => {
    const r = scoreCategory(signals({ title: 'Fresh Blueberries 300g' }));
    assert.equal(r.category, 'Other');
  });

  it('Fresh Milk 2 Pints -> Chilled', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Chilled', 'Milk'],
      breadcrumb_leaf: 'Milk',
      title: 'Fresh Milk 2 Pints',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('Oat Milk -> Chilled (locked; dairy exempt from dry-goods veto)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Chilled', 'Milk Alternatives'],
      breadcrumb_leaf: 'Milk Alternatives',
      title: 'Oat Milk 1L',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('Chocolate Chip Cookies -> Snacks (locked)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Snacks', 'Cookies'],
      breadcrumb_leaf: 'Cookies',
      title: 'Chocolate Chip Cookies 200g',
    }));
    assert.equal(r.category, 'Snacks');
  });
});

describe('vetoes, tie-breaks, floor', () => {
  it('dry-goods markers veto confident Produce breadcrumb', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Fresh', 'Produce'],
      breadcrumb_leaf: 'Produce',
      title: 'Oat Flapjack Bar',
    }));
    assert.equal(r.category, 'Food Cupboard');
  });

  it('flavour words alone never decide Chilled or Produce', () => {
    const r = scoreCategory(signals({ title: 'Blueberry Lemon Chews' }));
    assert.equal(r.category, 'Other');
  });

  it('ties resolve by fixed priority, Bakery beats Chilled', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Milk Bread'],
      breadcrumb_leaf: 'Milk Bread',
      title: '',
    }));
    assert.equal(r.category, 'Bakery');
  });

  it('title cannot demote a confident breadcrumb', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Bakery', 'Bread'],
      breadcrumb_leaf: 'Bread',
      title: 'Milky Chocolate Bar',
    }));
    assert.equal(r.category, 'Bakery');
  });

  it('non-food signals force Other', () => {
    const r = scoreCategory(signals({ title: 'Antibacterial Hand Wash 500ml' }));
    assert.equal(r.category, 'Other');
  });

  it('keyword soup with no match resolves to Other', () => {
    const r = scoreCategory(signals({ title: 'Tasty Treats Value Pack' }));
    assert.equal(r.category, 'Other');
    assert.equal(r.low_confidence, true);
  });

  it('empty signals score Other (worker treats them as absent, legacy clamp)', () => {
    const r = scoreCategory({});
    assert.equal(r.category, 'Other');
    assert.equal(r.low_confidence, true);
  });

  it('accepts legacy store display name field', () => {
    const { store_id, ...rest } = signals({ title: 'Fresh Milk 2 Pints' });
    void store_id;
    const r = scoreCategory({ ...rest, store: "Sainsbury's" });
    assert.equal(r.taxonomy_version, TAXONOMY_VERSION);
  });
});

describe('clampLegacyCategory (old extensions without signals)', () => {
  it('keeps canonical values, trims and case-folds', () => {
    assert.equal(clampLegacyCategory('chilled '), 'Chilled');
    assert.equal(clampLegacyCategory('Food Cupboard'), 'Food Cupboard');
  });

  it('defaults unknowns and blanks to Other', () => {
    assert.equal(clampLegacyCategory('garbage'), 'Other');
    assert.equal(clampLegacyCategory(null), 'Other');
    assert.equal(clampLegacyCategory(''), 'Other');
  });
});
