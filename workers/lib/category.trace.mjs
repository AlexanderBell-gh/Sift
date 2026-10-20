#!/usr/bin/env node
// Trace one title through the scorer. Debug aid for the seven-rule path.
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
import { DUP_BASE, PHRASE_OVERRIDES, PHRASE_ADDITIONS } from './category.lexicon.js';

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
const curated = new Set([
  ...Object.keys(DUP_BASE),
  ...Object.keys(PHRASE_OVERRIDES),
  ...Object.keys(PHRASE_ADDITIONS),
].map(normalise));
const held = new Set(HOLDOUT);
let lexicon = DEFAULT_LEXICON;
if (holdout) {
  const phrases = {};
  for (const [name, category] of Object.entries(PHRASES)) {
    if (!held.has(name) || curated.has(name)) phrases[name] = category;
  }
  lexicon = { ...DEFAULT_LEXICON, phrases };
}

const tokens = normalise(title).split(' ').filter(Boolean);
console.log(`title: ${JSON.stringify(title)}`);
if (leaf) console.log(`leaf: ${JSON.stringify(leaf)}`);
if (crumbs.length) console.log(`crumbs: ${JSON.stringify(crumbs)}`);
if (holdout) console.log('lexicon: holdout (corpus names removed, keyword-tier view)');
console.log(`tokens: ${tokens.join(' | ')}`);

for (const token of tokens) {
  const hand = DEFAULT_LEXICON.keywordOverrides[token];
  const weak = DEFAULT_LEXICON.weak[token];
  const derived = Object.entries(DEFAULT_LEXICON.derived)
    .find(([, list]) => list.includes(token))?.[0];
  const derivedWeak = Object.entries(DEFAULT_LEXICON.derivedWeak)
    .find(([, list]) => list.includes(token))?.[0];
  const phrase = PHRASES[token];
  let phraseLabel = '-';
  if (phrase) {
    phraseLabel = holdout && held.has(token) && !curated.has(token)
      ? `${phrase} HELD OUT`
      : phrase;
  }
  console.log(
    `  ${token.padEnd(14)}`
    + ` hand=${(hand || '-').padEnd(14)}`
    + ` weak=${(weak || '-').padEnd(14)}`
    + ` derived=${(derived || '-').padEnd(14)}`
    + ` derivedWeak=${(derivedWeak || '-').padEnd(14)}`
    + ` phrase=${phraseLabel}`,
  );
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
