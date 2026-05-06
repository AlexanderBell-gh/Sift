import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface PaginationProps {
  total: number;
  limit?: number;
  page?: number;
  onPageChange?: (page: number) => void;
}

export function Pagination({ total, limit = 20, page: externalPage, onPageChange }: PaginationProps) {
  const hasExternal = externalPage !== undefined && onPageChange !== undefined;
  
  const totalPages = Math.ceil(total / limit) || 1;
  const page = externalPage || 1;
  
  const showRange = {
    start: (page - 1) * limit + 1,
    end: Math.min(page * limit, total),
    total,
  };

  const goToPrev = () => {
    if (hasExternal) {
      onPageChange(Math.max(1, page - 1));
    }
  };

  const goToNext = () => {
    if (hasExternal) {
      onPageChange(Math.min(totalPages, page + 1));
    }
  };

  const canGoPrev = page === 1;
  const canGoNext = page === totalPages;

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-zinc-500 dark:text-zinc-400">
      <p>
        {showRange.start} to {showRange.end} of {showRange.total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={goToPrev} disabled={canGoPrev}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button variant="ghost" onClick={goToNext} disabled={canGoNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}