import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FilterOptionProps {
  selected: boolean;
  onClick: () => void;
  children?: React.ReactNode;
  label: string;
}

export default function FilterOption({ selected, onClick, children, label }: FilterOptionProps) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className={cn('filter-option', selected && 'filter-option-selected')}
    >
      <span className={cn('filter-check', selected && 'filter-check-selected')}>
        {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
      {children}
      <span className="filter-option-name">{label}</span>
    </button>
  );
}
