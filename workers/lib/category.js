// Single source of truth for watchlist category assignment.
// Owns taxonomy server-side so all clients (extension, phone app) benefit
// once deployed. Phone app sends title/brand/store only: no breadcrumbs,
// no storage text, no URL, no JSON-LD. Title-first path must clear the
// floor on product name alone.
// Plain JS (worker runtime + node --test compatible). No dependencies.
//
// Signal contract (from extension `result.category_signals`, phone sends
// a subset):
//   { breadcrumb_raw[], breadcrumb_leaf, title, brand, store | store_id,
//     url_path, jsonld_category, storage_text }
// Legacy clients send only `result.category`; that path uses
// clampLegacyCategory() and stores taxonomy_version 0.

export const TAXONOMY_VERSION = 3;

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

// Breadcrumb vocabulary + title-first corpus terms (v3: mined from
// src/data/*.json, 1,607 names, so phone titles score without crumbs).
// Title guesses are scored against the same table but only when the
// breadcrumb is weak or absent, and flavour modifiers are stripped from
// titles first.
const AISLE_TERMS = {
  Chilled: [
    'chilled', 'dairy', 'milk', 'skimmed', 'semi', 'semi-skimmed', 'yogurt', 'yoghurt', 'yoghurts', 'skyr',
    'kefir', 'cheese', 'cheddar', 'mozzarella', 'feta', 'brie', 'stilton',
    'gouda', 'halloumi', 'paneer',
    'butter', 'cream', 'eggs', 'bacon', 'sausages', 'sausage', 'ham',
    'chicken', 'chicken breast', 'poultry', 'turkey', 'duck', 'beef',
    'pork', 'lamb', 'mince', 'steak', 'meatballs', 'kebab', 'shawarma',
    'prawn', 'prawns', 'shrimp', 'salmon', 'tuna', 'trout', 'fish',
    'salmon, tuna & trout',
    'hummus', 'houmous', 'dip', 'dips', 'coleslaw', 'quiche', 'tofu',
    'falafel', 'sandwich', 'sandwiches', 'sushi', 'deli',
    'ready meal', 'ready meals', 'grain bowl',
    // NOTE: 'high protein' deliberately absent (removed 24-09-2026). As a
    // title claim it is marketing, not freshness (Huel noodles scored
    // Chilled on the claim alone). Real chilled high-protein aisles are
    // covered by 'ready meal'/'grain bowl' plus the STORE_AISLE_ALIASES
    // 'high protein' leaf backstop below.
  ],
  Snacks: [
    'snacks', 'crisps', 'chocolate', 'cookies', 'cookie', 'biscuits',
    'biscuit', 'nuts', 'popcorn', 'crackers', 'sweets', 'candy',
    'cereal bars', 'cereal bar', 'pretzel', 'pretzels', 'nachos',
    'olives', 'cashews', 'almonds', 'peanuts', 'pistachios',
    'trail mix', 'rice cakes',
  ],
  Beverages: [
    'beverages', 'drinks', 'juice', 'cola', 'coke', 'coca', 'pepsi',
    'coffee', 'tea', 'water', 'squash', 'beer', 'wine', 'soda',
    'smoothie', 'gin', 'vodka', 'whisky', 'whiskey', 'rum', 'prosecco',
    'champagne', 'cider', 'lager', 'ale', 'stout', 'energy', 'tonic',
    'lemonade', 'cordial', 'kombucha', 'orange juice', 'apple juice',
  ],
  Produce: [
    'produce', 'fresh produce', 'fruit', 'vegetables', 'vegetable', 'salad',
    'apple', 'apples', 'banana', 'bananas', 'pepper', 'peppers', 'carrot',
    'carrots', 'kiwi', 'potato', 'potatoes', 'onion', 'onions', 'tomato',
    'tomatoes', 'broccoli', 'cucumber', 'lettuce', 'orange', 'oranges',
    'grapes', 'lemons', 'limes', 'avocado', 'avocados',
    'mango', 'pineapple', 'melon', 'watermelon', 'pear', 'pears', 'plum',
    'plums', 'peach', 'peaches', 'nectarine', 'nectarines', 'cherry',
    'cherries', 'apricot', 'apricots', 'pomegranate', 'passion fruit',
    'aubergine', 'courgette', 'chilli', 'garlic', 'ginger', 'mushroom',
    'mushrooms', 'celery', 'kale', 'spinach', 'rocket', 'leek', 'leeks',
    'parsnip', 'parsnips', 'beetroot', 'radish',
  ],
  Frozen: [
    'frozen', 'peas', 'sweetcorn', 'ice cream', 'pizza', 'pie', 'pies',
    'nuggets', 'nugget', 'waffles', 'waffle', 'fish fingers',
    'hash browns', 'scampi', 'ice lollies', 'lollies', 'sorbet',
  ],
  Bakery: [
    'bakery', 'bread', 'baguette', 'croissant', 'rolls', 'roll', 'buns',
    'bun', 'cake', 'cakes', 'loaf', 'loaves', 'pastries', 'pastry',
    'tortilla', 'tortillas', 'naan', 'muffins', 'muffin', 'bagel',
    'bagels', 'brioche', 'scones', 'scone', 'doughnuts', 'donuts',
    'donut', 'wraps', 'wrap', 'pitta', 'ciabatta', 'focaccia',
    'crumpets', 'crumpet', 'hot cross buns',
  ],
  'Food Cupboard': [
    'food cupboard', 'cereals', 'cereal', 'flapjack', 'flapjacks', 'oat',
    'oats', 'oat boosts', 'granola', 'muesli', 'porridge', 'pasta', 'rice',
    'flour', 'sugar', 'soup', 'stock', 'sauce', 'sauces', 'ketchup',
    'beans', 'lentils', 'couscous', 'noodle', 'noodles', 'tins', 'canned',
    'tinned', 'dried', 'oil', 'salt', 'vinegar', 'spice', 'spices',
    'herbs', 'curry', 'honey', 'jam', 'marmalade', 'syrup',
    'peanut butter', 'spaghetti', 'fusilli', 'penne', 'macaroni',
    'lasagne', 'tagliatelle', 'chickpeas', 'chickpea', 'chopped tomatoes',
    'passata', 'coconut milk', 'gravy', 'stuffing',
  ],
  Other: [],
};

// Flavour words always stripped from titles before scoring. A blueberry
// flapjack is not chilled produce; modifiers alone must never decide.
// v3: potato removed from this set (real produce titles such as
// 'White Potatoes' must score Produce; the bare 'Sweet Potato' case is
// handled by TITLE_STRIPPED_PHRASES below, and the chicken-shawarma case
// is covered by the protein veto). Singular lemon/lime stay stripped
// (flavour words never decide); plural lemons/limes score Produce.
// Carb staples are NOT in this set: they strip only when real meat is
// present (see STAPLE_CARBS below), so meat-free noodles/pasta can still score Food
// Cupboard while 'chicken noodles' scores on the protein.
const TITLE_MODIFIERS = new Set([
  'berry', 'berries', 'blueberry', 'blueberries', 'strawberry',
  'strawberries', 'raspberry', 'raspberries', 'blackberry', 'blackberries',
  'lemon', 'lime', 'toffee', 'vanilla', 'caramel',
]);

// Multi-word title phrases stripped before scoring (title path only).
// 'sweet potato' alone must stay Other (locked), while plain potatoes
// score Produce and chicken+potato meals score on the protein.
const TITLE_STRIPPED_PHRASES = ['sweet potatoes', 'sweet potato'];

// Keywords matching the exact token only (no plural fold, no substring).
// Citrus: singular lemon/lime are flavour words (stripped as modifiers),
// plural lemons/limes are produce. The fold must not reunite them.
const EXACT_ONLY = new Set(['lemons', 'limes']);

// Quantity tokens carry no category signal ('400g', '2 Pints', '5 Pack',
// '4x100g', possessive fragments). Stripped in every scoring path.
const QUANTITY_UNITS = new Set([
  'g', 'kg', 'mg', 'ml', 'l', 'litre', 'litres', 'ltr', 'pint', 'pints',
  'pack', 'packs', 'oz', 'fl', 'cl',
]);

// Staple carbs: stripped from the title path only when the product carries
// real meat (chicken noodles -> protein wins). Without meat they stay and
// score Food Cupboard (Huel High Protein Noodles -> cupboard, 24-09-2026).
const STAPLE_CARBS = new Set(['noodles', 'noodle', 'pasta', 'rice']);

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

// Fresh-protein markers (v2, title-first for crumb-less stores). A strong
// meat/meal signal with no ambient cues vetoes Food Cupboard and Produce and
// confirms Chilled (PROTEIN_CONFIRM_POINTS meets the floor exactly).
const FRESH_PROTEIN_MARKERS = [
  'chicken', 'chicken breast', 'turkey', 'duck', 'beef', 'pork', 'lamb',
  'prawn', 'prawns', 'shrimp', 'mince', 'steak', 'meatballs', 'kebab',
  'shawarma', 'high protein', 'ready meal', 'ready meals', 'grain bowl',
];

// Ambient meal exemptions: protein-adjacent words marking shelf-stable goods.
// Block the fresh-protein veto so soups, stocks and flavour-only snacks stay
// out of Chilled. Staple carbs (noodles/pasta) included: a shelf-stable
// instant-noodle pot carrying a 'high protein' marketing claim must not
// confirm Chilled (Huel Black Edition case, 24-09-2026).
const AMBIENT_MEAL_EXEMPTIONS = [
  'soup', 'stock', 'crisps', 'flavour', 'flavor', 'tinned', 'canned',
  'long life', 'uht', 'baby food',
  'noodle', 'noodles', 'pasta', 'pizza',
];

// Real-meat markers for the staple-strip decision. Claim phrases ('high
// protein', 'ready meal', 'grain bowl') are excluded: a marketing claim is
// not meat, and must not trigger the strip (else Huel noodles lose their
// only cupboard signal).
const MEAT_MARKERS = FRESH_PROTEIN_MARKERS.filter(
  (m) => !['high protein', 'ready meal', 'ready meals', 'grain bowl'].includes(m)
);

// Storage keep-condition markers (v2 Option A, extension `storage_text`).
// Kept strict: 'suitable for freezing' is deliberately absent (fresh meat
// carries it); '-18' is matched separately as a substring.
const STORAGE_FROZEN_MARKERS = [
  'keep frozen', 'store frozen', 'do not refreeze',
];
const STORAGE_AMBIENT_MARKERS = [
  'cool dry place', 'cool dry', 'ambient', 'do not refrigerate',
  'no refrigeration', 'store cupboard', 'long life', 'uht',
];
const STORAGE_CHILLED_MARKERS = [
  'refrigerate', 'refrigerated', 'refrigeration', 'chilled', 'fridge',
  'use by', 'eat within', 'keep cool', 'serve chilled',
];

// Small per-store aisle alias table. Leaf exact match adds leaf-weight
// points to the mapped category. Extension point for observed crumbs.
// v3: covers all 11 phone-app stores (was 4); same two leaves.
const STORE_AISLE_ALIASES = [
  { store: 'tesco', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'sainsburys', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'asda', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'morrisons', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'marksandspencer', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'aldi', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'lidl', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'coop', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'waitrose', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'iceland', leaf: 'flapjacks', category: 'Food Cupboard' },
  { store: 'ocado', leaf: 'flapjacks', category: 'Food Cupboard' },
  // Bare 'High Protein' aisle is chilled floor space (backstop for the
  // 'high protein' term removal, 24-09-2026).
  { store: 'tesco', leaf: 'high protein', category: 'Chilled' },
  { store: 'sainsburys', leaf: 'high protein', category: 'Chilled' },
  { store: 'asda', leaf: 'high protein', category: 'Chilled' },
  { store: 'morrisons', leaf: 'high protein', category: 'Chilled' },
  { store: 'marksandspencer', leaf: 'high protein', category: 'Chilled' },
  { store: 'aldi', leaf: 'high protein', category: 'Chilled' },
  { store: 'lidl', leaf: 'high protein', category: 'Chilled' },
  { store: 'coop', leaf: 'high protein', category: 'Chilled' },
  { store: 'waitrose', leaf: 'high protein', category: 'Chilled' },
  { store: 'iceland', leaf: 'high protein', category: 'Chilled' },
  { store: 'ocado', leaf: 'high protein', category: 'Chilled' },
];

// Brand defaults. Empty by design: the locked Graze flapjack cases land in
// Food Cupboard via aisle terms, and per-brand tuning is deferred until the
// unknown-bucket log shows real misses. Shape: { brand, category, unlessBreadcrumb }.
const BRAND_DEFAULTS = [];

// Scoring: exact multi-word phrase 3, exact single token 1.5 (a single
// distinctive title word clears the floor alone: phone sends title only),
// stem-equal 1.5, substring (keyword 5+ chars) 0.5. Totals below FLOOR
// resolve to Other.
const PHRASE_POINTS = 3;
const TOKEN_POINTS = 1.5;
const SUBSTRING_POINTS = 0.5;
const FLOOR = 1.5;
const LEAF_WEIGHT = 1;
const CONTEXT_WEIGHT = 0.5;
const PROTEIN_CONFIRM_POINTS = 0.5;
const STORAGE_CHILLED_POINTS = 1;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Plural-insensitive single-token equality: pie/pies, waffle/waffles,
// cherry/cherries. Avoids naive stemming ('waffles' is not 'waffl').
function sameWord(token, keyword) {
  if (token === keyword) return true;
  if (token === `${keyword}s` || keyword === `${token}s`) return true;
  if (token === `${keyword}es` || keyword === `${token}es`) return true;
  if (keyword.endsWith('y') && token === `${keyword.slice(0, -1)}ies`) return true;
  if (token.endsWith('y') && keyword === `${token.slice(0, -1)}ies`) return true;
  return false;
}

function stripQuantityTokens(tokens) {
  return tokens.filter((t) => {
    if (/^\d/.test(t)) return false;
    if (QUANTITY_UNITS.has(t)) return false;
    if (t.length <= 1) return false;
    return true;
  });
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
// the full token stream; single tokens match exactly or on plural stem,
// else substring. Quantities never score. stripStaples=false keeps staple
// carbs (meat-free title path).
function scoreText(text, weight, stripModifiers, stripStaples = true) {
  let raw = String(text || '');
  if (stripModifiers) {
    for (const phrase of TITLE_STRIPPED_PHRASES) {
      raw = raw.replace(new RegExp(phrase.replace(/ /g, '\\s+'), 'gi'), ' ');
    }
  }
  const tokens = (() => {
    const t = stripQuantityTokens(tokenize(raw));
    return t;
  })();
  let kept = tokens;
  if (stripModifiers) {
    const filtered = tokens.filter((t) => !TITLE_MODIFIERS.has(t));
    // Modifier strip must never erase the product ('Lemons' is produce,
    // not nothing): restore when nothing survives.
    if (filtered.length > 0) kept = filtered;
  }
  if (stripModifiers && stripStaples) kept = kept.filter((t) => !STAPLE_CARBS.has(t));
  if (kept.length === 0 || weight === 0) return blankScores();
  const scores = blankScores();
  const joined = kept.join(' ');

  for (const [category, terms] of Object.entries(AISLE_TERMS)) {
    for (const term of terms) {
      const termTokens = tokenize(term);
      if (termTokens.length > 1) {
        if (joined.includes(termTokens.join(' '))) scores[category] += PHRASE_POINTS * weight;
      } else if (termTokens.length === 1) {
        const kw = termTokens[0];
        if (EXACT_ONLY.has(kw)) {
          if (kept.includes(kw)) scores[category] += TOKEN_POINTS * weight;
        } else if (kept.some((t) => sameWord(t, kw))) {
          scores[category] += TOKEN_POINTS * weight;
        } else if (kw.length >= 5 && kept.some((t) => t.includes(kw) || kw.includes(t))) {
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

  const vetoed = new Set();

  // Storage layer (v2 Option A): semantic keep-condition text from the
  // extension. Scored separately from combined text so storage copy such as
  // 'wash before use' can never trip the non-food veto.
  const storageText = String(signals.storage_text || '');
  const storageJoined = storageText.toLowerCase();
  const storageTokens = tokenize(storageText);
  if (hasMarker(storageTokens, storageJoined, STORAGE_FROZEN_MARKERS) || storageJoined.includes('-18')) {
    return { category: 'Frozen', taxonomy_version: TAXONOMY_VERSION, scores: null, low_confidence: false, reason: 'storage-frozen' };
  }
  const storageAmbient = hasMarker(storageTokens, storageJoined, STORAGE_AMBIENT_MARKERS);
  if (storageAmbient) {
    // Cupboard-stable does not mean not-produce: bananas, potatoes and
    // onions keep honestly in a cool dry place (Tesco bananas case,
    // 24-09-2026 — vetoing Produce zeroed a 1.5 Produce score into Other).
    // Veto Chilled only; nothing chilled is cupboard-stable.
    vetoed.add('Chilled');
  }
  const storageChilled = !storageAmbient && hasMarker(storageTokens, storageJoined, STORAGE_CHILLED_MARKERS);

  if (hasMarker(combinedTokens, combinedJoined, NON_FOOD_SIGNALS)) {
    return { category: 'Other', taxonomy_version: TAXONOMY_VERSION, scores: null, low_confidence: false, reason: 'non-food' };
  }

  const hasDairy = hasMarker(combinedTokens, combinedJoined, DAIRY_SIGNALS);
  if (!hasDairy && hasMarker(combinedTokens, combinedJoined, DRY_GOODS_MARKERS)) {
    vetoed.add('Chilled');
    vetoed.add('Produce');
  }

  // Fresh-protein confirmation: strong meat/meal signal, no ambient cues.
  // Vetoes ambient/veg categories and confirms Chilled. Single-protein
  // titles now clear the floor at exactly 1.5 (low confidence, logged).
  const hasAmbientMeal = storageAmbient || hasMarker(combinedTokens, combinedJoined, AMBIENT_MEAL_EXEMPTIONS);
  const proteinConfirm = !hasAmbientMeal && hasMarker(combinedTokens, combinedJoined, FRESH_PROTEIN_MARKERS);
  if (proteinConfirm) {
    vetoed.add('Food Cupboard');
    vetoed.add('Produce');
  }

  // Breadcrumb first: leaf full weight, path plus JSON-LD plus URL half weight.
  const crumbScores = blankScores();
  addScores(crumbScores, scoreText(leaf, LEAF_WEIGHT, false));
  addScores(crumbScores, scoreText(`${pathText} ${jsonld} ${urlWords}`, CONTEXT_WEIGHT, false));
  if (proteinConfirm) crumbScores.Chilled += PROTEIN_CONFIRM_POINTS;
  if (storageChilled) crumbScores.Chilled += STORAGE_CHILLED_POINTS;

  // Small alias table: exact leaf match is a confident aisle signal.
  const leafNorm = leaf.toLowerCase();
  for (const alias of STORE_AISLE_ALIASES) {
    if (alias.leaf === leafNorm && (!alias.store || store.includes(alias.store))) {
      crumbScores[alias.category] += PHRASE_POINTS * LEAF_WEIGHT;
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

  // Weak or absent breadcrumb (phone path): title decides at full weight.
  // Staple carbs survive only without real meat (Huel noodles keep them,
  // chicken noodles strip to the protein). Brand scores at half weight:
  // drinks brands (Pepsi, Tropicana) carry signal, never override.
  const totals = { ...crumbScores };
  const titleTokens = tokenize(title);
  const hasMeat = hasMarker(titleTokens, titleTokens.join(' '), MEAT_MARKERS);
  addScores(totals, scoreText(title, 1, true, hasMeat));
  addScores(totals, scoreText(String(signals.brand || ''), CONTEXT_WEIGHT, false));

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
