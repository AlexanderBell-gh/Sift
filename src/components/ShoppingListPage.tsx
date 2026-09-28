import { useState, useEffect, useMemo } from 'react';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import { getShoppingList, setShoppingListQty, clearShoppingList, type ShoppingListEntry } from '../lib/api';
import { isOfferExpired, getLoyaltyLabel, getLoyaltyClass } from '../lib/utils';
import { lineTotal, lineSavings, formatGBP, type LineTotal } from '../lib/pricing';
import { STORES } from '../lib/stores';
import NavHeader from './NavHeader';

interface PricedEntry {
  entry: ShoppingListEntry;
  expired: boolean;
  priced: LineTotal;
  savings: number | null;
}

export default function ShoppingListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ShoppingListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);

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

  const pricedEntries: PricedEntry[] = useMemo(() => {
    return entries.map(entry => {
      const expired = isOfferExpired(entry.item.offer_expires_at);
      const priced = lineTotal(
        entry.quantity,
        entry.item.prices.normal,
        entry.item.prices.loyalty,
        entry.item.offer_deal,
        expired,
      );
      return {
        entry,
        expired,
        priced,
        savings: lineSavings(entry.quantity, entry.item.prices.normal, priced),
      };
    });
  }, [entries]);

  const stores = useMemo(() => {
    const map = new Map<string, PricedEntry[]>();
    for (const p of pricedEntries) {
      const arr = map.get(p.entry.item.store) ?? [];
      arr.push(p);
      map.set(p.entry.item.store, arr);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pricedEntries]);

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

  async function handleQty(listId: string, nextQty: number) {
    if (!token || pendingIds.has(listId)) return;
    const prev = entries;
    if (nextQty <= 0) {
      setEntries(prevEntries => prevEntries.filter(e => e.list_id !== listId));
    } else {
      setEntries(prevEntries => prevEntries.map(e => e.list_id === listId ? { ...e, quantity: nextQty } : e));
    }
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
      window.setTimeout(() => setConfirmClear(false), 4000);
      return;
    }
    const prev = entries;
    setEntries([]);
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
      <NavHeader />

      <div className="container watchlist-content">
        {!loading && entries.length > 0 && (
          <div className="shoplist-head">
            <button onClick={handleClear} className="btn-secondary shoplist-clear">
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
          <div className="empty-state-box" aria-live="polite">
            <p className="empty-state-title">Loading list</p>
            <p className="empty-state-desc">Fetching your shopping list.</p>
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
            <div className="shoplist-summary">
              <div>
                <p className="metric-label">Estimated total</p>
                <p className="metric-value">
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
              for (const p of lines) {
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
                    <span className="store-card">
                      {storeLogo && (
                        <img src={storeLogo} alt={store} className="store-logo" />
                      )}
                      {store}
                    </span>
                    <span className="shoplist-store-total">
                      {formatGBP(subtotal)}{!complete && '*'}
                      {hasSavings && <span className="shoplist-savings"> · save {formatGBP(savings)}</span>}
                    </span>
                  </div>
                  <ul className="shoplist-lines">
                    {lines.map(({ entry, expired, priced, savings: save }) => {
                      const item = entry.item;
                      const pending = pendingIds.has(entry.list_id);
                      return (
                        <li key={entry.list_id} className="shoplist-line">
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
                                {expired ? 'Offer expired' : item.offer_deal}
                              </span>
                            ) : item.prices.loyalty !== null && !expired ? (
                              <span className={`product-card-loyalty-label ${getLoyaltyClass(item.store)}`}>
                                {getLoyaltyLabel(item.store)}
                              </span>
                            ) : null}
                            {priced.basis === 'offer' && priced.sets > 0 && (
                              <p className="shoplist-note">
                                Multibuy applied × {priced.sets}
                              </p>
                            )}
                            {expired && item.offer_deal && (
                              <p className="shoplist-note">Offer expired — priced at shelf</p>
                            )}
                            {priced.basis === 'unit' && item.offer_deal && !expired && (
                              <p className="shoplist-note">Offer terms not recognised — shelf price used</p>
                            )}
                          </div>
                          <div className="shoplist-qty" role="group" aria-label={`Quantity for ${item.product_name}`}>
                            <button
                              type="button"
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
                          </div>
                          <p className="shoplist-line-total">
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
