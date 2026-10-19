#!/usr/bin/env node
// Offline corpus evaluation for the category scorer.
//
//   node workers/lib/category.eval.mjs            # report
//   node workers/lib/category.eval.mjs --gate     # report + threshold gate
//
// Two suites:
//   fit      every corpus name, scored with the shipped lexicon. Catches a
//            corrupted lexicon or a broken matcher.
//   holdout  a deterministic slice of the corpus held out of the generated
//            phrase table, so it is scored by the keyword tier alone. This
//            is the number that means something: it measures the scorer on
//            products it has never seen.
//
// The corpus is the training set, so the fit suite is close to circular by
// construction. The curated cases in workers/lib/category.test.js are the
// independent check.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { scoreCategory, DEFAULT_LEXICON, CANONICAL_CATEGORIES } from './category.js';
import { PHRASES, HOLDOUT } from './category.phrases.js';
import { loadCorpus } from './category.phrases.build.mjs';
import { normalise } from './category.lexicon.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const THRESHOLDS_FILE = join(HERE, 'category.thresholds.json');

const MAX_MISSES_SHOWN = 40;

function buildHoldoutLexicon() {
  const held = new Set(HOLDOUT);
  const phrases = {};
  for (const [name, category] of Object.entries(PHRASES)) {
    if (!held.has(name)) phrases[name] = category;
  }
  return { ...DEFAULT_LEXICON, phrases };
}

function runSuite(label, entries, lexicon) {
  const perCategory = new Map();
  const confusion = new Map();
  const misses = [];
  let correct = 0;
  for (const { name, expected } of entries) {
    const scored = scoreCategory({ title: name }, { lexicon });
    const got = scored.category;
    perCategory.set(expected, perCategory.get(expected) || { total: 0, correct: 0 });
    const bucket = perCategory.get(expected);
    bucket.total++;
    if (got === expected) {
      bucket.correct++;
      correct++;
    } else {
      const key = `${expected} -> ${got}`;
      confusion.set(key, (confusion.get(key) || 0) + 1);
      misses.push({ name, expected, got, reason: scored.reason });
    }
  }
  return {
    label,
    total: entries.length,
    correct,
    accuracy: entries.length ? correct / entries.length : 0,
    perCategory,
    confusion,
    misses,
  };
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function report(suite) {
  console.log(`\n=== ${suite.label} ===`);
  console.log(`overall: ${percent(suite.accuracy)} (${suite.correct}/${suite.total})`);
  const perCategory = new Map();
  for (const [category, bucket] of suite.perCategory) {
    const acc = bucket.total ? bucket.correct / bucket.total : 0;
    perCategory.set(category, acc);
    console.log(
      `  ${category.padEnd(14)} ${percent(acc).padStart(7)}  (${bucket.correct}/${bucket.total})`,
    );
  }
  const confused = [...suite.confusion.entries()].sort((a, b) => b[1] - a[1]);
  if (confused.length) {
    console.log('  confusion:');
    for (const [key, count] of confused.slice(0, 20)) {
      console.log(`    ${key.padEnd(36)} ${count}`);
    }
  }
  if (suite.misses.length) {
    console.log(`  misses (${suite.misses.length}):`);
    for (const miss of suite.misses.slice(0, MAX_MISSES_SHOWN)) {
      console.log(`    ${miss.name.padEnd(42)} want ${miss.expected.padEnd(14)} got ${miss.got.padEnd(14)} (${miss.reason})`);
    }
    if (suite.misses.length > MAX_MISSES_SHOWN) {
      console.log(`    ... ${suite.misses.length - MAX_MISSES_SHOWN} more`);
    }
  }
  return perCategory;
}

function checkDrift() {
  const expected = loadCorpus();
  const built = {};
  for (const [name, entry] of expected) built[name] = entry.label;
  const expectedKeys = Object.keys(built).sort();
  const actualKeys = Object.keys(PHRASES).sort();
  const drift = [];
  for (const key of expectedKeys) {
    if (built[key] !== PHRASES[key]) drift.push(`${key}: ${PHRASES[key]} -> ${built[key]}`);
  }
  for (const key of actualKeys) {
    if (!(key in built)) drift.push(`${key}: extra in category.phrases.js`);
  }
  return drift;
}

function gate(suite, thresholds, label) {
  const spec = thresholds[label];
  if (!spec) return [];
  const failures = [];
  if (spec.overall != null && suite.accuracy < spec.overall) {
    failures.push(`${label} overall ${percent(suite.accuracy)} < ${percent(spec.overall)}`);
  }
  for (const [category, floor] of Object.entries(spec.perCategory || {})) {
    const bucket = suite.perCategory.get(category);
    if (!bucket) continue;
    const acc = bucket.total ? bucket.correct / bucket.total : 0;
    if (acc < floor) {
      failures.push(`${label} ${category} ${percent(acc)} < ${percent(floor)}`);
    }
  }
  return failures;
}

function main() {
  const drift = checkDrift();
  if (drift.length) {
    console.error('lexicon drift: workers/lib/category.phrases.js is out of date');
    for (const line of drift.slice(0, 20)) console.error(`  ${line}`);
    console.error('rebuild: node workers/lib/category.phrases.build.mjs');
    process.exit(1);
  }

  const corpus = loadCorpus();
  const entries = [...corpus.entries()]
    .map(([key, entry]) => ({ name: entry.raw, expected: entry.label }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const fit = runSuite('fit', entries, DEFAULT_LEXICON);
  const holdoutSet = new Set(HOLDOUT);
  const holdoutEntries = entries.filter((entry) => holdoutSet.has(normalise(entry.name)));
  const holdout = runSuite('holdout', holdoutEntries, buildHoldoutLexicon());

  report(fit);
  report(holdout);

  if (!process.argv.includes('--gate')) return;

  const thresholds = JSON.parse(readFileSync(THRESHOLDS_FILE, 'utf8'));
  const failures = [
    ...gate(fit, thresholds, 'fit'),
    ...gate(holdout, thresholds, 'holdout'),
  ];
  if (failures.length) {
    console.error('\nEVAL GATE FAILED');
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  console.log('\nEVAL GATE PASSED');
}

main();
