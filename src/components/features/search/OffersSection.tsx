import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getDealOffers, type DealOffer } from '../../../lib/api';
import { isEndingSoon, isOfferExpired, parseDate } from '../../../lib/utils';
import { useTrialPinCount } from '../../../hooks/useTrialPinCount';
import { OfferCarousel } from './OfferCarousel';

function expiryTime(deal: DealOffer): number {
  const date = parseDate(deal.offer_expires_at);
  return date ? date.getTime() : Number.POSITIVE_INFINITY;
}

function byExpiryAsc(a: DealOffer, b: DealOffer): number {
  return expiryTime(a) - expiryTime(b);
}

export function OffersSection() {
  const { user, token } = useAuth();
  const [deals, setDeals] = useState<DealOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const isTrial = !!user?.isTrial;
  const { limitReached, handleAdded } = useTrialPinCount(token, isTrial);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getDealOffers(token)
      .then(data => { if (!cancelled) setDeals(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const { offers } = useMemo(() => {
    const live = deals.filter(d => d.is_on_offer && !isOfferExpired(d.offer_expires_at));
    const soon = live.filter(d => isEndingSoon(d.offer_expires_at)).sort(byExpiryAsc);
    const soonUrls = new Set(soon.map(d => d.product_url));
    const rest = live.filter(d => !soonUrls.has(d.product_url)).sort(byExpiryAsc);
    return { offers: rest, endingSoon: soon };
  }, [deals]);

  if (!token) return null;
  if (!loading && offers.length === 0) return null;

  return (
    <OfferCarousel
      title="Offers"
      items={offers}
      loading={loading}
      limitReached={limitReached}
      onAdded={handleAdded}
      view="all"
    />
  );
}
