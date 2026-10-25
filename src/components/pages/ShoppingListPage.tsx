import { useState, useEffect, useMemo, useRef } from 'react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getShoppingList, setShoppingListQty, clearShoppingList, type ShoppingListEntry } from '../../lib/api';
import { isOfferExpired, formatDealShort, getLoyaltyLabel, getLoyaltyClass } from '../../lib/utils';
import { lineTotal, lineSavings, formatGBP, parseOfferTiers, priceOfferGroup, type LineTotal } from '../../lib/pricing';
import { STORES } from '../../lib/stores';
import NavHeader from '../layout/NavHeader';

interface PricedEntry {
  entry: ShoppingListEntry;
  expired: boolean;
  priced: LineTotal;
  savings: number | null;
  staged: boolean;
}

export default function ShoppingListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ShoppingListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);
  const clearTimer = useRef<number | undefined>(undefined);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [barClosing, setBarClosing] = useState(false);
  const barTimer = useRef<number | undefined>(undefined);
  const barShownRef = useRef(false);
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const minusRefs = useRef(new Map<string, HTMLButtonElement | null>());

  useEffect(() => () => window.clearTimeout(clearTimer.current), []);
  useEffect(() => () => window.clearTimeout(barTimer.current), []);

  // Reveal the sticky total bar once the summary card scrolls out of view.
  // Hiding holds the bar mounted for a 150ms fade-out before unmounting.
  useEffect(() => {
    const el = summaryRef.current;
    if (!el || loading || entries.length === 0) {
      setSummaryVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry?.isIntersecting ?? true;
        window.clearTimeout(barTimer.current);
        if (visible) {
          if (barShownRef.current) {
            setBarClosing(true);
            barTimer.current = window.setTimeout(() => {
              setSummaryVisible(true);
              setBarClosing(false);
            }, 150);
          } else {
            setSummaryVisible(true);
          }
        } else {
          setBarClosing(false);
          setSummaryVisible(false);
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, entries.length]);

  useEffect(() => {
    if (!token) {
      navigate('/', { replace: true });
      return;
    }
    getShoppingList(token)
      .then(setEntries)
      .catch(() => setError('Failed to load shopping list'))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  // Pending inline removals: staged rows stay in entries (dimmed in place
  // with the stepper slot flipped to Undo) until undo or unmount commits
  // them. No timer, mirroring the watchlist staged-removal pattern.
  // The mirror ref is the synchronous source of truth; state mirrors it.
  const [staged, setStaged] = useState<Set<string>>(new Set());
  const stagedMirror = useRef(new Set<string>());

  function syncStagedState() {
    setStaged(new Set(stagedMirror.current));
  }

  function stageRemoval(listId: string) {
    if (!token || stagedMirror.current.has(listId)) return;
    if (!entries.some(e => e.list_id === listId)) return;
    stagedMirror.current.add(listId);
    syncStagedState();
  }

  function undoRemoval(listId: string) {
    if (!stagedMirror.current.has(listId)) return;
    stagedMirror.current.delete(listId);
    syncStagedState();
    window.setTimeout(() => minusRefs.current.get(listId)?.focus(), 0);
  }

  // Staged rows never leak across views: unmount commits them (qty 0).
  useEffect(() => () => {
    const t = tokenRef.current;
    for (const listId of Array.from(stagedMirror.current)) {
      stagedMirror.current.delete(listId);
      if (!t) continue;
      void setShoppingListQty(t, listId, 0).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh/close-tab skips React unmount cleanups: flush staged rows on
  // pagehide with keepalive PUTs, mirroring the watchlist page.
  useEffect(() => {
    function handlePageHide() {
      const t = tokenRef.current;
      if (!t) return;
      for (const listId of Array.from(stagedMirror.current)) {
        stagedMirror.current.delete(listId);
        void setShoppingListQty(t, listId, 0).catch(() => {});
      }
    }
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  const activeEntries = useMemo(() => {
    return entries.filter(e => !staged.has(e.list_id));
  }, [entries, staged]);

  const pricedEntries: PricedEntry[] = useMemo(() => {
    const out: PricedEntry[] = new Array(activeEntries.length);
    // Pool lines sharing one store + offer tag so "any N for £X" sets
    // complete across different products. Keyed on normalised raw text
    // (not parsed values) so distinct promos never merge.
    const groups = new Map<string, number[]>();
    activeEntries.forEach((entry, idx) => {
      const expired = isOfferExpired(entry.item.offer_expires_at);
      const unitPrice = entry.item.prices.loyalty ?? entry.item.prices.normal;
      const tag = entry.item.offer_deal;
      if (!expired && unitPrice !== null && unitPrice !== undefined && tag && parseOfferTiers(tag).length) {
        const key = `${entry.item.store}\n${tag.toLowerCase().trim().replace(/\s+/g, ' ')}`;
        const arr = groups.get(key) ?? [];
        arr.push(idx);
        groups.set(key, arr);
      } else {
        const priced = lineTotal(
          entry.quantity,
          entry.item.prices.normal,
          entry.item.prices.loyalty,
          tag,
          expired,
        );
        out[idx] = {
          entry,
          expired,
          priced,
          savings: lineSavings(entry.quantity, entry.item.prices.normal, priced),
          staged: false,
        };
      }
    });
    for (const idxs of groups.values()) {
      const first = activeEntries[idxs[0] as number]!;
      const offerTiers = parseOfferTiers(first.item.offer_deal);
      const results = priceOfferGroup(
        offerTiers,
        idxs.map(i => {
          const e = activeEntries[i as number]!;
          return { qty: e.quantity, unitPrice: (e.item.prices.loyalty ?? e.item.prices.normal) as number };
        }),
      );
      idxs.forEach((entryIdx, k) => {
        const entry = activeEntries[entryIdx as number]!;
        const r = results[k as number]!;
        const unitPrice = (entry.item.prices.loyalty ?? entry.item.prices.normal) as number;
        const priced: LineTotal = { total: r.total, unitPrice, basis: r.basis, sets: r.sets };
        out[entryIdx as number] = {
          entry,
          expired: false,
          priced,
          savings: lineSavings(entry.quantity, entry.item.prices.normal, priced),
          staged: false,
        };
      });
    }
    return out;
  }, [activeEntries]);

  const stores = useMemo(() => {
    const pricedById = new Map(pricedEntries.map(p => [p.entry.list_id, p]));
    const map = new Map<string, PricedEntry[]>();
    // All rows render (staged dimmed in place); only active rows price.
    for (const entry of entries) {
      const p = pricedById.get(entry.list_id);
      let line: PricedEntry;
      if (p) {
        line = p;
      } else {
        const expired = isOfferExpired(entry.item.offer_expires_at);
        line = {
          entry,
          expired,
          priced: lineTotal(
            entry.quantity,
            entry.item.prices.normal,
            entry.item.prices.loyalty,
            entry.item.offer_deal,
            expired,
          ),
          savings: null,
          staged: true,
        };
      }
      const arr = map.get(entry.item.store) ?? [];
      arr.push(line);
      map.set(entry.item.store, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [entries, pricedEntries]);

  const grandTotal = useMemo(() => {
    let total = 0;
    let complete = true;
    for (const p of pricedEntries) {
      if (p.priced.total === null) {
        complete = false;
        continue;
      }
      total += p.priced.total;
    }
    return { total, complete };
  }, [pricedEntries]);

  const grandSavings = useMemo(() => {
    let savings = 0;
    let any = false;
    for (const p of pricedEntries) {
      if (p.savings !== null && p.savings > 0) {
        savings += p.savings;
        any = true;
      }
    }
    return any ? savings : null;
  }, [pricedEntries]);

  const mixedCurrency = useMemo(() => {
    return new Set(pricedEntries.map(p => p.entry.item.prices.currency)).size > 1;
  }, [pricedEntries]);

  const itemCount = useMemo(() => {
    return pricedEntries.reduce((n, p) => n + p.entry.quantity, 0);
  }, [pricedEntries]);

  const showBar = !loading && entries.length > 0 && !summaryVisible;
  // Hold the bar mounted for a 150ms fade-out when the summary returns.
  const renderBar = showBar || barClosing;
  useEffect(() => {
    barShownRef.current = renderBar;
  });

  async function handleQty(listId: string, nextQty: number) {
    if (!token || pendingIds.has(listId)) return;
    const prev = entries;
    if (nextQty <= 0) {
      // Stage in place with Undo instead of vanishing; commits on unmount.
      stageRemoval(listId);
      return;
    }
    setEntries(prevEntries => prevEntries.map(e => e.list_id === listId ? { ...e, quantity: nextQty } : e));
    setPendingIds(prevSet => new Set(prevSet).add(listId));
    setError('');
    try {
      await setShoppingListQty(token, listId, Math.max(0, nextQty));
    } catch {
      setEntries(prev);
      setError('Failed to update quantity');
    } finally {
      setPendingIds(prevSet => {
        const next = new Set(prevSet);
        next.delete(listId);
        return next;
      });
    }
  }

  async function handleClear() {
    if (!token) return;
    if (!confirmClear) {
      setConfirmClear(true);
      window.clearTimeout(clearTimer.current);
      clearTimer.current = window.setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    window.clearTimeout(clearTimer.current);
    const prev = entries;
    setEntries([]);
    stagedMirror.current.clear();
    syncStagedState();
    setConfirmClear(false);
    setError('');
    try {
      await clearShoppingList(token);
    } catch {
      setEntries(prev);
      setError('Failed to clear shopping list');
    }
  }

  return (
    <div className="page-shell">
      <NavHeader staticNav />

      {renderBar && (
        <div className={`shoplist-totalbar${barClosing ? ' is-closing' : ''}`} aria-label="Estimated total" aria-hidden={barClosing || undefined}>
          <div className="shoplist-totalbar-info">
            <span className="shoplist-totalbar-label">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            {grandSavings !== null && (
              <span className="shoplist-totalbar-save">save {formatGBP(grandSavings)}</span>
            )}
          </div>
          <span className="shoplist-totalbar-total price-changed" key={grandTotal.total}>
            {formatGBP(grandTotal.total)}{!grandTotal.complete && '*'}
          </span>
        </div>
      )}

      <div className="container watchlist-content">
        {!loading && entries.length > 0 && (
          <div className="shoplist-head">
            <p className="shoplist-count" aria-live="polite">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · {stores.length} {stores.length === 1 ? 'store' : 'stores'}
            </p>
            <button
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && confirmClear) {
                  window.clearTimeout(clearTimer.current);
                  setConfirmClear(false);
                }
              }}
              aria-live="polite"
              className={`btn-secondary shoplist-clear${confirmClear ? ' shoplist-clear-confirm' : ''}`}
            >
              <Trash2 size={14} />
              {confirmClear ? 'Confirm clear?' : 'Clear all'}
            </button>
          </div>
        )}

        {error && (
          <div className="alert-error watchlist-alert" role="alert">
            {error}
          </div>
        )}

        {loading && (
          <div className="shoplist-skeleton" aria-live="polite" aria-busy="true" aria-label="Loading shopping list">
            {[0, 1, 2].map(i => (
              <div key={i} className="shoplist-line shoplist-skeleton-line" aria-hidden="true">
                <span className="skeleton shoplist-skeleton-thumb" />
                <span className="shoplist-skeleton-info">
                  <span className="skeleton shoplist-skeleton-title" />
                  <span className="skeleton shoplist-skeleton-meta" />
                </span>
                <span className="skeleton shoplist-skeleton-total" />
              </div>
            ))}
          </div>
        )}

        {!loading && entries.length === 0 && !error && (
          <div className="empty-state-box">
            <p className="empty-state-title">Your shopping list is empty</p>
            <p className="empty-state-desc">Add items from your watchlist and set quantities.</p>
            <div className="empty-state-cta-wrap">
              <button onClick={() => navigate('/watchlist')} className="btn-primary empty-state-cta">
                <ShoppingCart size={16} />
                Go to Watchlist
              </button>
            </div>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <>
            <div className="shoplist-summary" ref={summaryRef}>
              <div>
                <p className="metric-label">Estimated total</p>
                <p className="metric-value price-changed" key={grandTotal.total}>
                  {formatGBP(grandTotal.total)}{!grandTotal.complete && '*'}
                </p>
                {grandSavings !== null && (
                  <p className="shoplist-savings">Saving {formatGBP(grandSavings)} vs shelf price</p>
                )}
                {(!grandTotal.complete || mixedCurrency) && (
                  <p className="shoplist-note">
                    {!grandTotal.complete && '* Some items have no price yet. '}
                    {mixedCurrency && 'Mixed currencies — totals assume parity.'}
                  </p>
                )}
              </div>
            </div>

            {stores.map(([store, lines]) => {
              let subtotal = 0;
              let complete = true;
              let savings = 0;
              let hasSavings = false;
              let activeCount = 0;
              for (const p of lines) {
                if (p.staged) continue;
                activeCount += 1;
                if (p.priced.total === null) {
                  complete = false;
                  continue;
                }
                subtotal += p.priced.total;
                if (p.savings !== null && p.savings > 0) {
                  savings += p.savings;
                  hasSavings = true;
                }
              }
              const storeLogo = STORES.find(s => s.name === store)?.logo
                ?? lines[0]?.entry.item.store_logo;
              return (
                <section key={store} aria-label={store} className="shoplist-store">
                  <div className="shoplist-store-head">
                    <span className="shoplist-store-id">
                      {storeLogo && (
                        <img src={storeLogo} alt="" className="shoplist-store-logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      )}
                      <span className="shoplist-store-name">{store}</span>
                    </span>
                    <span className="shoplist-store-count">
                      {activeCount} {activeCount === 1 ? 'item' : 'items'}
                    </span>
                    <span className="shoplist-store-total price-changed" key={subtotal}>
                      {formatGBP(subtotal)}{!complete && '*'}
                      {hasSavings && <span className="shoplist-savings"> · save {formatGBP(savings)}</span>}
                    </span>
                  </div>
                  <ul className="shoplist-lines">
                    {lines.map(({ entry, expired, priced, savings: save, staged: isStaged }) => {
                      const item = entry.item;
                      const pending = pendingIds.has(entry.list_id);
                      return (
                        <li key={entry.list_id} className={`shoplist-line${pending ? ' is-pending' : ''}${isStaged ? ' is-removed' : ''}`} aria-busy={pending || undefined}>
                          {item.image_url ? (
                            <img src={item.image_url} alt="" className="shoplist-thumb" />
                          ) : (
                            <span className="shoplist-thumb-fallback">
                              {item.store.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <div className="shoplist-info">
                            <p className="shoplist-name">{item.product_name}</p>
                            <p className="shoplist-unit">
                              {priced.unitPrice !== null ? `${formatGBP(priced.unitPrice)} each` : 'Price unavailable'}
                            </p>
                            {item.offer_deal ? (
                              <span className={`product-card-loyalty-label ${getLoyaltyClass(item.store)}`} title={item.offer_deal}>
                                {expired ? 'Offer expired' : formatDealShort(item.offer_deal)}
                              </span>
                            ) : item.prices.loyalty !== null && !expired ? (
                              <span className={`product-card-loyalty-label ${getLoyaltyClass(item.store)}`} title={getLoyaltyLabel(item.store)}>
                                {getLoyaltyLabel(item.store)}
                              </span>
                            ) : null}
                            <div className="shoplist-notes">
                              {priced.basis === 'offer' && priced.sets > 0 && (
                                <p className="shoplist-note">
                                  Multibuy applied × {priced.sets}
                                </p>
                              )}
                              {expired && item.offer_deal && (
                                <p className="shoplist-note">Offer expired — priced at shelf.</p>
                              )}
                              {priced.basis === 'unit' && item.offer_deal && !expired && (
                                <p className="shoplist-note">Offer terms not recognised — shelf price used.</p>
                              )}
                            </div>
                          </div>
                          <div className="shoplist-qty" role="group" aria-label={`Quantity for ${item.product_name}`}>
                            {isStaged ? (
                              <button
                                type="button"
                                autoFocus
                                onClick={() => undoRemoval(entry.list_id)}
                                aria-label={`Undo remove ${item.product_name} from list`}
                                className="shoplist-undo"
                              >
                                Undo
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  ref={(el) => { minusRefs.current.set(entry.list_id, el); }}
                                  onClick={() => handleQty(entry.list_id, entry.quantity - 1)}
                                  disabled={pending}
                                  aria-label={entry.quantity === 1 ? `Remove ${item.product_name} from list` : `Decrease quantity of ${item.product_name}`}
                                  className="qty-btn"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="qty-value" aria-live="polite">{entry.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleQty(entry.list_id, entry.quantity + 1)}
                                  disabled={pending || entry.quantity >= 99}
                                  aria-label={`Increase quantity of ${item.product_name}`}
                                  className="qty-btn"
                                >
                                  <Plus size={14} />
                                </button>
                              </>
                            )}
                          </div>
                          <p className="shoplist-line-total price-changed" key={priced.total ?? 'unknown'}>
                            {priced.total !== null ? formatGBP(priced.total) : '—'}
                            {save !== null && save > 0 && (
                              <span className="shoplist-savings"> −{formatGBP(save)}</span>
                            )}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
