// Harvest proposals are reviewed by a human, so the counters must be boring
// and exact: one wrong skip loses a label, one wrong proposal poisons a shelf.
// Run: node --test workers/lib/category.learn.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { propose, formatProposals } from './category.learn.js';

function row(overrides) {
  return {
    name: '',
    leaf: '',
    department: '',
    category_reason: 'title',
    ...overrides,
  };
}

describe('learn proposals', () => {
  it('returns nothing for no rows', () => {
    assert.deepEqual(propose([]), { leaves: [], tokens: [] });
    assert.deepEqual(propose(), { leaves: [], tokens: [] });
  });

  it('proposes an unmapped leaf once, with a count', () => {
    const out = propose([
      row({ leaf: 'vegan', department: 'Chilled' }),
      row({ leaf: 'Vegan', department: 'Chilled' }),
    ]);
    assert.deepEqual(out.leaves, [
      { leaf: 'vegan', category: 'Chilled', count: 2 },
    ]);
  });

  it('proposes a leaf the map already agrees with', () => {
    const out = propose([row({ leaf: 'prepared salads', department: 'Chilled' })]);
    assert.deepEqual(out.leaves, [
      { leaf: 'prepared salads', category: 'Chilled', count: 1 },
    ]);
  });

  it('rejects a leaf the map already answers differently', () => {
    const out = propose([row({ leaf: 'prepared salads', department: 'Snacks' })]);
    assert.deepEqual(out.leaves, []);
  });

  it('rejects a leaf seen under two departments', () => {
    const out = propose([
      row({ leaf: 'pizza & garlic bread', department: 'Frozen' }),
      row({ leaf: 'pizza & garlic bread', department: 'Chilled' }),
    ]);
    assert.deepEqual(out.leaves, []);
  });

  it('skips manual overrides and rows with no department', () => {
    const out = propose([
      row({ name: 'Weird Thing', leaf: 'weird aisle', department: 'Snacks', category_reason: 'manual' }),
      row({ name: 'Another Thing', leaf: 'another aisle', department: '' }),
    ]);
    assert.deepEqual(out, { leaves: [], tokens: [] });
  });

  it('needs two agreeing names before proposing a token', () => {
    const single = propose([row({ name: 'Seitan Pieces', department: 'Chilled' })]);
    assert.deepEqual(single.tokens, []);

    const pair = propose([
      row({ name: 'Seitan Pieces', department: 'Chilled' }),
      row({ name: 'Seitan Burgers', department: 'Chilled' }),
    ]);
    assert.deepEqual(pair.tokens, [
      { token: 'seitan', category: 'Chilled', count: 2 },
    ]);
  });

  it('rejects a token seen under two departments', () => {
    const out = propose([
      row({ name: 'Seitan Pieces', department: 'Chilled' }),
      row({ name: 'Seitan Burgers', department: 'Frozen' }),
    ]);
    assert.deepEqual(out.tokens, []);
  });

  it('skips stop tokens, short fragments and curated vocabulary', () => {
    const out = propose([
      row({ name: 'Seitan and Kombucha', department: 'Chilled' }),
      row({ name: 'Seitan ab Kombucha', department: 'Chilled' }),
      row({ name: 'Seitan Milk Kombucha', department: 'Chilled' }),
    ]);
    assert.deepEqual(out.tokens.map((entry) => entry.token), ['kombucha', 'seitan']);
  });

  it('formats pasteable lexicon lines', () => {
    const text = formatProposals(propose([
      row({ name: 'Seitan Pieces', leaf: 'plant based', department: 'Chilled' }),
      row({ name: 'Seitan Burgers', leaf: 'plant based', department: 'Chilled' }),
    ]));
    assert.match(text, /leaf candidates \(1\)/);
    assert.match(text, /'plant based': 'Chilled', \/\/ seen 2/);
    assert.match(text, /'seitan': 'Chilled', \/\/ 2 names/);
  });
});
