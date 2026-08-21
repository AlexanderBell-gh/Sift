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
          'px-4 py-2 rounded-xl font-medium transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-gray-900',
          {
            'bg-accent text-white hover:bg-[color-mix(in_oklab,var(--accent)_88%,black)] hover:shadow-[0_4px_12px_rgba(255,87,1,0.35)] shadow-[0_1px_2px_rgba(255,87,1,0.3)]': variant === 'primary',
            'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]': variant === 'secondary',
            'text-red-500 hover:bg-red-500/10 border border-red-500/20 hover:bg-[color-mix(in_oklab,var(--danger)_88%,black)] hover:shadow-[0_4px_12px_rgba(220,38,38,0.35)]': variant === 'danger',
            'text-zinc-400 hover:text-white hover:bg-white/10 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)]': variant === 'ghost',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
