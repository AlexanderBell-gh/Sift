// Mirrors product-card anatomy (media well, 2-line name, category pill,
// price, loyalty label, desktop-only meta, foot Add + desktop-only ✕)
// so loading tiles hold the exact shape of loaded ones.
export default function WatchlistSkeletonCard() {
  return (
    <div className="product-card" aria-hidden="true">
      <div className="skeleton product-card-media product-card-media-skeleton" />
      <div className="product-card-body">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-title skeleton-title-short" />
        <div className="skeleton skeleton-pill" />
        <div className="skeleton skeleton-price" />
        <div className="skeleton skeleton-badge" />
        <div className="skeleton skeleton-meta" />
      </div>
      <div className="product-card-foot">
        <div className="skeleton skeleton-add" />
        <div className="skeleton skeleton-x" />
      </div>
    </div>
  );
}
