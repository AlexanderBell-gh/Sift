// Single source of truth for watchlist category assignment.
// Pipeline: manual override -> product_knowledge memory -> Workers AI -> Other.
//
// Plain JS (worker runtime + node --test compatible). No dependencies.
//
// Signal contract:
//   { title, brand?, breadcrumb_raw?, breadcrumb_leaf?, storage_text? }
//
// The core stays pure: DB reads, DB writes and the model call arrive as
// injected `lookup`, `remember` and `infer`, so tests need no DB or network.

export const CANONICAL_CATEGORIES = [
  'Chilled',
  'Snacks',
  'Drinks',
  'Produce',
  'Frozen',
  'Bakery',
  'Food Cupboard',
  'Other',
];

// Every shelf the store might keep the product on, fed to the prompt verbatim.
const SHELF_RULES = [
  'Chilled: anything bought from the chiller — fresh dairy and milk, fresh juice, chilled drinks, chilled alcohol, fresh meat and fish, dips, fresh ready meals.',
  'Drinks: shelf-stable liquids and alcohol — beer, cider, wine, spirits, cola, lemonade, water, squash, long-life juice, mixers.',
  'Food Cupboard: shelf-stable dry goods and staples — pasta, rice, tins, jars, sauces, oil, spices, coffee, tea, hot chocolate powder.',
  'Produce: raw fresh fruit, veg, salad, herbs. Frozen veg is Frozen; tinned veg is Food Cupboard.',
  'Frozen: anything from the freezer aisle, including frozen drinks and ice.',
  'Bakery: ambient bread aisle — loaves, wraps, crumpets, bagels, pastries, cakes.',
  'Snacks: shelf-stable finger food — crisps, nuts, chocolate, sweets, sweet biscuits.',
  'Other: strictly non-food — toilet roll, cleaning, laundry, toiletries, pet food.',
];

const TEMPERATURE_RULE = 'Temperature beats type: the shelf the store keeps it on decides. Fresh milk, fresh juice and chilled drinks are Chilled; ambient beer, wine, spirits, cola, water and ambient juice are Drinks.';

// A size suffix is packaging, not identity: "Coca Cola 330ml" and "Coca Cola 2L"
// must share one knowledge row. Full forms only ('coke' is not 'cola').
const SIZE_TOKEN = /^(?:\d+(?:\.\d+)?)?(?:kg|g|mg|ml|cl|l|litre|litres|liter|liters|pint|pints|pack|packs|pk)$|^\d+x\d*(?:kg|g|mg|ml|cl|l|litre|litres|liter|liters|pint|pints|pack|packs|pk)?$|^\d+$|^x$/;

export function normaliseTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, ' ')
    .split(' ')
    .filter((token) => token && !SIZE_TOKEN.test(token))
    .join(' ');
}

function clip(value, max) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function buildPrompt(signals = {}) {
  const crumbs = Array.isArray(signals.breadcrumb_raw)
    ? signals.breadcrumb_raw.filter(Boolean).map((crumb) => clip(crumb, 80)).slice(0, 5)
    : [];
  const lines = [
    'You are a UK supermarket shelf classifier.',
    `Answer with exactly one label from: ${CANONICAL_CATEGORIES.join(', ')}.`,
    'Shelf rules:',
    ...SHELF_RULES.map((rule) => `- ${rule}`),
    TEMPERATURE_RULE,
    `Title: ${clip(signals.title, 200)}`,
  ];
  if (signals.brand) lines.push(`Brand: ${clip(signals.brand, 80)}`);
  if (signals.breadcrumb_leaf) lines.push(`Shelf: ${clip(signals.breadcrumb_leaf, 80)}`);
  if (crumbs.length) lines.push(`Breadcrumbs: ${crumbs.join(' > ')}`);
  if (signals.storage_text) lines.push(`Storage: ${clip(signals.storage_text, 200)}`);
  lines.push('Answer with the label only.');
  return lines.join('\n');
}

// Only a canonical label is usable. Anything else is a miss, never a guess.
export function parseCategory(value) {
  const text = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return CANONICAL_CATEGORIES.find((category) => category.toLowerCase() === text) || null;
}

function fallback() {
  return { category: 'Other', reason: 'fallback', low_confidence: true };
}

// First hit wins. `lookup` and `remember` speak in normalised ids; `remember`
// is only called for a valid AI answer, so a failure is retried next add.
export async function classifyCategory(signals = {}, deps = {}) {
  const override = parseCategory(deps.override);
  if (override) return { category: override, reason: 'manual', low_confidence: false };

  const id = normaliseTitle(signals.title);
  if (!id) return fallback();

  if (deps.lookup) {
    try {
      const remembered = parseCategory(await deps.lookup(id));
      if (remembered) return { category: remembered, reason: 'memory', low_confidence: false };
    } catch {
      // A memory miss must never fail the add.
    }
  }

  if (!deps.infer) return fallback();

  let answer = null;
  try {
    answer = await deps.infer(buildPrompt(signals));
  } catch {
    return fallback();
  }
  const category = parseCategory(answer);
  if (!category) return fallback();

  if (deps.remember) {
    try {
      await deps.remember(id, clip(signals.title, 200), category);
    } catch {
      // A failed cache write still leaves a correct answer for this add.
    }
  }
  return { category, reason: 'ai', low_confidence: false };
}
