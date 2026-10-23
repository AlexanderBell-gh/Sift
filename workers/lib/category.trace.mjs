#!/usr/bin/env node
// Trace one title through the scorer. Debug aid for the eight-rule path.
//
//   node workers/lib/category.trace.mjs "Bay Leaves"
//   node workers/lib/category.trace.mjs "Oat Milk" --leaf "Milk Alternatives"
//   node workers/lib/category.trace.mjs "Chicken Noodles" --crumbs "Chilled,Soup"
//   node workers/lib/category.trace.mjs "Lasagne" --holdout
//
// Default scores with the shipped lexicon, exactly like prod. --holdout drops
// the held-out corpus names to show the keyword-tier view the eval suite uses.

import { scoreCategory, DEFAULT_LEXICON, normalise } from './category.js';
import { PHRASES, HOLDOUT } from './category.phrases.js';
import { CURATED_NAMES } from './category.lexicon.js';

const argv = process.argv.slice(2);
let title = '';
let leaf = '';
let crumbs = [];
let holdout = false;

for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--leaf') leaf = argv[++i] || '';
  else if (argv[i] === '--crumbs') crumbs = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
  else if (argv[i] === '--holdout') holdout = true;
  else if (!title) title = argv[i];
}

// Curated names are hand rules, not corpus learning: the eval keeps them in
// the holdout lexicon, so the trace keeps them too.
const held = new Set(HOLDOUT);
let lexicon = DEFAULT_LEXICON;
if (holdout) {
  const phrases = {};
  for (const [name, category] of Object.entries(PHRASES)) {
    if (!held.has(name) || CURATED_NAMES.has(name)) phrases[name] = category;
  }
  lexicon = { ...DEFAULT_LEXICON, phrases };
}

const tokens = normalise(title).split(' ').filter(Boolean);
const titleKey = normalise(title);
console.log(`title: ${JSON.stringify(title)}`);
if (leaf) console.log(`leaf: ${JSON.stringify(leaf)}`);
if (crumbs.length) console.log(`crumbs: ${JSON.stringify(crumbs)}`);
if (holdout) console.log('lexicon: holdout (corpus names removed, keyword-tier view)');
console.log(`tokens: ${tokens.join(' | ')}`);

// One vocabulary table: a token carries its own strength.
const tierOf = (tier, token) => Object.entries(tier)
  .find(([, list]) => list.includes(token))?.[0] || '-';
for (const token of tokens) {
  const entry = DEFAULT_LEXICON.vocabulary[token];
  const curatedLabel = entry ? `${entry.strength}/${entry.category || '-'}` : '-';
  console.log(
    `  ${token.padEnd(14)}`
    + ` curated=${curatedLabel.padEnd(22)}`
    + ` derived=${tierOf(DEFAULT_LEXICON.derived, token).padEnd(14)}`
    + ` derivedWeak=${tierOf(DEFAULT_LEXICON.derivedWeak, token).padEnd(14)}`,
  );
}

// A phrase is a full product name, not a token.
const phraseHit = lexicon.phrases[titleKey];
if (phraseHit) {
  console.log(`phrase: ${phraseHit}${CURATED_NAMES.has(titleKey) ? ' (curated)' : ''}`);
}

const signals = { title };
if (leaf) signals.breadcrumb_leaf = leaf;
if (crumbs.length) signals.breadcrumb_raw = crumbs;

const scored = scoreCategory(signals, { lexicon });
console.log(
  `result: ${scored.category} (${scored.reason})`
  + ` votes=${JSON.stringify(scored.votes)}`
  + `${scored.low_confidence ? ' LOW CONFIDENCE' : ''}`,
);
