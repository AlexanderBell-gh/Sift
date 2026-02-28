import { Plus } from 'lucide-react';
import type { Category } from '../types';

interface CategoryFilterProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
  onAddCategory: () => void;
}

export function CategoryFilter({
  categories,
  activeCategory,
  onCategoryChange,
  onAddCategory,
}: CategoryFilterProps) {
  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => onCategoryChange('all')}
            className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`category-chip ${activeCategory === category.id ? 'active' : ''}`}
            >
              {category.icon} {category.name}
            </button>
          ))}
          <button
            onClick={onAddCategory}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>
    </nav>
  );
}
