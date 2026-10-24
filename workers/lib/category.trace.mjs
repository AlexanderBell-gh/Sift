#!/usr/bin/env node
// Show which stage answers for one title, offline.
//
//   node workers/lib/category.trace.mjs "Oat Milk" --leaf "Milk"
//
// Memory and AI need the worker; offline this prints the id, the exact prompt
// and the fallback the add would take without a model.

import { classifyCategory, normaliseTitle, buildPrompt } from './category.js';

const argv = process.argv.slice(2);
let title = '';
let leaf = '';
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--leaf') leaf = argv[++i] || '';
  else if (!title) title = argv[i];
}

const signals = { title };
if (leaf) signals.breadcrumb_leaf = leaf;
console.log(`title: ${JSON.stringify(title)}`);
console.log(`id:    ${JSON.stringify(normaliseTitle(title))}`);
console.log(buildPrompt(signals));

const scored = await classifyCategory(signals);
console.log(`no-AI: ${scored.category} (${scored.reason}, low_confidence=${scored.low_confidence})`);
