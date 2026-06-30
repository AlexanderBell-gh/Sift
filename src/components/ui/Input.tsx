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
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl text-sm',
            'bg-white/5',
            'border border-white/10',
            'text-white',
            'placeholder:text-zinc-500',
            'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50',
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
