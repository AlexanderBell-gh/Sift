import { cn } from '../../lib/utils';

interface FilterPanelProps {
  title: string;
  align?: 'left' | 'right';
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function FilterPanel({ title, align = 'left', actions, children }: FilterPanelProps) {
  return (
    <div
      className={cn('filter-panel', align === 'right' && 'filter-panel-right')}
      role="listbox"
      aria-label={title}
    >
      <div className="filter-panel-header">
        <span className="filter-panel-title">{title}</span>
        {actions && <div className="filter-panel-actions">{actions}</div>}
      </div>
      <div className="filter-panel-list">{children}</div>
    </div>
  );
}
