import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { STORES } from '../../lib/stores';

interface StoreSelectProps {
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  className?: string;
}

function ShopIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function StoreSelect({ selected, onChange, className }: StoreSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleStore(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  }

  function selectAll() {
    onChange(new Set(STORES.map((s) => s.id)));
  }

  function clearAll() {
    onChange(new Set());
  }

  return (
    <div ref={dropdownRef} className={cn('relative store-select', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative flex items-center justify-center',
          'border-r border-[var(--border)]',
          'hover:bg-[var(--surface-hover)]',
          'focus:outline-none focus:bg-[var(--surface-hover)]',
          'text-[var(--muted)] hover:text-[var(--primary)]'
        )}
      >
        <ShopIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute left-0 top-full mt-2 w-64',
            'bg-[var(--surface)] border border-[var(--border)]',
            'rounded-2xl shadow-lg overflow-hidden',
            'animate-in fade-in slide-in-from-top-2 duration-200'
          )}
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-[var(--primary)] hover:text-[var(--primary)]/80 transition-colors"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {STORES.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => toggleStore(store.id)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left',
                  'transition-colors duration-150',
                  selected.has(store.id)
                    ? 'store-selected'
                    : 'hover:bg-[var(--surface-hover)]'
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0',
                    'transition-all duration-150',
                    selected.has(store.id)
                      ? 'bg-[var(--primary)] border-[var(--primary)]'
                      : 'border-[var(--border)]'
                  )}
                >
                  {selected.has(store.id) && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </div>
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-6 h-6 rounded object-contain"
                />
                <span className="text-sm font-medium text-[var(--text)]">{store.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
