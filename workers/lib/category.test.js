// Curated regression cases for workers/lib/category.js.
// Run: node --test workers/lib/category.test.js
//
// The corpus suite (workers/lib/category.eval.mjs) measures the scorer over
// 1,572 offline product names. These cases are the independent check: they
// are hand-written, they cover the locked regressions, and they pin the
// behaviour of every rule.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCategory, TAXONOMY_VERSION, CANONICAL_CATEGORIES } from './category.js';
import { LEAF_MAP } from './category.lexicon.js';

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

describe('taxonomy', () => {
  it('keeps the 8 canonical categories in order', () => {
    assert.equal(CANONICAL_CATEGORIES.length, 8);
    assert.equal(CANONICAL_CATEGORIES[0], 'Chilled');
    assert.equal(CANONICAL_CATEGORIES[7], 'Other');
  });

  it('ships taxonomy version 4', () => {
    assert.equal(TAXONOMY_VERSION, 4);
  });

  it('every score carries a reason and the current version', () => {
    const r = scoreCategory(signals({ title: 'Semi-Skimmed Milk 2L' }));
    assert.equal(r.taxonomy_version, TAXONOMY_VERSION);
    assert.ok(r.reason);
  });
});

describe('locked regressions', () => {
  it('Graze Oat Boosts Sticky Toffee Flapjacks -> Food Cupboard', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Food Cupboard', 'Cereals', 'Flapjacks'],
      breadcrumb_leaf: 'Flapjacks',
      title: 'Graze Oat Boosts Sticky Toffee Flapjacks',
      brand: 'Graze',
    }));
    assert.equal(r.category, 'Food Cupboard');
  });

  it('Lemon & Blueberry Flapjacks -> Food Cupboard (flavour never decides)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Food Cupboard', 'Cereals', 'Flapjacks'],
      breadcrumb_leaf: 'Flapjacks',
      title: 'Lemon & Blueberry Flapjacks',
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

  it('Frozen Blueberries -> Frozen', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Frozen', 'Berries'],
      breadcrumb_leaf: 'Berries',
      title: 'Frozen Blueberries 400g',
    }));
    assert.equal(r.category, 'Frozen');
  });

  it('Fresh Milk 2 Pints -> Chilled', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Chilled', 'Milk'],
      breadcrumb_leaf: 'Milk',
      title: 'Fresh Milk 2 Pints',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('Oat Milk -> Chilled (plant milk is a dairy, not an oat)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Chilled', 'Milk Alternatives'],
      breadcrumb_leaf: 'Milk Alternatives',
      title: 'Oat Milk 1L',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('Chocolate Chip Cookies -> Snacks', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Snacks', 'Cookies'],
      breadcrumb_leaf: 'Cookies',
      title: 'Chocolate Chip Cookies 200g',
    }));
    assert.equal(r.category, 'Snacks');
  });

  it('Spicy Mango Salad -> Chilled on a prepared salad leaf', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Produce'],
      breadcrumb_leaf: 'Prepared Salads',
      title: 'Spicy Mango Salad',
      brand: 'HEALTH (Aldi',
      store_id: 'aldi',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('Spicy Mango Salad -> Chilled on a singular leaf (plural fold)', () => {
    const r = scoreCategory(signals({
      breadcrumb_leaf: 'prepared salad',
      title: 'Spicy Mango Salad',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('Spicy Mango Salad -> Chilled on a dressed salad leaf (head match)', () => {
    const r = scoreCategory(signals({
      breadcrumb_leaf: 'dressed salad and coleslaw',
      title: 'Spicy Mango Salad',
    }));
    assert.equal(r.category, 'Chilled');
  });
});

describe('two shelves, one title', () => {
  it('Oat Milk -> Chilled, not Food Cupboard', () => {
    assert.equal(scoreCategory(signals({ title: 'Oat Milk 1L' })).category, 'Chilled');
  });

  it('Tomato Soup -> Food Cupboard, not Produce', () => {
    assert.equal(scoreCategory(signals({ title: 'Tomato Soup' })).category, 'Food Cupboard');
  });

  it('Chicken Soup -> Chilled, not Food Cupboard', () => {
    assert.equal(scoreCategory(signals({ title: 'Chicken Soup' })).category, 'Chilled');
  });

  it('Peanut Butter -> Food Cupboard (the phrase masks "butter")', () => {
    assert.equal(scoreCategory(signals({ title: 'Peanut Butter' })).category, 'Food Cupboard');
  });

  it('Milk Chocolate Bar -> Snacks, not Chilled', () => {
    assert.equal(scoreCategory(signals({ title: 'Milk Chocolate Bar' })).category, 'Snacks');
  });

  it('Coffee Beans -> Beverages, not Food Cupboard', () => {
    assert.equal(scoreCategory(signals({ title: 'Coffee Beans' })).category, 'Beverages');
  });
});

describe('leaf map', () => {
  for (const [leaf, category] of Object.entries(LEAF_MAP)) {
    it(`leaf "${leaf}" -> ${category}`, () => {
      const r = scoreCategory(signals({ breadcrumb_leaf: leaf }));
      assert.equal(r.category, category);
    });
  }
});

describe('title representatives', () => {
  const cases = [
    ['Semi-Skimmed Milk 2L', 'Chilled'],
    ['Walkers Ready Salted Crisps 6pk', 'Snacks'],
    ['Coca Cola Original 330ml', 'Beverages'],
    ['Bananas Loose', 'Produce'],
    ['Hash Browns', 'Frozen'],
    ['Sourdough Bread 800g', 'Bakery'],
    ['Basmati Rice 1kg', 'Food Cupboard'],
  ];
  for (const [title, expected] of cases) {
    it(`${title} -> ${expected}`, () => {
      assert.equal(scoreCategory(signals({ title })).category, expected);
    });
  }
});

describe('hard rules', () => {
  it('household goods are Other', () => {
    assert.equal(scoreCategory(signals({ title: 'Kitchen Roll 4 Pack' })).category, 'Other');
    assert.equal(scoreCategory(signals({ title: 'Dog Food 2kg' })).category, 'Other');
    assert.equal(
      scoreCategory(signals({ title: 'Antibacterial Surface Cleaner 500ml' })).category,
      'Other',
    );
  });

  it('a household marker anywhere in the title wins', () => {
    assert.equal(scoreCategory(signals({ title: 'Tissues 100 Pack' })).category, 'Other');
  });

  it('frozen in the title forces Frozen', () => {
    const r = scoreCategory(signals({ title: 'Frozen Peas 900g' }));
    assert.equal(r.category, 'Frozen');
    assert.equal(r.reason, 'frozen');
  });

  it('a frozen leaf forces Frozen', () => {
    const r = scoreCategory(signals({
      breadcrumb_leaf: 'Frozen Desserts',
      title: 'Sticky Toffee Pudding',
    }));
    assert.equal(r.category, 'Frozen');
  });

  it('storage text forces Frozen', () => {
    const r = scoreCategory(signals({
      title: 'Fish Fingers',
      storage_text: 'Keep Frozen -18C',
    }));
    assert.equal(r.category, 'Frozen');
  });

  it('freezable-at-home copy never forces Frozen', () => {
    const r = scoreCategory(signals({
      title: 'Scones 4 Pack',
      storage_text: 'Freeze as soon as possible after purchase',
    }));
    assert.equal(r.category, 'Bakery');
  });

  it('a tin or a jar is a cupboard good', () => {
    assert.equal(scoreCategory(signals({ title: 'Tinned Tomatoes 400g' })).category, 'Food Cupboard');
    assert.equal(scoreCategory(signals({ title: 'Canned Sweetcorn 400g' })).category, 'Food Cupboard');
  });
});

describe('honest fallback', () => {
  it('a title with no signal is Other and low confidence', () => {
    const r = scoreCategory(signals({ title: 'Widget 42' }));
    assert.equal(r.category, 'Other');
    assert.equal(r.reason, 'below-floor');
    assert.equal(r.low_confidence, true);
  });
});

describe('department', () => {
  it('breaks a title tie when it names one of the shelves that voted', () => {
    const plain = scoreCategory(signals({ title: 'Chicken Noodles 60g' }));
    assert.equal(plain.category, 'Food Cupboard');
    const withDepartment = scoreCategory(signals({
      title: 'Chicken Noodles 60g',
      breadcrumb_raw: ['Chilled', 'Soup'],
    }));
    assert.equal(withDepartment.category, 'Chilled');
    assert.equal(withDepartment.reason, 'title+department');
  });

  it('is ignored when it carries no shelf signal', () => {
    const r = scoreCategory(signals({
      title: 'Chicken Noodles 60g',
      breadcrumb_raw: ['Fresh Food', 'Soup'],
    }));
    assert.equal(r.category, 'Food Cupboard');
  });
});

describe('manual override', () => {
  it('wins before every rule', () => {
    const r = scoreCategory(signals({ title: 'Semi-Skimmed Milk 2L' }), { override: 'Snacks' });
    assert.equal(r.category, 'Snacks');
    assert.equal(r.reason, 'manual');
  });

  it('an unknown override is ignored', () => {
    const r = scoreCategory(signals({ title: 'Semi-Skimmed Milk 2L' }), { override: 'Nonsense' });
    assert.equal(r.category, 'Chilled');
    assert.equal(r.reason, 'title');
  });
});
