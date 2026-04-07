import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'px-4 py-2 rounded-lg font-medium transition-all duration-200 btn-press',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:ring-offset-2 dark:focus:ring-offset-zinc-950',
          {
            'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-[0_1px_2px_rgba(99,102,241,0.3)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)]': variant === 'primary',
            'border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/10': variant === 'secondary',
            'text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/15 border border-red-200/50 dark:border-red-500/20': variant === 'danger',
            'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10': variant === 'ghost',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
