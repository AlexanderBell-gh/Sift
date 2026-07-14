import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-[var(--success)]" />,
    error: <AlertCircle className="w-5 h-5 text-[var(--danger)]" />,
    info: <Info className="w-5 h-5 text-[var(--primary)]" />,
  };

  const styles = {
    success: 'bg-[var(--success)]/10 border-[var(--success)]/20 text-[var(--success)]',
    error: 'bg-[var(--danger)]/10 border-[var(--danger)]/20 text-[var(--danger)]',
    info: 'bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]',
  };

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-in',
      styles[type]
    )}>
      {icons[type]}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-70">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
