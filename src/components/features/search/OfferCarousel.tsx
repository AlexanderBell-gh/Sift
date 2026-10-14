import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DealOffer } from '../../../lib/api';
import { OfferTile, OfferTileSkeleton } from './OfferTile';

export const CAROUSEL_VISIBLE_COUNT = 8;

export function OfferCarousel({ title, items, loading, limitReached, onAdded, view }: {
  title: string;
  items: DealOffer[];
  loading: boolean;
  limitReached: boolean;
  onAdded: () => void;
  view: 'all' | 'ending' | 'popular';
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrev(track.scrollLeft > 4);
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows, items.length, loading]);

  function scrollByDir(dir: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const tile = track.querySelector<HTMLElement>('.offer-tile, .offers-show-all');
    const step = tile ? tile.offsetWidth + 16 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * step, top: 0, behavior: 'smooth' });
  }

  if (!loading && items.length === 0) return null;

  const visible = items.slice(0, CAROUSEL_VISIBLE_COUNT);
  const showAllTile = !loading && items.length > CAROUSEL_VISIBLE_COUNT;

  return (
    <section className="offers-section" aria-label={title}>
      <div className="offers-container">
        <div className="offers-head">
          <h2 className="offers-title">
            {title}
            {!loading && items.length > 0 && (
              <span className="offers-count">{items.length}</span>
            )}
          </h2>
          <div className="offers-arrows">
            <button
              type="button"
              className="offers-arrow"
              onClick={() => scrollByDir(-1)}
              disabled={!canPrev}
              aria-label={`Scroll ${title} left`}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="offers-arrow"
              onClick={() => scrollByDir(1)}
              disabled={!canNext}
              aria-label={`Scroll ${title} right`}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div
          ref={trackRef}
          className={`offers-track${canPrev ? ' is-scrolled' : ''}${canNext ? ' has-more' : ''}`}
          role="list"
          aria-label={`${title} carousel`}
          onScroll={updateArrows}
        >
          {loading ? (
            Array.from({ length: CAROUSEL_VISIBLE_COUNT }).map((_, i) => (
              <OfferTileSkeleton key={i} />
            ))
          ) : (
            <>
              {visible.map((deal) => (
                <div key={deal.product_url} role="listitem" className="offers-snap">
                  <OfferTile deal={deal} limitReached={limitReached} onAdded={onAdded} />
                </div>
              ))}
              {showAllTile && (
                <Link
                  to={`/offers?view=${view}`}
                  className="offers-show-all"
                  aria-label={`Show all ${items.length} ${title.toLowerCase()}`}
                >
                  <span className="offers-show-all-icon" aria-hidden="true">
                    <ArrowRight size={20} />
                  </span>
                  <span className="offers-show-all-text">Show all</span>
                  <span className="offers-show-all-count">{items.length} items</span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
