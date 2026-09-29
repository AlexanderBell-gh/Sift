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

describe('v2 protein + storage (title-first for crumb-less stores)', () => {
  it('teriyaki chicken noodles title-only -> Chilled (side stripped, protein confirms)', () => {
    const r = scoreCategory(signals({
      title: "Sainsbury's 300g Small But Mighty Teriyaki Chicken with Wholewheat Noodles & Edamame",
    }));
    assert.equal(r.category, 'Chilled');
    assert.equal(r.taxonomy_version, TAXONOMY_VERSION);
  });

  it('chicken shawarma sweet potato title-only -> Chilled', () => {
    const r = scoreCategory(signals({
      title: 'Hide Chicken Shawarma with Hot Honey Sweet Potato 380g',
      brand: 'Hide',
      store_id: 'tesco',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('high protein peri peri chicken title-only -> Chilled (meal phrase clears floor)', () => {
    const r = scoreCategory(signals({
      title: "Sainsbury's 400g High Protein Peri Peri Chicken",
      store_id: 'sainsburys',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('generic peri peri chicken title-only -> Chilled (protein confirmation meets floor)', () => {
    const r = scoreCategory(signals({ title: 'Peri Peri Chicken 400g' }));
    assert.equal(r.category, 'Chilled');
    assert.equal(r.low_confidence, true);
  });

  it('single non-protein title-only stays Other (sweet potato)', () => {
    const r = scoreCategory(signals({ title: 'Sweet Potato 500g' }));
    assert.equal(r.category, 'Other');
  });

  it('chicken soup with cupboard crumb -> Food Cupboard (ambient exemption blocks protein veto)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Food Cupboard', 'Tins & Cans', 'Soup'],
      breadcrumb_leaf: 'Soup',
      title: 'Chicken Soup 400g',
    }));
    assert.equal(r.category, 'Food Cupboard');
  });

  it('chicken flavour crisps with snacks crumb -> Snacks (flavour exemption)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Snacks', 'Crisps'],
      breadcrumb_leaf: 'Crisps',
      title: 'Chicken Flavour Crisps 150g',
    }));
    assert.equal(r.category, 'Snacks');
  });

  it('chilled storage text confirms Chilled', () => {
    const r = scoreCategory(signals({
      title: 'Peri Peri Chicken 400g',
      storage_text: 'Microwave from chilled. Stir thoroughly. Check food is piping hot.',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('serve-chilled cola stays Beverages (storage never demotes a confident crumb)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Beverages', 'Soft Drinks', 'Cola'],
      breadcrumb_leaf: 'Cola',
      title: 'Fresh Cola 2L',
      storage_text: 'Serve chilled. Shake before use. Once opened keep refrigerated.',
    }));
    assert.equal(r.category, 'Beverages');
    assert.equal(r.reason, 'breadcrumb');
  });

  it('cool-dry-place chicken is not Chilled (ambient storage vetoes)', () => {
    const r = scoreCategory(signals({
      title: 'Chicken in White Sauce 400g',
      storage_text: 'Store in a cool dry place. Once opened keep refrigerated and eat within 2 days.',
    }));
    assert.notEqual(r.category, 'Chilled');
  });

  it('keep-frozen storage forces Frozen', () => {
    const r = scoreCategory(signals({
      title: 'Garden Peas 500g',
      storage_text: 'Keep frozen at -18C. Do not refreeze once defrosted.',
    }));
    assert.equal(r.category, 'Frozen');
  });

  it('suitable-for-freezing fresh meat stays Chilled (no false frozen force)', () => {
    const r = scoreCategory(signals({
      title: 'Fresh Chicken Breast 500g',
      storage_text: 'Suitable for home freezing. Keep refrigerated below 5C. Use by the date shown.',
    }));
    assert.equal(r.category, 'Chilled');
  });

  it('wash instructions never trip non-food veto (lettuce stays Produce)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Produce', 'Salad', 'Lettuce'],
      breadcrumb_leaf: 'Lettuce',
      title: 'Iceberg Lettuce 200g',
      storage_text: 'Wash before use. Keep refrigerated below 5C.',
    }));
    assert.equal(r.category, 'Produce');
  });

  it('Sainsbury-style ready-meal trail -> Chilled confident (no Frozen trap)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Dairy, eggs & chilled', 'Ready meals', 'Ready meals for one'],
      breadcrumb_leaf: 'Ready meals for one',
      title: "Sainsbury's 300g Small But Mighty Teriyaki Chicken with Wholewheat Noodles & Edamame",
      store_id: 'sainsburys',
    }));
    assert.equal(r.category, 'Chilled');
    assert.equal(r.reason, 'breadcrumb');
    assert.equal(r.low_confidence, false);
  });

  it('Tesco high-protein ready-meal leaf -> Chilled confident', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Fresh Food', 'Ready Meals', 'High Protein Ready Meal'],
      breadcrumb_leaf: 'High Protein Ready Meal',
      title: 'Hide Chicken Shawarma with Hot Honey Sweet Potato 380g',
      store_id: 'tesco',
    }));
    assert.equal(r.category, 'Chilled');
    assert.equal(r.reason, 'breadcrumb');
  });

  it('Huel High Protein Noodles title-only -> Food Cupboard (claim is marketing, not freshness)', () => {
    const r = scoreCategory(signals({
      title: 'Huel Black Edition Spicy Korean Noodles High Protein Noodles 102g',
      brand: 'Huel',
    }));
    assert.equal(r.category, 'Food Cupboard');
    assert.equal(r.taxonomy_version, TAXONOMY_VERSION);
  });

  it('bare High Protein leaf -> Chilled via aisle alias (term-removal backstop)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Fresh Food', 'High Protein'],
      breadcrumb_leaf: 'High Protein',
      title: 'Protein Bar 60g',
      store_id: 'tesco',
    }));
    assert.equal(r.category, 'Chilled');
    assert.equal(r.reason, 'breadcrumb');
  });

  it('Bananas title-only -> Produce (Tesco loose fruit case)', () => {
    const r = scoreCategory(signals({
      title: 'Tesco Bananas 5 Pack',
      store_id: 'tesco',
    }));
    assert.equal(r.category, 'Produce');
  });

  it('cupboard-stored bananas stay Produce (ambient storage never vetoes Produce)', () => {
    const r = scoreCategory(signals({
      title: 'Tesco Fairtrade Organic Bananas 5 Pack',
      store_id: 'tesco',
      storage_text: 'Store in a cool dry place away from direct sunlight.',
    }));
    assert.equal(r.category, 'Produce');
  });
});

describe('hardening batch (29-09-2026, title-only probe misses)', () => {
  it('pork pies title-only -> Chilled (meat pie beats frozen pie token)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Pork Pies 4 Pack' }));
    assert.equal(r.category, 'Chilled');
  });

  it('tinned tomatoes title-only -> Food Cupboard (tinned vetoes Produce)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Tinned Tomatoes 400g' }));
    assert.equal(r.category, 'Food Cupboard');
  });

  it('chopped tomatoes title-only -> Food Cupboard (cupboard phrase beats produce tie)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Chopped Tomatoes 400g' }));
    assert.equal(r.category, 'Food Cupboard');
  });

  it('carrot cake title-only -> Bakery (cake phrase beats carrot token)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Carrot Cake 400g' }));
    assert.equal(r.category, 'Bakery');
  });

  it('cod fillets title-only -> Chilled (corpus fish, was below-floor Other)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Cod Fillets 300g' }));
    assert.equal(r.category, 'Chilled');
  });

  it('haddock title-only -> Chilled (corpus fish)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Haddock Fillets 300g' }));
    assert.equal(r.category, 'Chilled');
  });

  it('toilet roll title-only -> Other (household non-food, never Bakery)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Toilet Roll 9 Pack' }));
    assert.equal(r.category, 'Other');
    assert.equal(r.reason, 'non-food');
  });

  it('tomato passata title-only -> Food Cupboard (phrase beats tomato token)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Tomato Passata 500g' }));
    assert.equal(r.category, 'Food Cupboard');
  });

  it('tinned sourdough still Bakery (tinned veto never touches Bakery)', () => {
    const r = scoreCategory(signals({
      title: "Sainsbury's White Tinned Sourdough Bread, Taste the Difference 500g",
      store_id: 'sainsburys',
    }));
    assert.equal(r.category, 'Bakery');
  });
});

describe('freezable-at-home storage is not sold-frozen (29-09-2026)', () => {
  it('bakewell scones with defrost/refreeze copy -> Bakery, not storage-frozen', () => {
    const r = scoreCategory(signals({
      title: "Sainsbury's 4 x Cherry Bakewell Scones, Taste the Difference",
      store_id: 'sainsburys',
      storage_text: 'For best before date: see front of pack. Store in a cool, dry place away from direct sunlight. Once opened, store in an airtight container for best quality. Once defrosted use the same day. Do not refreeze once defrosted. For best quality, freeze as soon as possible after purchase and always within the best before date. Once frozen consume within 1 month.',
    }));
    assert.equal(r.category, 'Bakery');
  });

  it('tinned sourdough with defrost/refreeze copy -> Bakery, not storage-frozen', () => {
    const r = scoreCategory(signals({
      title: "Sainsbury's White Tinned Sourdough Bread, Taste the Difference 500g",
      store_id: 'sainsburys',
      storage_text: 'For best before date: see neck tie. Store in a cool, dry place away from direct sunlight. Once opened, store in an airtight container for best quality. For best quality, freeze as soon as possible after purchase and always within the best before date. Once frozen consume within 1 month. Defrost fully before use and use within 24 hours. Do not refreeze once defrosted.',
    }));
    assert.equal(r.category, 'Bakery');
  });

  it('do-not-refreeze alone never forces Frozen (sold-frozen needs keep/store/-18)', () => {
    const r = scoreCategory(signals({
      title: 'Fresh Croissants 4 Pack',
      storage_text: 'Once defrosted, do not refreeze.',
    }));
    assert.notEqual(r.reason, 'storage-frozen');
  });
});

describe('plural-fold dedup (29-09-2026, Sunbites pepper-tie case)', () => {
  it('sunbites black pepper multipack -> Snacks (pepper must not double-count past crisps)', () => {
    const r = scoreCategory(signals({
      title: 'Sun Bites 6 x 25g Sour Cream & Cracked Black Pepper Multipack Snacks Crisps',
    }));
    assert.equal(r.category, 'Snacks');
  });

  it('potato waffles stay Frozen (tie resolves Frozen at single-count)', () => {
    const r = scoreCategory(signals({ title: 'Potato Waffles 500g' }));
    assert.equal(r.category, 'Frozen');
  });

  it('bananas stay Produce on a single count (floor still clears)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Bananas 5 Pack', store_id: 'tesco' }));
    assert.equal(r.category, 'Produce');
  });

  it('sausage rolls stay Bakery (roll fold covers rolls)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Sausage Rolls 4 Pack' }));
    assert.equal(r.category, 'Bakery');
  });

  it('prawn sandwich stays Chilled (protein confirm intact)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Prawn Sandwich 200g' }));
    assert.equal(r.category, 'Chilled');
  });

  it('ready meal keeps Chilled (meal phrase needs no plural double)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Ready Meal Chicken Tikka 400g' }));
    assert.equal(r.category, 'Chilled');
  });

  it('chicken nuggets stay Frozen (nuggets exempt from protein confirm, pizza precedent)', () => {
    const r = scoreCategory(signals({ title: 'Tesco Chicken Nuggets 500g' }));
    assert.equal(r.category, 'Frozen');
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

describe('v3 phone path (title/brand/store only, no crumbs)', () => {
  it('taxonomy version is 3', () => {
    assert.equal(TAXONOMY_VERSION, 3);
    const r = scoreCategory(signals({ title: 'Cheddar 350g' }));
    assert.equal(r.taxonomy_version, 3);
  });

  const phoneCases = [
    // [title, expected]
    ['Semi-Skimmed Milk 4Pint', 'Chilled'],
    ['Whole Milk 4Pint', 'Chilled'],
    ['Cheddar 350g', 'Chilled'],
    ['Tuna Chunks 145g', 'Chilled'],
    ['Hummus 200g', 'Chilled'],
    ['Whole Chicken', 'Chilled'],
    ['Chicken Breast Fillets', 'Chilled'],
    ['Salted Peanuts 200g', 'Snacks'],
    ['Chocolate Chip Cookies 200g', 'Snacks'],
    ['Diet Coke 2L', 'Beverages'],
    ['Coca Cola 2L', 'Beverages'],
    ['Pepsi Max 2L', 'Beverages'],
    ['Orange Juice 1L', 'Beverages'],
    ['Apple Braeburn', 'Produce'],
    ['Bananas Loose', 'Produce'],
    ['White Potatoes', 'Produce'],
    ['Lemons 4 Pack', 'Produce'],
    ['Fish Fingers 500g', 'Frozen'],
    ['Frozen Peas 500g', 'Frozen'],
    ['Frozen Pizza Margherita', 'Frozen'],
    ['Chicken Pizza 300g', 'Frozen'],
    ['White Bread 800g', 'Bakery'],
    ['Croissant 4 Pack', 'Bakery'],
    ['Penne Pasta 500g', 'Food Cupboard'],
    ['Spaghetti 500g', 'Food Cupboard'],
    ['Tinned Custard 400g', 'Food Cupboard'],
    ['Chicken Soup 400g', 'Food Cupboard'],
    ['Olive Oil 1L', 'Food Cupboard'],
    ['Sweet Potato 500g', 'Other'],
    ['Antibacterial Hand Wash 500ml', 'Other'],
    ['Tasty Treats Value Pack', 'Other'],
  ];
  for (const [title, expected] of phoneCases) {
    it(`title-only ${title} -> ${expected}`, () => {
      const r = scoreCategory(signals({ title }));
      assert.equal(r.category, expected);
    });
  }

  it('quantities never decide: bare pack sizes stay Other', () => {
    const r = scoreCategory(signals({ title: '4 Pack 500g 2 Pints' }));
    assert.equal(r.category, 'Other');
  });

  it('plural stems match short keywords: waffles keep Frozen on tie-break', () => {
    const r = scoreCategory(signals({ title: 'Potato Waffles 500g' }));
    assert.equal(r.category, 'Frozen');
  });

  it('singular lemon strips but plural lemons scores Produce', () => {
    assert.equal(scoreCategory(signals({ title: 'Lemon Cheesecake 400g' })).category, 'Other');
    assert.equal(scoreCategory(signals({ title: 'Lemons 4 Pack' })).category, 'Produce');
  });

  it('brand adds signal: weak title + drinks brand -> Beverages', () => {
    const r = scoreCategory(signals({ title: 'Zero 2L', brand: 'Coca Cola' }));
    assert.equal(r.category, 'Beverages');
  });

  it('brand never overrides a confident crumb', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Bakery', 'Bread'],
      breadcrumb_leaf: 'Bread',
      title: 'Cola Bread',
      brand: 'Pepsi',
    }));
    assert.equal(r.category, 'Bakery');
    assert.equal(r.reason, 'breadcrumb');
  });

  it('store-leaf aliases cover all 11 phone stores', () => {
    const stores = ['tesco', 'sainsburys', 'asda', 'morrisons', 'marksandspencer',
      'aldi', 'lidl', 'coop', 'waitrose', 'iceland', 'ocado'];
    for (const store of stores) {
      const flap = scoreCategory(signals({
        breadcrumb_raw: ['Cereals', 'Flapjacks'],
        breadcrumb_leaf: 'Flapjacks',
        title: 'Flapjack 60g',
        store_id: store,
      }));
      assert.equal(flap.category, 'Food Cupboard');
      const hp = scoreCategory(signals({
        breadcrumb_raw: ['Fresh Food', 'High Protein'],
        breadcrumb_leaf: 'High Protein',
        title: 'Protein Bar 60g',
        store_id: store,
      }));
      assert.equal(hp.category, 'Chilled');
    }
  });
});

describe('bakery rescue + scoped frozen veto (30-09-2026)', () => {
  it('tinned sourdough title-only -> Bakery decisive', () => {
    const r = scoreCategory(signals({
      title: "Sainsbury's White Tinned Sourdough Bread, Taste the Difference 500g",
      store_id: 'sainsburys',
    }));
    assert.equal(r.category, 'Bakery');
    assert.equal(r.reason, 'title');
  });

  it('cherry bakewell scones title-only -> Bakery (bakewell beats cherry)', () => {
    const r = scoreCategory(signals({
      title: "Sainsbury's 4 x Cherry Bakewell Scones, Taste the Difference",
      store_id: 'sainsburys',
    }));
    assert.equal(r.category, 'Bakery');
  });

  it('noisy frozen mid-trail crumb cannot override bakery leaf + title (sourdough)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Frozen', 'Bakery', 'Bread'],
      breadcrumb_leaf: 'Bread',
      title: "Sainsbury's White Tinned Sourdough Bread, Taste the Difference 500g",
      store_id: 'sainsburys',
    }));
    assert.equal(r.category, 'Bakery');
    assert.equal(r.reason, 'breadcrumb');
  });

  it('noisy frozen mid-trail crumb cannot override bakery leaf + title (scones)', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Frozen', 'Bakery', 'Scones'],
      breadcrumb_leaf: 'Scones',
      title: "Sainsbury's 4 x Cherry Bakewell Scones, Taste the Difference",
      store_id: 'sainsburys',
    }));
    assert.equal(r.category, 'Bakery');
  });

  it('frozen leaf still forces Frozen', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Frozen', 'Vegetables'],
      breadcrumb_leaf: 'Frozen Peas',
      title: 'Garden Peas 500g',
    }));
    assert.equal(r.category, 'Frozen');
    assert.equal(r.reason, 'frozen-veto');
  });

  it('frozen jsonld category still forces Frozen', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Bakery', 'Bread'],
      breadcrumb_leaf: 'Bread',
      title: 'Part-Baked Baguettes 4 Pack',
      jsonld_category: 'Frozen Food',
    }));
    assert.equal(r.category, 'Frozen');
  });

  it('frozen mid-trail crumb still wins when nothing confident opposes it', () => {
    const r = scoreCategory(signals({
      breadcrumb_raw: ['Frozen', 'Pizza'],
      breadcrumb_leaf: 'Specials',
      title: 'Stone Baked Special 400g',
    }));
    assert.equal(r.category, 'Frozen');
  });
});
