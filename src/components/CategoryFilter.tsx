import { X } from 'lucide-react';
import type { Category } from '../types';

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
}

export function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
  onDeleteCategory,
}: CategoryFilterProps) {
  return (
    <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => onCategoryChange('all')}
            className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          {categories.map((category) => (
            <div key={category.id} className="relative group">
              <button
                onClick={() => onCategoryChange(category.id)}
                className={`category-chip ${activeCategory === category.id ? 'active' : ''}`}
              >
                {category.icon} {category.name}
              </button>
              {onDeleteCategory && category.id.startsWith('cat_') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCategory(category.id);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
