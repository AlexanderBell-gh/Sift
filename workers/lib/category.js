// Single source of truth for watchlist category assignment.
// Owns taxonomy server-side so all extension versions benefit once deployed.
// Plain JS (worker runtime + node --test compatible). No dependencies.
//
// Signal contract (from extension `result.category_signals`):
//   { breadcrumb_raw[], breadcrumb_leaf, title, brand, store | store_id,
//     url_path, jsonld_category }
// Legacy clients send only `result.category`; that path uses
// clampLegacyCategory() and stores taxonomy_version 0.

export const TAXONOMY_VERSION = 1;

export const CANONICAL_CATEGORIES = [
  'Chilled',
  'Snacks',
  'Beverages',
  'Produce',
  'Frozen',
  'Bakery',
  'Food Cupboard',
  'Other',
];

// Fixed tie-break priority. Never resolve ties by table order.
const PRIORITY = [
  'Frozen',
  'Produce',
  'Bakery',
  'Food Cupboard',
  'Snacks',
  'Beverages',
  'Chilled',
  'Other',
];

// Breadcrumb vocabulary: aisle taxonomy, high trust. Title guesses are scored
// against the same table but only when the breadcrumb is weak or absent, and
// flavour modifiers are stripped from titles first.
const AISLE_TERMS = {
  Chilled: [
    'chilled', 'dairy', 'milk', 'yogurt', 'yoghurt', 'yoghurts', 'cheese',
    'butter', 'cream', 'eggs', 'bacon', 'sausages', 'sausage', 'ham',
    'chicken', 'poultry', 'salmon', 'trout', 'salmon, tuna & trout',
  ],
  Snacks: [
    'snacks', 'crisps', 'chocolate', 'cookies', 'cookie', 'biscuits',
    'biscuit', 'nuts', 'popcorn', 'crackers', 'sweets', 'candy',
    'cereal bars', 'cereal bar',
  ],
  Beverages: [
    'beverages', 'drinks', 'juice', 'cola', 'coffee', 'tea', 'water',
    'squash', 'beer', 'wine', 'soda', 'smoothie',
  ],
  Produce: [
    'produce', 'fresh produce', 'fruit', 'vegetables', 'vegetable', 'salad',
    'apple', 'apples', 'banana', 'bananas', 'pepper', 'peppers', 'carrot',
    'carrots', 'kiwi', 'potato', 'potatoes', 'onion', 'onions', 'tomato',
    'tomatoes', 'broccoli', 'cucumber', 'lettuce', 'orange', 'oranges',
    'grapes',
  ],
  Frozen: [
    'frozen', 'peas', 'sweetcorn', 'ice cream',
  ],
  Bakery: [
    'bakery', 'bread', 'baguette', 'croissant', 'rolls', 'roll', 'buns',
    'bun', 'cake', 'cakes', 'loaf', 'loaves', 'pastries', 'pastry',
  ],
  'Food Cupboard': [
    'food cupboard', 'cereals', 'cereal', 'flapjack', 'flapjacks', 'oat',
    'oats', 'oat boosts', 'granola', 'muesli', 'porridge', 'pasta', 'rice',
    'flour', 'sugar', 'soup', 'stock', 'sauce', 'sauces', 'ketchup',
    'beans', 'lentils', 'couscous', 'noodles', 'tins', 'canned',
  ],
  Other: [],
};

// Flavour/ingredient words stripped from titles before scoring. A blueberry
// flapjack is not chilled produce; modifiers alone must never decide.
const TITLE_MODIFIERS = new Set([
  'berry', 'berries', 'blueberry', 'blueberries', 'strawberry',
  'strawberries', 'raspberry', 'raspberries', 'blackberry', 'blackberries',
  'lemon', 'lime', 'toffee', 'vanilla', 'caramel',
]);

// Personal-care and household markers force Other before scoring.
const NON_FOOD_SIGNALS = [
  'wash', 'soap', 'antibacterial', 'shampoo', 'conditioner', 'detergent',
  'bleach', 'cleaner', 'lotion', 'toothpaste', 'deodorant', 'nappies',
  'washing powder',
];

// Dry-goods markers veto Chilled and Produce (flavoured flapjacks, oat bars).
const DRY_GOODS_MARKERS = [
  'flapjack', 'flapjacks', 'oat boosts', 'granola', 'muesli', 'porridge',
  'cereal bar', 'cereal bars',
];

// Dairy context exempts a row from the dry-goods veto (locked: Oat Milk is
// Chilled, not Food Cupboard).
const DAIRY_SIGNALS = [
  'milk', 'yogurt', 'yoghurt', 'cheese', 'butter', 'cream', 'dairy',
];

// Small per-store aisle alias table. Leaf exact match adds leaf-weight
// points to the mapped category. Extension point for observed crumbs.
const STORE_AISLE_ALIASES = [
  { store: 'tesco', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'sainsburys', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'asda', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'morrisons', leaf: 'flapjacks', category: 'Food Cupboard' },
];

// Brand defaults. Empty by design: the locked Graze flapjack cases land in
// Food Cupboard via aisle terms, and per-brand tuning is deferred until the
// unknown-bucket log shows real misses. Shape: { brand, category, unlessBreadcrumb }.
const BRAND_DEFAULTS = [];

// Scoring: exact multi-word phrase 3, exact single token 1,
// substring (keyword 5+ chars) 0.5. Totals below FLOOR resolve to Other.
const PHRASE_POINTS = 3;
const TOKEN_POINTS = 1;
const SUBSTRING_POINTS = 0.5;
const FLOOR = 1.5;
const LEAF_WEIGHT = 1;
const CONTEXT_WEIGHT = 0.5;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function cleanCrumb(text) {
  return String(text || '').replace(/^back to\s+/i, '').trim();
}

function blankScores() {
  const scores = {};
  for (const c of CANONICAL_CATEGORIES) scores[c] = 0;
  return scores;
}

// Score one text against AISLE_TERMS at the given weight. Phrases match on
// the full token stream; single tokens match exactly, else substring.
function scoreText(text, weight, stripModifiers) {
  const scores = blankScores();
  let tokens = tokenize(text);
  if (stripModifiers) tokens = tokens.filter((t) => !TITLE_MODIFIERS.has(t));
  if (tokens.length === 0 || weight === 0) return scores;
  const joined = tokens.join(' ');

  for (const [category, terms] of Object.entries(AISLE_TERMS)) {
    for (const term of terms) {
      const termTokens = tokenize(term);
      if (termTokens.length > 1) {
        if (joined.includes(termTokens.join(' '))) scores[category] += PHRASE_POINTS * weight;
      } else if (termTokens.length === 1) {
        const kw = termTokens[0];
        if (tokens.includes(kw)) {
          scores[category] += TOKEN_POINTS * weight;
        } else if (kw.length >= 5 && tokens.some((t) => t.includes(kw) || kw.includes(t))) {
          scores[category] += SUBSTRING_POINTS * weight;
        }
      }
    }
  }
  return scores;
}

function addScores(into, extra) {
  for (const c of CANONICAL_CATEGORIES) into[c] += extra[c] || 0;
  return into;
}

function bestCategory(scores, vetoed) {
  let winner = 'Other';
  let best = -Infinity;
  for (const c of PRIORITY) {
    const s = vetoed.has(c) ? -Infinity : scores[c] || 0;
    if (s > best) {
      best = s;
      winner = c;
    }
  }
  return { winner, best };
}

function hasMarker(combinedTokens, combinedJoined, markers) {
  return markers.some((m) => {
    const mt = tokenize(m);
    if (mt.length > 1) return combinedJoined.includes(mt.join(' '));
    return combinedTokens.includes(mt[0]);
  });
}

export function clampLegacyCategory(value) {
  const v = String(value || '').trim().toLowerCase();
  const hit = CANONICAL_CATEGORIES.find((c) => c.toLowerCase() === v);
  return hit || 'Other';
}

export function scoreCategory(signals = {}) {
  const rawCrumbs = Array.isArray(signals.breadcrumb_raw) ? signals.breadcrumb_raw : [];
  const leaf = cleanCrumb(signals.breadcrumb_leaf || rawCrumbs[rawCrumbs.length - 1] || '');
  const pathText = rawCrumbs.map(cleanCrumb).join(' ');
  const title = String(signals.title || '');
  const jsonld = String(signals.jsonld_category || '');
  const urlWords = String(signals.url_path || '').replace(/[/_.\-]+/g, ' ');
  const store = String(signals.store_id || signals.store || '').toLowerCase();

  const combinedJoined = [title, leaf, pathText, jsonld, urlWords].join(' ').toLowerCase();
  const combinedTokens = tokenize(combinedJoined);

  // Veto layer before scoring.
  if (combinedTokens.includes('frozen')) {
    return { category: 'Frozen', taxonomy_version: TAXONOMY_VERSION, scores: null, low_confidence: false, reason: 'frozen-veto' };
  }
  if (hasMarker(combinedTokens, combinedJoined, NON_FOOD_SIGNALS)) {
    return { category: 'Other', taxonomy_version: TAXONOMY_VERSION, scores: null, low_confidence: false, reason: 'non-food' };
  }

  const vetoed = new Set();
  const hasDairy = hasMarker(combinedTokens, combinedJoined, DAIRY_SIGNALS);
  if (!hasDairy && hasMarker(combinedTokens, combinedJoined, DRY_GOODS_MARKERS)) {
    vetoed.add('Chilled');
    vetoed.add('Produce');
  }

  // Breadcrumb first: leaf full weight, path plus JSON-LD plus URL half weight.
  const crumbScores = blankScores();
  addScores(crumbScores, scoreText(leaf, LEAF_WEIGHT, false));
  addScores(crumbScores, scoreText(`${pathText} ${jsonld} ${urlWords}`, CONTEXT_WEIGHT, false));

  // Small alias table: exact leaf match adds leaf-weight points.
  const leafNorm = leaf.toLowerCase();
  for (const alias of STORE_AISLE_ALIASES) {
    if (alias.leaf === leafNorm && (!alias.store || store.includes(alias.store))) {
      crumbScores[alias.category] += TOKEN_POINTS * LEAF_WEIGHT;
    }
  }

  const crumbBest = bestCategory(crumbScores, vetoed);
  if (crumbBest.best >= FLOOR) {
    // Confident breadcrumb: title may agree but must not demote it.
    return {
      category: crumbBest.winner,
      taxonomy_version: TAXONOMY_VERSION,
      scores: crumbScores,
      low_confidence: false,
      reason: 'breadcrumb',
    };
  }

  // Weak or absent breadcrumb: title decides at full weight.
  const totals = { ...crumbScores };
  addScores(totals, scoreText(title, 1, true));

  // Brand defaults apply only when the breadcrumb is weak (never override it).
  const brand = String(signals.brand || '').toLowerCase();
  for (const def of BRAND_DEFAULTS) {
    if (brand && brand.includes(def.brand) && !vetoed.has(def.category)) {
      totals[def.category] += TOKEN_POINTS;
    }
  }

  const final = bestCategory(totals, vetoed);
  if (final.best >= FLOOR) {
    return {
      category: final.winner,
      taxonomy_version: TAXONOMY_VERSION,
      scores: totals,
      low_confidence: true,
      reason: 'title',
    };
  }
  return {
    category: 'Other',
    taxonomy_version: TAXONOMY_VERSION,
    scores: totals,
    low_confidence: true,
    reason: 'below-floor',
  };
}
