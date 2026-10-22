// Harvest counter for the category vocabulary. Proposals only: nothing here
// scores a product and nothing here edits the lexicon. The worker labels
// product_catalog at add time (leaf, department, category_reason); this reads
// those rows and prints copy-pasteable lexicon lines a human reviews, pastes
// and eval-gates. Nothing is learned while scoring.
//
// Plain JS, no deps, node --test compatible.

import { leafAnswer, tokenise } from './category.js';
import { LEAF_MAP, VOCABULARY } from './category.lexicon.js';

// A token must appear under two product names before it is worth a shelf.
const MIN_TOKEN_NAMES = 2;
// One- and two-letter fragments are noise ('hp', 'xl'), never vocabulary.
const MIN_TOKEN_LENGTH = 3;

function isCurated(token) {
  return Object.hasOwn(VOCABULARY, token) || Object.hasOwn(LEAF_MAP, token);
}

// rows: product_catalog rows with at least { name, leaf, department,
// category_reason }. Returns { leaves, tokens } sorted strongest first.
export function propose(rows = []) {
  const leaves = new Map(); // leaf -> Map(department -> count)
  const tokens = new Map(); // token -> Map(department -> Set(name))

  for (const row of rows) {
    const department = String(row.department || '').trim();
    if (!department) continue;
    // A manual override is a human answer, not a scorer label.
    if (row.category_reason === 'manual') continue;

    const leaf = String(row.leaf || '').trim().toLowerCase();
    if (leaf) {
      const current = leafAnswer(leaf);
      // Poison guard: a leaf the map already files elsewhere is ambiguous
      // ('pizza & garlic bread' sits in both the frozen and chilled aisles).
      if (!current || current === department) {
        if (!leaves.has(leaf)) leaves.set(leaf, new Map());
        const counts = leaves.get(leaf);
        counts.set(department, (counts.get(department) || 0) + 1);
      }
    }

    const name = String(row.name || '');
    if (!name) continue;
    for (const token of tokenise(name)) {
      if (token.length < MIN_TOKEN_LENGTH || isCurated(token)) continue;
      if (!tokens.has(token)) tokens.set(token, new Map());
      const departments = tokens.get(token);
      if (!departments.has(department)) departments.set(department, new Set());
      departments.get(department).add(name);
    }
  }

  return {
    leaves: [...leaves]
      .filter(([, counts]) => counts.size === 1)
      .map(([leaf, counts]) => {
        const [[department, count]] = counts;
        return { leaf, category: department, count };
      })
      .sort((a, b) => b.count - a.count || a.leaf.localeCompare(b.leaf)),
    tokens: [...tokens]
      // One shelf only: a token seen under two departments is ambiguous.
      .filter(([, departments]) => departments.size === 1)
      .map(([token, departments]) => {
        const [[category, names]] = departments;
        return { token, category, count: names.size };
      })
      .filter((entry) => entry.count >= MIN_TOKEN_NAMES)
      .sort((a, b) => b.count - a.count || a.token.localeCompare(b.token)),
  };
}

// Copy-pasteable lexicon lines. Comments carry the evidence, not the code.
export function formatProposals({ leaves = [], tokens = [] } = {}) {
  const lines = [];
  lines.push(`// leaf candidates (${leaves.length}) -> LEAF_MAP`);
  for (const entry of leaves) {
    lines.push(`  '${entry.leaf}': '${entry.category}', // seen ${entry.count}`);
  }
  lines.push('');
  lines.push(`// token candidates (${tokens.length}) -> VOCABULARY (strong or weak)`);
  for (const entry of tokens) {
    lines.push(`  '${entry.token}': '${entry.category}', // ${entry.count} names`);
  }
  return lines.join('\n');
}
