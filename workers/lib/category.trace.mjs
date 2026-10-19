#!/usr/bin/env node
// Trace one title through the scorer. Debug aid for the keyword tier.
//
//   node workers/lib/category.trace.mjs "Bay Leaves"

import { scoreCategory, DEFAULT_LEXICON, normalise } from './category.js';
import { PHRASES, HOLDOUT } from './category.phrases.js';

const title = process.argv[2] || '';
const holdout = new Set(HOLDOUT);
const phrases = {};
for (const [name, category] of Object.entries(PHRASES)) {
  if (!holdout.has(name)) phrases[name] = category;
}
const lexicon = { ...DEFAULT_LEXICON, phrases };

const tokens = normalise(title).split(' ').filter(Boolean);
console.log(`title: ${JSON.stringify(title)}`);
console.log(`tokens: ${tokens.join(' | ')}`);
for (const token of tokens) {
  const key = token;
  const hand = Object.entries(DEFAULT_LEXICON.keywordOverrides).find(([k]) => k === key);
  const derived = Object.entries(DEFAULT_LEXICON.derived).find(([, list]) => list.includes(key));
  const phrase = PHRASES[key] ? PHRASES[key] : (holdout.has(key) ? 'HELD OUT' : '-');
  console.log(
    `  ${token.padEnd(14)} hand=${hand ? hand[1] : '-'.padEnd(14)} derived=${derived ? derived[0] : '-'.padEnd(14)} phrase=${phrase}`,
  );
}
const scored = scoreCategory({ title }, { lexicon });
console.log(`result: ${scored.category} (${scored.reason}) votes=${JSON.stringify(scored.votes)}`);
