import { useState, useRef, useEffect } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { STORES } from '../../lib/stores';

interface StoreSelectProps {
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
  className?: string;
}

const MAX_STORES = 3;

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
      if (next.size >= MAX_STORES) return;
      next.add(id);
    }
    onChange(next);
  }

  function clearAll() {
    onChange(new Set());
  }

  return (
    <div ref={dropdownRef} className={cn('relative store-select', className)}>
      <div className="store-chips-row">
        {STORES.filter(s => selected.has(s.id)).map(store => (
          <button
            key={store.id}
            type="button"
            onClick={() => {
              const next = new Set(selected);
              next.delete(store.id);
              onChange(next);
            }}
            className="store-chip"
            aria-label={`Remove ${store.name}`}
          >
            <img src={store.logo} alt={store.name} className="w-4 h-4 rounded object-contain" />
            <span>{store.name}</span>
            <X className="w-3 h-3" />
          </button>
        ))}
        {selected.size < MAX_STORES && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            className={cn('store-chip-add', isOpen && 'store-chip-add-active')}
          >
            <Plus className="w-4 h-4" />
            {selected.size === 0 ? 'Select stores' : 'Add store'}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="store-panel" role="listbox" aria-label="Select stores">
          <div className="store-panel-header">
            <span className="store-panel-title">Select stores</span>
            <div className="store-panel-actions">
              <span className={cn('store-panel-count', selected.size >= MAX_STORES && 'store-panel-count-limit')}>
                {selected.size}/{MAX_STORES}
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="store-panel-clear"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="store-panel-list">
            {STORES.map((store) => {
              const isSelected = selected.has(store.id);
              const atLimit = selected.size >= MAX_STORES && !isSelected;
              return (
                <button
                  key={store.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleStore(store.id)}
                  disabled={atLimit}
                  className={cn(
                    'store-panel-option',
                    isSelected && 'store-panel-option-selected',
                    atLimit && 'store-panel-option-disabled'
                  )}
                >
                  <span
                    className={cn(
                      'store-check',
                      isSelected && 'store-check-selected'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </span>
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="store-option-logo"
                  />
                  <span className="store-option-name">{store.name}</span>
                </button>
              );
            })}
          </div>

          <div className="store-panel-footer">
            Searching opens up to 3 stores in new tabs
          </div>
        </div>
      )}
    </div>
  );
}
