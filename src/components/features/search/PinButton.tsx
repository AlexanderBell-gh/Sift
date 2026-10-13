import { Check, Loader2, Plus } from 'lucide-react';

// Single pin-button used by the carousel tiles and the Show-all modal,
// so state styles and animations stay identical in both places.
export function PinButton({ name, adding, added, pinned, limitReached, onPin }: {
  name: string;
  adding: boolean;
  added: boolean;
  pinned: boolean;
  limitReached: boolean;
  onPin: () => void;
}) {
  const done = added || pinned;
  return (
    <button
      type="button"
      onClick={onPin}
      disabled={adding || done || limitReached}
      aria-busy={adding}
      className={`product-card-add${added ? ' is-added' : pinned ? ' is-pinned' : ''}`}
      aria-label={adding ? `Adding ${name} to watchlist` : `Pin ${name} to watchlist`}
    >
      {adding ? (
        <>
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          Adding…
        </>
      ) : done ? (
        <>
          <Check size={14} aria-hidden="true" />
          Added
        </>
      ) : (
        <>
          <Plus size={14} aria-hidden="true" />
          Pin
        </>
      )}
    </button>
  );
}
