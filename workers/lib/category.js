// Single source of truth for watchlist category assignment.
// Owns taxonomy server-side so all clients (extension, phone app) benefit
// once deployed. Phone app sends title/brand/store only: no breadcrumbs,
// no storage text, no URL, no JSON-LD. Title-first path must clear the
// floor on product name alone.
// Plain JS (worker runtime + node --test compatible). No dependencies.
//
// Signal contract:
//   { title, brand?, store?, store_id?, breadcrumb_raw?, breadcrumb_leaf?,
//     storage_text? }
//
// Eight rules, first hit wins:
//   1. manual     - product_catalog override from the CLI
//   2. non-food   - household / personal-care markers force Other
//   3. frozen     - frozen in title, leaf, department or storage text
//   4. ambient    - tinned / canned / jarred is Food Cupboard
//   5. leaf       - curated store-agnostic leaf map
//   6. department - deepest known shelf crumb decides
//   7. title      - corpus phrase table, then keyword tier; ties fall back
//                   to the fixed priority
//   8. other      - nothing matched, Other with low_confidence
//
// The lexicon is split in two:
//   category.lexicon.js   curated (hand written)
//   category.phrases.js   generated from src/data/uk-*.json
// Both are imported here; nothing is learned at runtime.

import { PHRASES, DERIVED_KEYWORDS, DERIVED_WEAK } from './category.phrases.js';
import {
  CANONICAL_CATEGORIES, NON_FOOD, AMBIENT, AMBIENT_EXEMPT, DEPARTMENTS,
  DEPARTMENT_IGNORE, LEAF_MAP, KEYWORD_OVERRIDES, WEAK_KEYWORDS, PRIORITY,
  normalise,
} from './category.lexicon.js';

export { CANONICAL_CATEGORIES, normalise };

// v3-v6 already shipped. Do not restart at 1. v7 fixes title-only misses from
// the v6 probe: ready-meal dish names, Bakewell as a flavour, and multi-word
// weak phrases ('sweet potato').
export const TAXONOMY_VERSION = 7;

const DEFAULT_LEXICON = {
  phrases: PHRASES,
  derived: DERIVED_KEYWORDS,
  derivedWeak: DERIVED_WEAK,
  weak: WEAK_KEYWORDS,
  nonFood: NON_FOOD,
  ambient: AMBIENT,
  ambientExempt: AMBIENT_EXEMPT,
  departments: DEPARTMENTS,
  departmentIgnore: DEPARTMENT_IGNORE,
  leafMap: LEAF_MAP,
  keywordOverrides: KEYWORD_OVERRIDES,
  priority: PRIORITY,
};

export function tokenise(text) {
  const norm = normalise(text);
  return norm ? norm.split(' ') : [];
}

// Plural-insensitive single-token equality: pie/pies, waffle/waffles,
// cherry/cherries, leaf/leaves. Avoids naive stemming ('waffles' is not
// 'waffl').
export function sameWord(token, keyword) {
  if (token === keyword) return true;
  if (token === `${keyword}s` || keyword === `${token}s`) return true;
  if (token === `${keyword}es` || keyword === `${token}es`) return true;
  if (keyword.endsWith('y') && token === `${keyword.slice(0, -1)}ies`) return true;
  if (token.endsWith('y') && keyword === `${token.slice(0, -1)}ies`) return true;
  if (keyword.endsWith('fe') && token === `${keyword.slice(0, -2)}ves`) return true;
  if (keyword.endsWith('f') && token === `${keyword.slice(0, -1)}ves`) return true;
  return false;
}

function singularise(word) {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('es') && word.length > 3) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) return word.slice(0, -1);
  return word;
}

function pluralise(word) {
  if (word.endsWith('y') && !/[aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
  if (word.endsWith('s')) return word;
  return `${word}s`;
}

// Crumbs arrive as 'Back to Food & Drink' style strings on some stores.
// Sainsbury's also repeats the text ('GranolaGranola'), which would defeat
// every leaf lookup, so collapse an exact doubled crumb to one copy.
function cleanCrumb(text) {
  const cleaned = String(text || '').replace(/^back to\s+/i, '').trim();
  const half = cleaned.slice(0, cleaned.length / 2);
  return half && half === cleaned.slice(cleaned.length / 2) ? half : cleaned;
}

// One matcher per lexicon object. Cached so a hot path does not rebuild the
// phrase index on every call.
const matcherCache = new WeakMap();

function buildMatcher(lexicon) {
  const phraseIndex = new Map();
  for (const [name, category] of Object.entries(lexicon.phrases)) {
    const tokens = name.split(' ').filter(Boolean);
    if (!tokens.length) continue;
    const head = tokens[0];
    if (!phraseIndex.has(head)) phraseIndex.set(head, []);
    phraseIndex.get(head).push({ tokens, category });
  }
  for (const list of phraseIndex.values()) {
    list.sort((a, b) => b.tokens.length - a.tokens.length);
  }

  // Keyword tier. Three levels, strongest wins:
  //   hand   - curated, always strong
  //   unique - a token the corpus only uses for one shelf, strong
  //   shared - a token the corpus uses for several shelves, weak: it only
  //            decides when nothing stronger voted ('apple' must not pull
  //            'apple & cinnamon granola' onto the fruit shelf)
  const keywords = new Map();
  for (const [category, tokens] of Object.entries(lexicon.derived || {})) {
    for (const token of tokens) {
      if (!keywords.has(token)) keywords.set(token, { category, weak: false });
    }
  }
  for (const [category, tokens] of Object.entries(lexicon.derivedWeak || {})) {
    for (const token of tokens) {
      if (!keywords.has(token)) keywords.set(token, { category, weak: true });
    }
  }
  // Curated weak words win over a derived strong hit: the derivation only sees
  // shelf consistency ("rosemary" is only ever filed under produce), not that
  // the word is a flavour. Demoting it is a hand judgement.
  for (const [token, category] of Object.entries(lexicon.weak || {})) {
    keywords.set(token, { category, weak: true });
  }
  for (const [token, category] of Object.entries(lexicon.keywordOverrides || {})) {
    keywords.set(token, { category, weak: false });
  }

  // Index by first letter so a plural fold is a short scan, not a sweep.
  const keywordHeads = new Map();
  for (const [token, entry] of keywords) {
    const head = token[0];
    if (!keywordHeads.has(head)) keywordHeads.set(head, []);
    keywordHeads.get(head).push([token, entry]);
  }

  // One-word product names that are flavour words. A bare match on one of
  // these is an ingredient, not a product.
  const weakPhrases = new Set();
  for (const token of Object.keys(lexicon.weak || {})) weakPhrases.add(token);
  for (const [category, tokens] of Object.entries(lexicon.derivedWeak || {})) {
    for (const token of tokens) weakPhrases.add(token);
  }

  const leafMap = new Map();
  for (const [leaf, category] of Object.entries(lexicon.leafMap)) {
    leafMap.set(normalise(leaf), category);
  }

  const departments = new Map();
  for (const [name, category] of Object.entries(lexicon.departments)) {
    departments.set(normalise(name), category);
  }
  const departmentIgnore = new Set(
    Array.from(lexicon.departmentIgnore || []).map((name) => normalise(name)),
  );

  return {
    phraseIndex,
    keywords,
    keywordHeads,
    weakPhrases,
    leafMap,
    departments,
    departmentIgnore,
    nonFood: buildMarkerIndex(lexicon.nonFood || []),
    ambient: new Set(lexicon.ambient || []),
    ambientExempt: new Set(lexicon.ambientExempt || []),
    priority: lexicon.priority || PRIORITY,
  };
}

// Keyword lookup with a plural fold: 'oranges' finds 'orange', 'chips'
// finds 'chip'. A short scan over the tokens that share a first letter.
function lookupKeyword(token, matcher) {
  const exact = matcher.keywords.get(token);
  if (exact) return exact;
  const candidates = matcher.keywordHeads.get(token[0]);
  if (!candidates) return null;
  for (const [word, entry] of candidates) {
    if (sameWord(token, word)) return entry;
  }
  return null;
}

// Marker phrases ('kitchen roll', 'bin bags') are indexed by their first
// word so a title only has to be walked once.
function buildMarkerIndex(entries) {
  const index = new Map();
  for (const entry of entries) {
    const tokens = normalise(entry).split(' ').filter(Boolean);
    if (!tokens.length) continue;
    const head = tokens[0];
    if (!index.has(head)) index.set(head, []);
    index.get(head).push(tokens);
  }
  return index;
}

function getMatcher(lexicon) {
  let matcher = matcherCache.get(lexicon);
  if (!matcher) {
    matcher = buildMatcher(lexicon);
    matcherCache.set(lexicon, matcher);
  }
  return matcher;
}

// Deepest crumb that names a department. Breadcrumbs run root-first, so the
// specific shelf is the last crumb; scanning backwards stops a root 'Food &
// Drink' from shadowing a leaf 'Cereals'. Crumbs that name a department but
// carry no shelf signal ('Fresh Food', 'Groceries') are skipped and the scan
// continues.
export function deriveDepartment(crumbs, matcher) {
  for (let i = crumbs.length - 1; i >= 0; i--) {
    const norm = normalise(cleanCrumb(crumbs[i]));
    if (!norm) continue;
    if (matcher.departmentIgnore.has(norm)) continue;
    if (matcher.departments.has(norm)) return matcher.departments.get(norm);
  }
  return null;
}

// A marker phrase is present when a contiguous run of title words matches
// it, with a plural fold on the last word.
function hasMarker(tokens, index) {
  for (let i = 0; i < tokens.length; i++) {
    for (const head of [tokens[i], singularise(tokens[i])]) {
      const candidates = index.get(head);
      if (!candidates) continue;
      for (const marker of candidates) {
        let hit = true;
        for (let j = 0; j < marker.length; j++) {
          if (i + j >= tokens.length || !sameWord(tokens[i + j], marker[j])) { hit = false; break; }
        }
        if (hit) return true;
      }
    }
  }
  return false;
}

// Longest known product name contained in the title wins. Longer beats
// shorter ('frozen chicken nuggets' over 'chicken nuggets'), so a specific
// product always outranks the family it belongs to.
//
// A one-word name that is a flavour word ('lemon', 'cinnamon') is a weak
// match: it names an ingredient, not a product. 'Tesco Lemon Juice' is a
// drink, not a lemon.
function matchPhrase(tokens, phraseIndex, weakPhrases) {
  let best = null;
  for (let i = 0; i < tokens.length; i++) {
    const candidates = phraseIndex.get(tokens[i]);
    if (!candidates) continue;
    for (const candidate of candidates) {
      const len = candidate.tokens.length;
      if (i + len > tokens.length) continue;
      let hit = true;
      for (let j = 0; j < len; j++) {
        if (!sameWord(tokens[i + j], candidate.tokens[j])) { hit = false; break; }
      }
      if (!hit) continue;
      if (!best || len > best.len) {
        // A one-word flavour name is weak; so is any multi-word name listed in
        // WEAK_KEYWORDS ('sweet potato' on a ready-meal title).
        const name = candidate.tokens.join(' ');
        best = {
          len,
          category: candidate.category,
          start: i,
          weak: weakPhrases.has(name) || (len === 1 && weakPhrases.has(candidate.tokens[0])),
        };
      }
    }
  }
  return best;
}

// Leaf lookup: exact, then plural fold, then the first two words of the leaf.
function matchLeaf(leaf, leafMap) {
  const norm = normalise(leaf);
  if (!norm) return null;
  const words = norm.split(' ');
  const candidates = [norm, singularise(norm), pluralise(norm)];
  if (words.length > 2) {
    const head = words.slice(0, 2).join(' ');
    candidates.push(head, singularise(head), pluralise(head));
  }
  for (const candidate of candidates) {
    if (leafMap.has(candidate)) return leafMap.get(candidate);
  }
  return null;
}

function result(category, reason, lowConfidence, extra = {}) {
  return {
    category,
    taxonomy_version: TAXONOMY_VERSION,
    low_confidence: !!lowConfidence,
    reason,
    ...extra,
  };
}

// Score one product. `opts.override` is a canonical category from the
// manual CLI path and wins before every rule. `opts.lexicon` swaps the
// lexicon (the eval uses it to score a held-out corpus).
export function scoreCategory(signals = {}, opts = {}) {
  const lexicon = opts.lexicon || DEFAULT_LEXICON;
  const matcher = getMatcher(lexicon);

  const override = opts.override ? String(opts.override) : '';
  if (override && CANONICAL_CATEGORIES.includes(override)) {
    return result(override, 'manual', false, { votes: [override] });
  }

  const title = String(signals.title || '');
  const rawCrumbs = Array.isArray(signals.breadcrumb_raw) ? signals.breadcrumb_raw : [];
  const leaf = cleanCrumb(
    signals.breadcrumb_leaf || (rawCrumbs.length ? rawCrumbs[rawCrumbs.length - 1] : ''),
  );
  const titleTokens = tokenise(title);
  const leafTokens = tokenise(leaf);

  // 2. Non-food. Household and personal-care goods are not groceries.
  if (hasMarker(titleTokens, matcher.nonFood) || hasMarker(leafTokens, matcher.nonFood)) {
    return result('Other', 'non-food', false, { votes: ['Other'] });
  }

  const department = deriveDepartment(rawCrumbs, matcher);

  // 3. Frozen. Defrost and freezable-at-home copy never forces Frozen.
  const storage = String(signals.storage_text || '').toLowerCase();
  if (
    titleTokens.includes('frozen') ||
    leafTokens.includes('frozen') ||
    department === 'Frozen' ||
    storage.includes('keep frozen') ||
    storage.includes('store frozen') ||
    storage.includes('-18')
  ) {
    return result('Frozen', 'frozen', false, { votes: ['Frozen'] });
  }

  // 4. Ambient. A tin or a jar is a cupboard good whatever else it says,
  // except when the marker describes a bread ('white tinned sourdough').
  const ambient = titleTokens.some((token) => matcher.ambient.has(token));
  const bakeryTitle = titleTokens.some((token) => matcher.ambientExempt.has(token));
  if (ambient && !bakeryTitle) {
    return result('Food Cupboard', 'ambient', false, { votes: ['Food Cupboard'] });
  }

  // 5. Leaf map.
  const leafCategory = matchLeaf(leaf, matcher.leafMap);
  if (leafCategory) {
    return result(leafCategory, 'leaf', false, { votes: [leafCategory] });
  }

  // 6. Department. The crumb is explicit shelf metadata, but the leaf is more
  // specific, so the department rule sits behind the leaf map. Non-food,
  // frozen and ambient have already won above.
  if (department) {
    return result(department, 'department', false, { votes: [department] });
  }

  // 7. Title vote. The phrase match masks its own tokens so a phrase never
  // fights its own words ('peanut butter' does not also vote 'butter').
  // Strong votes decide; weak votes (flavour words) only decide when no
  // strong vote landed.
  const strong = new Set();
  const weak = new Set();
  const masked = new Set();
  const phrase = matchPhrase(titleTokens, matcher.phraseIndex, matcher.weakPhrases);
  if (phrase) {
    (phrase.weak ? weak : strong).add(phrase.category);
    for (let i = phrase.start; i < phrase.start + phrase.len; i++) masked.add(i);
  }
  for (let i = 0; i < titleTokens.length; i++) {
    if (masked.has(i)) continue;
    const entry = lookupKeyword(titleTokens[i], matcher);
    if (!entry) continue;
    (entry.weak ? weak : strong).add(entry.category);
  }

  const votes = strong.size ? strong : weak;
  if (!votes.size) {
    return result('Other', 'below-floor', true, { votes: [] });
  }
  if (votes.size === 1) {
    const only = [...votes][0];
    return result(only, 'title', false, { votes: [only] });
  }

  // A tie between title votes goes to the fixed priority. The department
  // never breaks a title tie any more: it decided before the title vote ran,
  // so a tie here is a title-only signal.
  const winner = matcher.priority.find((category) => votes.has(category)) || 'Other';
  return result(winner, 'title', false, { votes: [...votes] });
}

export { DEFAULT_LEXICON };
