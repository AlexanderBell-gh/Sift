// Curated regression cases for workers/lib/category.js.
// Run: node --test workers/lib/category.test.js
//
// The corpus suite (workers/lib/category.eval.mjs) measures the scorer over
// 1,581 offline product names. These cases are the independent check: they
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

  it('ships taxonomy version 6', () => {
    assert.equal(TAXONOMY_VERSION, 6);
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
  // 'Widget 42' matches no title rule, so only the crumb can decide the shelf.
  const unknown = 'Widget 42';
  const aliases = [
    ['Bakery & Cakes', 'Bakery'],
    ['Fruit & Veg', 'Produce'],
    ['Dairy, Eggs & Chilled', 'Chilled'],
    ['Crisps & Snacks', 'Snacks'],
    ['Drinks', 'Beverages'],
    ['Cupboard', 'Food Cupboard'],
  ];

  for (const [crumb, category] of aliases) {
    it(`"${crumb}" decides ${category}`, () => {
      const r = scoreCategory(signals({
        title: unknown,
        breadcrumb_raw: ['Groceries', crumb],
      }));
      assert.equal(r.category, category);
      assert.equal(r.reason, 'department');
      assert.deepEqual(r.votes, [category]);
    });
  }

  it('scans deepest-first, so a leaf shelf beats a root shelf', () => {
    const r = scoreCategory(signals({
      title: unknown,
      breadcrumb_raw: ['Chilled', 'Food Cupboard'],
    }));
    assert.equal(r.category, 'Food Cupboard');
    assert.equal(r.reason, 'department');
  });

  it('decides ahead of the title vote', () => {
    // Title alone is Chilled via the oat milk compound.
    assert.equal(scoreCategory(signals({ title: 'Oat Milk 1L' })).category, 'Chilled');
    const r = scoreCategory(signals({
      title: 'Oat Milk 1L',
      breadcrumb_raw: ['Food & Drink', 'Food Cupboard', 'Cereals'],
    }));
    assert.equal(r.category, 'Food Cupboard');
    assert.equal(r.reason, 'department');
  });

  it('skips broad parent crumbs', () => {
    const r = scoreCategory(signals({
      title: unknown,
      breadcrumb_raw: ['Fresh Food', 'Groceries'],
    }));
    assert.equal(r.category, 'Other');
    assert.equal(r.reason, 'below-floor');
  });

  it('keeps the leaf map ahead of the department', () => {
    const r = scoreCategory(signals({
      title: unknown,
      breadcrumb_raw: ['Groceries', 'Snacks'],
      breadcrumb_leaf: 'Flapjacks',
    }));
    assert.equal(r.category, 'Food Cupboard');
    assert.equal(r.reason, 'leaf');
  });

  it('never outranks the hard rules', () => {
    const nonFood = scoreCategory(signals({
      title: 'Kitchen Roll 4 Pack',
      breadcrumb_raw: ['Groceries', 'Chilled'],
    }));
    assert.equal(nonFood.category, 'Other');
    assert.equal(nonFood.reason, 'non-food');

    const frozen = scoreCategory(signals({
      title: unknown,
      breadcrumb_raw: ['Bakery & Cakes', 'Frozen'],
    }));
    assert.equal(frozen.category, 'Frozen');
    assert.equal(frozen.reason, 'frozen');

    const ambient = scoreCategory(signals({
      title: 'Tinned Tomatoes 400g',
      breadcrumb_raw: ['Groceries', 'Fruit & Veg'],
    }));
    assert.equal(ambient.category, 'Food Cupboard');
    assert.equal(ambient.reason, 'ambient');
  });
});

describe('review regressions (20-10-2026)', () => {
  it('a bare Mushrooms is produce, not the frozen file label', () => {
    assert.equal(scoreCategory(signals({ title: 'Mushrooms' })).category, 'Produce');
    assert.equal(scoreCategory(signals({ title: 'Frozen Mushrooms' })).category, 'Frozen');
  });

  it('tea and coffee live on the drinks shelf', () => {
    for (const title of ['Yorkshire Tea', 'Waitrose Essential Tea Bags', 'Lyons Tea']) {
      assert.equal(scoreCategory(signals({ title })).category, 'Beverages', title);
    }
    assert.equal(scoreCategory(signals({ title: 'Iced Coffee' })).category, 'Beverages');
  });

  it('bare household words do not make food non-food', () => {
    assert.equal(scoreCategory(signals({ title: 'Sponge Cake' })).category, 'Bakery');
    assert.equal(scoreCategory(signals({ title: 'Victoria Sponge' })).category, 'Bakery');
    assert.notEqual(scoreCategory(signals({ title: 'Sponge Pudding' })).category, 'Other');
    assert.equal(scoreCategory(signals({ title: 'Foil Wrapped Easter Egg' })).category, 'Snacks');
  });

  it('household markers still catch the product', () => {
    for (const title of [
      'Toilet Duck', 'Toilet Cleaner', 'Cleaning Sponge', 'Kitchen Foil',
      'Scented Candle',
    ]) {
      assert.equal(scoreCategory(signals({ title })).category, 'Other', title);
    }
  });

  it('cooking adjectives and flavours never outvote the shelf noun', () => {
    assert.equal(scoreCategory(signals({ title: "Sainsbury's Golden Yolk Eggs" })).category, 'Chilled');
    assert.equal(scoreCategory(signals({ title: 'Tesco Finest Roast Turkey Breast' })).category, 'Chilled');
    assert.equal(
      scoreCategory(signals({ title: 'Porchetta with Rosemary & Sage Crisps' })).category,
      'Snacks',
    );
  });

  it('bar and chip compounds name the snack shelf', () => {
    assert.equal(scoreCategory(signals({ title: 'Tortilla Chips' })).category, 'Snacks');
    assert.equal(scoreCategory(signals({ title: 'Tortilla Chips Chilli' })).category, 'Snacks');
    assert.equal(scoreCategory(signals({ title: 'Pitta Chips' })).category, 'Snacks');
    assert.equal(
      scoreCategory(signals({ title: 'Bio&Me Protein Oat Bar Blueberry' })).category,
      'Snacks',
    );
  });

  it('brand words carry no shelf signal', () => {
    assert.equal(scoreCategory(signals({ title: 'Sun Bites Sweet Chilli' })).category, 'Snacks');
  });

  it('Hot Chocolate is a drink', () => {
    assert.equal(scoreCategory(signals({ title: 'Hot Chocolate' })).category, 'Beverages');
  });

  it('high-protein ready meals are chilled', () => {
    assert.equal(
      scoreCategory(signals({ title: "Sainsbury's 400g High Protein Bolognese" })).category,
      'Chilled',
    );
    assert.equal(
      scoreCategory(signals({ title: "Sainsbury's 400g High Protein Peri Peri Chicken" })).category,
      'Chilled',
    );
    assert.equal(scoreCategory(signals({ title: 'Peri Peri Sauce' })).category, 'Food Cupboard');
  });

  it('tinned bread is bakery, tinned tomatoes are cupboard', () => {
    assert.equal(
      scoreCategory(signals({ title: "Sainsbury's White Tinned Sourdough Bread" })).category,
      'Bakery',
    );
    assert.equal(scoreCategory(signals({ title: 'Tinned Tomatoes 400g' })).category, 'Food Cupboard');
  });

  it('a supergrain bowl is a cupboard grain pot', () => {
    assert.equal(
      scoreCategory(signals({ title: 'Merchant Gourmet Italian Supergrain Bowl' })).category,
      'Food Cupboard',
    );
  });

  it('bare freezer names stay frozen: the title cannot tell fresh from frozen', () => {
    // Locked decision: a bare name from uk-frozen.json is the freezer version.
    // 'Frozen ...' in the title always forces Frozen; fresh variants need a
    // leaf or a compound phrase.
    for (const title of ['Lasagne', 'Garlic Bread', 'Tiramisu', 'Gateau', 'Sorbet', 'Arctic Roll']) {
      assert.equal(scoreCategory(signals({ title })).category, 'Frozen', title);
    }
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
