import { cn } from '../../lib/utils';

interface BadgeProps {
  category: string;
  icon?: string;
}

const categoryStyles: Record<string, string> = {
  chilled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  snacks: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  beverages: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  produce: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  frozen: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  bakery: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  pantry: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  condiments: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  other: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
};

const categoryIcons: Record<string, string> = {
  chilled: '🥛',
  snacks: '🍿',
  beverages: '🥤',
  produce: '🥬',
  frozen: '🧊',
  bakery: '🥖',
  pantry: '🥫',
  condiments: '🧂',
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
