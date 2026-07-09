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
          <label className="block font-mono text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl text-sm',
            'border',
            'placeholder:opacity-50',
            'focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]',
            'transition-all duration-200',
            error && 'border-[var(--danger)] focus:ring-[var(--danger)]/20 focus:border-[var(--danger)]',
            className
          )}
          style={{
            backgroundColor: 'var(--bg)',
            borderColor: error ? 'var(--danger)' : 'var(--border)',
            color: 'var(--text)',
          }}
          {...props}
        />
        {error && (
          <p className="text-xs mt-1.5" style={{ color: 'var(--danger)' }}>{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
