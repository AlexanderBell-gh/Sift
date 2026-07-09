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
          <label className="block mb-1.5 uppercase" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.05em' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-3 rounded-xl text-sm',
            'border',
            'placeholder:opacity-50',
            'focus:outline-none',
            'transition-all duration-200',
            error && 'border-[var(--danger)]',
            className
          )}
          style={{
            backgroundColor: 'var(--bg)',
            borderColor: error ? 'var(--danger)' : 'var(--border)',
            color: 'var(--text)',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--primary)';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px rgba(220, 38, 38, 0.12)'
              : '0 0 0 3px rgba(255, 87, 1, 0.12)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--border)';
            e.currentTarget.style.boxShadow = 'none';
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
