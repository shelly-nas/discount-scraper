import React from 'react';
import './FilterBar.css';

interface FilterBarProps {
  filters: Record<string, string>;
  onFilterChange: (column: string, value: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange }) => {
  const filterConfigs = [
    { key: 'discount.expire_date', label: 'Expire Date' },
    { key: 'category', label: 'Category' },
    { key: 'name', label: 'Product Name' }
  ];

  return (
    <div>
      {filterConfigs.map(({ key, label }) => (
        <div key={key} className="filter-item">
          <label className="filter-label">{label}</label>
          <input
            type="text"
            className="filter-input"
            placeholder={`Filter ${label.toLowerCase()}...`}
            value={filters[key] || ''}
            onChange={(e) => onFilterChange(key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
};

export default FilterBar;
