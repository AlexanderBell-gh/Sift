import { useCallback, useEffect, useState } from 'react';
import { getPinnedIds } from '../lib/api';

const TRIAL_LIMIT = 5;

// Shared trial pin-limit state: initial pinned count plus a refresh for
// pin actions. Non-trial accounts never fetch — limitReached stays false.
export function useTrialPinCount(token: string | null, isTrial: boolean) {
  const [pinnedCount, setPinnedCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isTrial || !token) return;
    let cancelled = false;
    getPinnedIds(token)
      .then(ids => { if (!cancelled) setPinnedCount(new Set(ids.map(i => i.product_id)).size); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isTrial, token]);

  const handleAdded = useCallback(async () => {
    if (!isTrial || !token) return;
    try {
      const ids = await getPinnedIds(token);
      setPinnedCount(new Set(ids.map(i => i.product_id)).size);
    } catch {
      // keep previous count
    }
  }, [isTrial, token]);

  const limitReached = isTrial && pinnedCount !== null && pinnedCount >= TRIAL_LIMIT;
  return { limitReached, handleAdded };
}
