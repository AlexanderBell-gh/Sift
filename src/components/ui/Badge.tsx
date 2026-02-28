import { cn } from '../../lib/utils';

interface BadgeProps {
  category: string;
  icon?: string;
}

const categoryStyles: Record<string, string> = {
  dairy: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  snacks: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  beverages: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  produce: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  meat: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  frozen: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  other: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
};

const categoryIcons: Record<string, string> = {
  dairy: '🥛',
  snacks: '🍿',
  beverages: '🥤',
  produce: '🥬',
  meat: '🥩',
  frozen: '🧊',
  other: '📦',
};

export function Badge({ category, icon }: BadgeProps) {
  const style = categoryStyles[category] || categoryStyles.other;
  const iconChar = icon || categoryIcons[category] || '📦';

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', style)}>
      {iconChar} {category}
    </span>
  );
}
