// Inheritance lookup for phone-app pins (Phase 1: POST /api/import/resolve).
// Plain JS (worker runtime + node --test compatible). No dependencies.
//
// Input { store, name } is matched against all users' watchlist rows
// (product-level facts only, never whose row). Ranking: normalized exact
// store+name wins, then same-store substring, then cross-store same name.
// Ties: row with image first, then most recently updated.

export const RESOLVE_STORE_MAX = 100;
export const RESOLVE_NAME_MAX = 200;

// Display names as stored in watchlist.store (extension + phone both pin
// display names, e.g. "Tesco"). Ids accepted too and mapped here so the
// app can send either without breaking inheritance.
export const STORE_ALIASES = {
  tesco: "Tesco",
  sainsburys: "Sainsbury's",
  asda: "ASDA",
  morrisons: "Morrisons",
  marksandspencer: "M&S",
  aldi: "Aldi",
  lidl: "Lidl",
  coop: "Co-op",
  waitrose: "Waitrose",
  iceland: "Iceland",
  ocado: "Ocado",
};

const DISPLAY_NAMES = new Set(Object.values(STORE_ALIASES).map((n) => n.toLowerCase()));

export function normalizeStore(value) {
  if (typeof value !== "string") return "";
  const t = value.trim().toLowerCase();
  if (!t) return "";
  // Id -> display name ("tesco" -> "Tesco"). Display names pass through
  // case-insensitively ("tesco " handled by trim above, "TESCO" by lower).
  if (STORE_ALIASES[t]) return STORE_ALIASES[t];
  if (DISPLAY_NAMES.has(t)) {
    return Object.values(STORE_ALIASES).find((n) => n.toLowerCase() === t) || "";
  }
  return "";
}

export function normalizeName(value) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, RESOLVE_NAME_MAX);
}

export function validateResolveInput(body) {
  const store = typeof body?.store === "string" ? body.store.slice(0, RESOLVE_STORE_MAX) : "";
  const name = typeof body?.name === "string" ? body.name.slice(0, RESOLVE_NAME_MAX) : "";
  if (!store.trim() || !name.trim()) return { ok: false, error: "Store and name are required" };
  const normalizedStore = normalizeStore(store);
  if (!normalizedStore) return { ok: false, error: "Unknown store" };
  const normalizedName = normalizeName(name);
  if (!normalizedName) return { ok: false, error: "Store and name are required" };
  return { ok: true, store: normalizedStore, name: normalizedName };
}

export function emptyFacts() {
  return {
    image_url: "",
    normal_price: null,
    loyalty_price: null,
    offer_deal: null,
    offer_expires_at: null,
    category: null,
    taxonomy_version: 0,
    product_url: "",
    unit: null,
  };
}

export function toInheritedFacts(row) {
  if (!row) return emptyFacts();
  return {
    image_url: row.image_url || "",
    normal_price: row.normal_price ?? null,
    loyalty_price: row.loyalty_price ?? null,
    offer_deal: row.offer_deal || null,
    offer_expires_at: row.offer_expires_at || null,
    category: row.category || null,
    taxonomy_version: row.taxonomy_version ?? 0,
    product_url: row.product_url || "",
    unit: row.unit || null,
  };
}

function rankOf(row, qStore, qName) {
  const rowStore = normalizeStore(row.store || "");
  const rowName = normalizeName(row.product_name || "");
  if (!rowName) return -1;
  const sameStore = rowStore && rowStore === qStore;
  if (sameStore && rowName === qName) return 0;
  if (sameStore && (rowName.includes(qName) || qName.includes(rowName))) return 1;
  if (rowName === qName) return 2;
  if (rowName.includes(qName) || qName.includes(rowName)) return 3;
  return -1;
}

// Pure ranking over candidate rows. Returns best row or null.
export function pickBestRow(rows, qStore, qName) {
  let best = null;
  let bestKey = null;
  for (const row of rows || []) {
    const rank = rankOf(row, qStore, qName);
    if (rank < 0) continue;
    const hasImage = row.image_url ? 0 : 1;
    const updated = -(row.updated_at || 0);
    const key = [rank, hasImage, updated];
    if (!bestKey || compareKey(key, bestKey) < 0) {
      best = row;
      bestKey = key;
    }
  }
  return best;
}

function compareKey(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}
