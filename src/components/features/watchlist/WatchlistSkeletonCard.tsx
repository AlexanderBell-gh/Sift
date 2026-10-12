export default function WatchlistSkeletonCard() {
  return (
    <div className="product-card" aria-hidden="true">
      <div className="skeleton product-card-media" />
      <div className="product-card-body">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-price" />
        <div className="skeleton skeleton-badge" />
      </div>
      <div className="product-card-foot">
        <div className="skeleton skeleton-add" />
      </div>
    </div>
  );
}
