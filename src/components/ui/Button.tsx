import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'px-4 py-2 rounded-lg font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2',
          {
            'bg-sky-500 text-white hover:opacity-90': variant === 'primary',
            'border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800': variant === 'secondary',
            'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20': variant === 'danger',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
