import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-lg text-sm',
            'bg-transparent',
            'border border-zinc-200 dark:border-white/10',
            'text-zinc-900 dark:text-zinc-100',
            'placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 dark:focus:border-indigo-400/60',
            'transition-all duration-200',
            error && 'border-red-400 focus:ring-red-500/40 focus:border-red-400',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-red-500 text-xs mt-1.5">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
