import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface FilterTriggerProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  expanded?: boolean;
  onClick: () => void;
  className?: string;
}

export default function FilterTrigger({
  icon: Icon,
  label,
  active = false,
  expanded = false,
  onClick,
  className,
}: FilterTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="listbox"
      aria-expanded={expanded}
      className={cn('filter-trigger', active && 'filter-trigger-active', className)}
    >
      <Icon className="filter-trigger-icon" />
      <span className="filter-trigger-label">{label}</span>
      <ChevronDown className="filter-chevron" />
    </button>
  );
}
