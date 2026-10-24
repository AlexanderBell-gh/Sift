#!/usr/bin/env node
// Offline checks for the category core. Does not measure the model: accuracy
// is watched through the `source` on real adds, not here.
//
//   node workers/lib/category.eval.mjs            # report
//   node workers/lib/category.eval.mjs --gate     # report + exit on failure
//   node workers/lib/category.eval.mjs --gate --quiet

import {
  CANONICAL_CATEGORIES, normaliseTitle, parseCategory, buildPrompt,
} from './category.js';

const checks = [];
function check(name, ok) {
  checks.push({ name, ok });
}

check('eight unique labels', CANONICAL_CATEGORIES.length === 8
  && new Set(CANONICAL_CATEGORIES).size === 8);
check('Drinks replaces Beverages', CANONICAL_CATEGORIES.includes('Drinks')
  && !CANONICAL_CATEGORIES.includes('Beverages'));
check('parser round-trips every label', CANONICAL_CATEGORIES.every(
  (category) => parseCategory(category) === category,
));
check('parser rejects non-labels', ['Beverages', 'The answer is Chilled', '', null]
  .every((value) => parseCategory(value) === null));
check('sizes share one id', normaliseTitle('Coca Cola Zero 330ml')
  === normaliseTitle('Coca Cola Zero 2L'));
check('normaliseTitle is stable', ['Oat Milk 1L', '  ', 'Walkers 6 x 25g']
  .every((title) => normaliseTitle(normaliseTitle(title)) === normaliseTitle(title)));

const biggestPrompt = buildPrompt({
  title: 'x'.repeat(500),
  brand: 'b'.repeat(500),
  breadcrumb_leaf: 'l'.repeat(500),
  breadcrumb_raw: Array(20).fill('c'.repeat(500)),
  storage_text: 's'.repeat(500),
});
const labelledPrompt = buildPrompt({ title: 'Oat Milk', breadcrumb_leaf: 'Milk' });
check('prompt ceiling holds', biggestPrompt.length <= 3000);
check('prompt carries title, shelf and temperature rule', ['Oat Milk', 'Milk', 'Temperature beats type']
  .every((wanted) => labelledPrompt.includes(wanted)));

const failed = checks.filter((entry) => !entry.ok);
if (process.argv.includes('--quiet')) {
  console.log(`category core ${failed.length ? 'FAILED' : 'ok'}  (${checks.length - failed.length}/${checks.length})`);
} else {
  for (const entry of checks) console.log(`${entry.ok ? 'ok  ' : 'FAIL'} ${entry.name}`);
}

if (process.argv.includes('--gate') && failed.length) {
  console.error('\nEVAL GATE FAILED');
  for (const entry of failed) console.error(`  ${entry.name}`);
  process.exit(1);
}
