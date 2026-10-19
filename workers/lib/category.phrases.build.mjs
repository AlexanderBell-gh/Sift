#!/usr/bin/env node
// Build workers/lib/category.phrases.js from the offline corpus.
//
//   node workers/lib/category.phrases.build.mjs
//
// The corpus (src/data/uk-*.json) is a name-only product list with
// department-level labels. The scorer cannot read it at runtime (the worker
// bundle cannot reach ../src), so this script distils it into two artefacts:
//
//   PHRASES          normalised name -> canonical category
//   DERIVED_KEYWORDS per-category token tier, for titles with no phrase hit
//
// Both are deterministic: same corpus + same curated lexicon => same output.
// The generated file is committed, so a stale file is a visible diff.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  CORPUS_FILES, DUP_BASE, PHRASE_OVERRIDES, PHRASE_ADDITIONS, STOP_TOKENS,
  KEYWORD_OVERRIDES, HOLDOUT_MODULUS, normalise,
} from './category.lexicon.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CORPUS_DIR = join(REPO, 'src', 'data');
const OUT = join(HERE, 'category.phrases.js');

function tokens(name) {
  return normalise(name).split(' ').filter(Boolean);
}

// FNV-1a: stable across runs and platforms.
export function hashName(name) {
  let h = 0x811c9dc5;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function loadCorpus() {
  const names = new Map(); // normalised name -> { label, raw }
  for (const [file, category] of Object.entries(CORPUS_FILES)) {
    const rows = JSON.parse(readFileSync(join(CORPUS_DIR, file), 'utf8'));
    for (const row of rows) {
      const key = normalise(row.name);
      if (!key) continue;
      const existing = names.get(key);
      if (existing) {
        // Two files hold the same name. The curated DUP_BASE table picks the
        // base shelf; longer variants still win at match time.
        if (DUP_BASE[key]) existing.label = DUP_BASE[key];
        continue;
      }
      names.set(key, { label: category, raw: row.name, file });
    }
  }
  for (const [rawKey, category] of Object.entries(PHRASE_OVERRIDES)) {
    const key = normalise(rawKey);
    const entry = names.get(key);
    if (entry) entry.label = category;
    else names.set(key, { label: category, raw: rawKey, file: 'override' });
  }
  for (const [rawKey, category] of Object.entries(PHRASE_ADDITIONS)) {
    const key = normalise(rawKey);
    const entry = names.get(key);
    if (entry) entry.label = category;
    else names.set(key, { label: category, raw: rawKey, file: 'addition' });
  }
  return names;
}

// A token is a keyword for a category when the corpus is consistent about
// it. Two tiers come out of that:
//
//   strong - the token names exactly one shelf. It votes on its own.
//   weak   - the token shows up under two or more shelves, so it only
//            names a shelf when the title says nothing else. 'apple' is
//            produce, but 'apple & cinnamon granola' is a cereal.
//
// A weak token is assigned to the shelf that uses it most, and only when
// one shelf leads by at least two names. 'bay' is produce once and a spice
// once: no clear winner, so it stays out entirely and the scorer answers
// Other rather than guessing.
export function deriveKeywords(names) {
  const counts = new Map(); // token -> Map(category -> count)
  for (const entry of names.values()) {
    const seen = new Set();
    for (const token of tokens(entry.raw)) {
      if (seen.has(token)) continue;
      seen.add(token);
      if (STOP_TOKENS.has(token)) continue;
      if (!counts.has(token)) counts.set(token, new Map());
      const perCategory = counts.get(token);
      perCategory.set(entry.label, (perCategory.get(entry.label) || 0) + 1);
    }
  }
  const strong = {};
  const weak = {};
  for (const [token, perCategory] of counts) {
    if (KEYWORD_OVERRIDES[token]) continue; // hand tier owns this token
    const ranked = [...perCategory.entries()].sort((a, b) => b[1] - a[1]);
    const [category, top] = ranked[0];
    const second = ranked[1] ? ranked[1][1] : 0;
    if (ranked.length === 1) {
      (strong[category] ||= []).push(token);
    } else if (top >= 2 && top - second >= 2) {
      (weak[category] ||= []).push(token);
    }
  }
  for (const list of Object.values(strong)) list.sort();
  for (const list of Object.values(weak)) list.sort();
  return { strong, weak };
}

export function buildPhrases(names, { exclude = new Set() } = {}) {
  const phrases = {};
  for (const [key, entry] of names) {
    if (exclude.has(key)) continue;
    phrases[key] = entry.label;
  }
  return phrases;
}

export function holdoutNames(names) {
  const out = [];
  for (const key of names.keys()) {
    if (hashName(key) % HOLDOUT_MODULUS === 0) out.push(key);
  }
  return out.sort();
}

function serialise(phrases, derived, holdout) {
  const lines = [];
  lines.push('// GENERATED by workers/lib/category.phrases.build.mjs - do not edit by hand.');
  lines.push('// Source: src/data/uk-*.json (corpus) + workers/lib/category.lexicon.js (curated).');
  lines.push('// Rebuild: node workers/lib/category.phrases.build.mjs');
  lines.push('');
  lines.push('export const PHRASES = {');
  for (const key of Object.keys(phrases).sort()) {
    lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(phrases[key])},`);
  }
  lines.push('};');
  lines.push('');
  lines.push('// Tokens the corpus uses for exactly one shelf. They vote on their own.');
  lines.push('export const DERIVED_KEYWORDS = {');
  for (const category of Object.keys(derived.strong).sort()) {
    lines.push(`  ${JSON.stringify(category)}: ${JSON.stringify(derived.strong[category])},`);
  }
  lines.push('};');
  lines.push('');
  lines.push('// Tokens the corpus uses for several shelves. They only decide when');
  lines.push('// nothing stronger voted.');
  lines.push('export const DERIVED_WEAK = {');
  for (const category of Object.keys(derived.weak).sort()) {
    lines.push(`  ${JSON.stringify(category)}: ${JSON.stringify(derived.weak[category])},`);
  }
  lines.push('};');
  lines.push('');
  lines.push('// Corpus names held out of PHRASES for the generalisation suite.');
  lines.push('export const HOLDOUT = [');
  for (const key of holdout) lines.push(`  ${JSON.stringify(key)},`);
  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const names = loadCorpus();
  const phrases = buildPhrases(names);
  const derived = deriveKeywords(names);
  const holdout = holdoutNames(names);
  writeFileSync(OUT, serialise(phrases, derived, holdout));
  const perCategory = {};
  for (const label of Object.values(phrases)) perCategory[label] = (perCategory[label] || 0) + 1;
  console.log(`phrases: ${Object.keys(phrases).length}`);
  console.log(`holdout: ${holdout.length}`);
  for (const [category, count] of Object.entries(perCategory).sort()) {
    console.log(`  ${category}: ${count}`);
  }
  const strong = Object.values(derived.strong).reduce((n, l) => n + l.length, 0);
  const weak = Object.values(derived.weak).reduce((n, l) => n + l.length, 0);
  console.log(`keywords: ${strong} strong, ${weak} weak`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
