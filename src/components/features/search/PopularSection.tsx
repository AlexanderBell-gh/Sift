import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { getPopular, type DealOffer } from '../../../lib/api';
import { useTrialPinCount } from '../../../hooks/useTrialPinCount';
import { OfferCarousel } from './OfferCarousel';

export function PopularSection() {
  const { user, token } = useAuth();
  const [popular, setPopular] = useState<DealOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const isTrial = !!user?.isTrial;
  const { limitReached, handleAdded } = useTrialPinCount(token, isTrial);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getPopular(token)
      .then(data => { if (!cancelled) setPopular(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  if (!token) return null;
  if (!loading && popular.length === 0) return null;

  return (
    <OfferCarousel
      title="Popular right now"
      items={popular}
      loading={loading}
      limitReached={limitReached}
      onAdded={handleAdded}
      view="popular"
    />
  );
}
