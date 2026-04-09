import { type SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => {
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm appearance-none cursor-pointer',
              'bg-transparent',
              'border border-zinc-200 dark:border-white/10',
              'text-zinc-900 dark:text-zinc-100',
              'focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-400 dark:focus:border-green-400/60',
              'transition-all duration-200'
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value} className="bg-white dark:bg-zinc-800">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
