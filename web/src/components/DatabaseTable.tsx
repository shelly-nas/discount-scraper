import React, { useState } from 'react';
import { ProductWithDiscount } from '../types';
import { format, isValid, parseISO } from 'date-fns';
import './DatabaseTable.css';

interface DatabaseTableProps {
  data: ProductWithDiscount[];
  columnFilters: Record<string, string>;
  onColumnFilterChange: (column: string, value: string) => void;
}

const DatabaseTable: React.FC<DatabaseTableProps> = ({ 
  data,
  columnFilters,
  onColumnFilterChange 
}) => {
  const [showColumnFilters, setShowColumnFilters] = useState<string[]>([]);

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, 'MMM dd, yyyy');
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number) => {
    return `€${price.toFixed(2)}`;
  };

  const toggleColumnFilter = (column: string) => {
    setShowColumnFilters(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const columns = [
    { key: 'discount.expire_date', label: 'Expire Date', width: '140px' },
    { key: 'category', label: 'Category', width: '180px' },
    { key: 'name', label: 'Product Name', width: 'auto' },
    { key: 'supermarket', label: 'Supermarket', width: '140px' },
    { key: 'discount.discount_price', label: 'Discount Price', width: '140px' },
    { key: 'discount.original_price', label: 'Original Price', width: '140px' },
    { key: 'discount.special_discount', label: 'Special Discount', width: '160px' },
  ];

  const getCellValue = (item: ProductWithDiscount, columnKey: string) => {
    if (columnKey === 'discount.expire_date') {
      return formatDate(item.discount.expire_date);
    } else if (columnKey === 'category') {
      return item.category;
    } else if (columnKey === 'name') {
      return item.name;
    } else if (columnKey === 'supermarket') {
      return item.supermarket;
    } else if (columnKey === 'discount.discount_price') {
      return formatPrice(item.discount.discount_price);
    } else if (columnKey === 'discount.original_price') {
      return formatPrice(item.discount.original_price);
    } else if (columnKey === 'discount.special_discount') {
      return item.discount.special_discount || '—';
    }
    return '—';
  };

  return (
    <div className="database-table-wrapper">
      <div className="database-table-scroll">
        <table className="database-table">
          <thead>
            <tr className="table-header-row">
              {columns.map((column) => (
                <th 
                  key={column.key} 
                  className="table-header-cell"
                  style={{ width: column.width }}
                >
                  <div className="header-content">
                    <span className="header-label">{column.label}</span>
                    <button
                      className="filter-toggle-button"
                      onClick={() => toggleColumnFilter(column.key)}
                      title="Filter column"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path
                          d="M2 3.5H12M4 7H10M6 10.5H8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  {showColumnFilters.includes(column.key) && (
                    <div className="column-filter">
                      <input
                        type="text"
                        className="column-filter-input"
                        placeholder={`Filter ${column.label.toLowerCase()}...`}
                        value={columnFilters[column.key] || ''}
                        onChange={(e) => onColumnFilterChange(column.key, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="empty-state">
                  <div className="empty-content">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <path
                        d="M40 18V38C40 39.1046 39.1046 40 38 40H10C8.89543 40 8 39.1046 8 38V10C8 8.89543 8.89543 8 10 8H30"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M16 24H32M16 32H24"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <p className="empty-text">No discounts found</p>
                    <p className="empty-subtext">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.id} className="table-row">
                  {columns.map((column) => (
                    <td key={column.key} className="table-cell">
                      {getCellValue(item, column.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DatabaseTable;
