import { useId, type InputHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, suffix, ...props }, ref) => {
    const inputId = useId();
    const errorId = `${inputId}-error`;
    return (
      <div className="w-full">
        {label && (
          <label className="field-label" htmlFor={inputId}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn('form-input', suffix && 'pr-11', error && 'form-input-error', className)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="danger-text text-xs mt-1.5">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';