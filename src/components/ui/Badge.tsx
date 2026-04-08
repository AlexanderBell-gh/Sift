import { cn } from '../../lib/utils';

interface BadgeProps {
  category: string;
}

const categoryStyles: Record<string, string> = {
  chilled: 'bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-400/20',
  snacks: 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-400/20',
  beverages: 'bg-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-400/20',
  produce: 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-400/20',
  frozen: 'bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-400/20',
  bakery: 'bg-orange-500/5 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-400/20',
  pantry: 'bg-stone-500/5 text-stone-600 dark:text-stone-400 border-stone-200/50 dark:border-stone-400/20',
  condiments: 'bg-pink-500/5 text-pink-600 dark:text-pink-400 border-pink-200/50 dark:border-pink-400/20',
  other: 'bg-zinc-500/5 text-zinc-600 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-400/20',
};

export function Badge({ category }: BadgeProps) {
  const style = categoryStyles[category] || categoryStyles.other;

  return (
    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors duration-200', style)}>
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}
