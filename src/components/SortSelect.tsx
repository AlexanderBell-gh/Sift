import { Select } from './ui/Select';

type SortOption = 'newest' | 'oldest' | 'store' | 'name-asc' | 'price-low' | 'price-high';

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const options: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest Added' },
  { value: 'oldest', label: 'Oldest Added' },
  { value: 'store', label: 'Store (A-Z)' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'price-low', label: 'Price (Low to High)' },
  { value: 'price-high', label: 'Price (High to Low)' },
];

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      options={options}
      className="w-48"
    />
  );
}
