// Tests for the category core. Run: node --test workers/lib/category.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANONICAL_CATEGORIES, normaliseTitle, parseCategory, buildPrompt, classifyCategory,
} from './category.js';

describe('canonical categories', () => {
  it('is the eight flat shelves, Drinks not Beverages', () => {
    assert.equal(CANONICAL_CATEGORIES.length, 8);
    assert.equal(new Set(CANONICAL_CATEGORIES).size, 8);
    assert.ok(CANONICAL_CATEGORIES.includes('Drinks'));
    assert.ok(!CANONICAL_CATEGORIES.includes('Beverages'));
  });
});

describe('normaliseTitle', () => {
  it('lowercases and drops punctuation', () => {
    assert.equal(normaliseTitle('Coca-Cola  ZERO'), 'coca cola zero');
  });

  it('strips size so every pack shares one id', () => {
    assert.equal(normaliseTitle('Coca Cola Zero 330ml'), 'coca cola zero');
    assert.equal(normaliseTitle('Coca Cola Zero 2L'), 'coca cola zero');
    assert.equal(normaliseTitle('Walkers Sensations 6 x 25g'), 'walkers sensations');
    assert.equal(normaliseTitle('Free Range Eggs 6'), 'free range eggs');
  });

  it('keeps a size-less title and tolerates empty input', () => {
    assert.equal(normaliseTitle('Oat Milk'), 'oat milk');
    assert.equal(normaliseTitle(''), '');
    assert.equal(normaliseTitle(null), '');
  });
});

describe('parseCategory', () => {
  it('round-trips every canonical label', () => {
    for (const category of CANONICAL_CATEGORIES) {
      assert.equal(parseCategory(category), category);
    }
  });

  it('folds case, spacing and punctuation', () => {
    assert.equal(parseCategory('  food   cupboard. '), 'Food Cupboard');
    assert.equal(parseCategory('DRINKS'), 'Drinks');
  });

  it('rejects anything that is not one label', () => {
    assert.equal(parseCategory('Beverages'), null);
    assert.equal(parseCategory('The answer is Chilled'), null);
    assert.equal(parseCategory(''), null);
    assert.equal(parseCategory(null), null);
  });
});

describe('buildPrompt', () => {
  it('carries the product signals and every shelf rule', () => {
    const prompt = buildPrompt({
      title: 'Chicken Caeser Wrap',
      brand: 'Tesco',
      breadcrumb_leaf: 'Wraps',
      breadcrumb_raw: ['Food & Drink', 'Fresh Food'],
      storage_text: 'Keep refrigerated',
    });
    for (const wanted of ['Chicken Caeser Wrap', 'Tesco', 'Wraps', 'Fresh Food', 'Keep refrigerated', 'Temperature beats type']) {
      assert.ok(prompt.includes(wanted), wanted);
    }
    for (const category of CANONICAL_CATEGORIES) assert.ok(prompt.includes(category), category);
  });

  it('stays under the ceiling with the largest signals', () => {
    const prompt = buildPrompt({
      title: 'x'.repeat(500),
      brand: 'b'.repeat(500),
      breadcrumb_leaf: 'l'.repeat(500),
      breadcrumb_raw: Array(20).fill('c'.repeat(500)),
      storage_text: 's'.repeat(500),
    });
    assert.ok(prompt.length <= 3000, `prompt was ${prompt.length}`);
  });
});

describe('classifyCategory', () => {
  const unused = () => {
    throw new Error('dependency must not be called');
  };

  it('manual override wins before every dependency', async () => {
    const scored = await classifyCategory({ title: 'Oat Milk' }, {
      override: 'chilled',
      lookup: unused,
      remember: unused,
      infer: unused,
    });
    assert.deepEqual(scored, { category: 'Chilled', reason: 'manual', low_confidence: false });
  });

  it('memory hit costs no AI call', async () => {
    let bumped = '';
    const scored = await classifyCategory({ title: 'Oat Milk 1L' }, {
      lookup: async (id) => { bumped = id; return 'Chilled'; },
      infer: unused,
    });
    assert.equal(bumped, 'oat milk');
    assert.deepEqual(scored, { category: 'Chilled', reason: 'memory', low_confidence: false });
  });

  it('ignores a stale memory label and asks the model', async () => {
    const scored = await classifyCategory({ title: 'Cola 330ml' }, {
      lookup: async () => 'Beverages',
      infer: async () => 'Drinks',
      remember: async () => {},
    });
    assert.equal(scored.category, 'Drinks');
    assert.equal(scored.reason, 'ai');
  });

  it('caches a valid AI answer against the size-stripped id', async () => {
    let cached = null;
    const scored = await classifyCategory({ title: 'Oat Milk 1L' }, {
      lookup: async () => null,
      infer: async () => ' chilled\n',
      remember: async (id, title, category) => { cached = { id, title, category }; },
    });
    assert.equal(scored.category, 'Chilled');
    assert.equal(scored.reason, 'ai');
    assert.deepEqual(cached, { id: 'oat milk', title: 'Oat Milk 1L', category: 'Chilled' });
  });

  it('garbage, throw or timeout falls back and caches nothing', async () => {
    for (const infer of [
      async () => 'I think this is food',
      async () => { throw new Error('AI timeout'); },
      async () => { throw new Error('model down'); },
    ]) {
      let remembered = false;
      const scored = await classifyCategory({ title: 'Mystery Item' }, {
        lookup: async () => null,
        infer,
        remember: async () => { remembered = true; },
      });
      assert.equal(scored.category, 'Other');
      assert.equal(scored.reason, 'fallback');
      assert.equal(scored.low_confidence, true);
      assert.equal(remembered, false);
    }
  });

  it('an empty title falls back without a lookup or model call', async () => {
    const scored = await classifyCategory({ title: '' }, { lookup: unused, infer: unused });
    assert.equal(scored.category, 'Other');
    assert.equal(scored.low_confidence, true);
  });
});
