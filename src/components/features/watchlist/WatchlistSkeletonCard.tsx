export default function WatchlistSkeletonCard() {
  return (
    <div className="product-card" aria-hidden="true">
      <div className="product-card-top">
        <div className="skeleton skeleton-media" />
      </div>
      <div className="product-card-bottom">
        <div className="skeleton skeleton-pill" />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-price" />
        <div className="skeleton skeleton-badge" />
        <div className="skeleton skeleton-meta" />
      </div>
    </div>
  );
}
