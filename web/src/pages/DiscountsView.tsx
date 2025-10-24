import React, { useState, useEffect, useMemo } from 'react';
import { ProductWithDiscount } from '../types';
import DatabaseTable from '../components/DatabaseTable';
import SearchBar from '../components/SearchBar';
import { discountService } from '../services/api';
import './DiscountsView.css';

const DiscountsView: React.FC = () => {
  const [data, setData] = useState<ProductWithDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    'discount.expire_date': '',
    'category': '',
    'name': ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const discounts = await discountService.getAllDiscounts();
      setData(discounts);
    } catch (err) {
      setError('Failed to load discounts. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on all filters
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply global search across all columns
    if (globalSearch) {
      const searchLower = globalSearch.toLowerCase();
      filtered = filtered.filter(item => {
        return (
          item.name?.toLowerCase().includes(searchLower) ||
          item.category?.toLowerCase().includes(searchLower) ||
          item.supermarket?.toLowerCase().includes(searchLower) ||
          item.discount?.discount_price?.toString().includes(searchLower) ||
          item.discount?.original_price?.toString().includes(searchLower) ||
          item.discount?.special_discount?.toLowerCase().includes(searchLower) ||
          item.discount?.expire_date?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply column-specific filters
    Object.entries(columnFilters).forEach(([column, value]) => {
      if (value) {
        const searchLower = value.toLowerCase();
        filtered = filtered.filter(item => {
          if (column === 'discount.expire_date') {
            return item.discount?.expire_date?.toLowerCase().includes(searchLower);
          } else if (column === 'category') {
            return item.category?.toLowerCase().includes(searchLower);
          } else if (column === 'name') {
            return item.name?.toLowerCase().includes(searchLower);
          } else if (column === 'supermarket') {
            return item.supermarket?.toLowerCase().includes(searchLower);
          } else if (column === 'discount.discount_price') {
            return item.discount?.discount_price?.toString().includes(searchLower);
          } else if (column === 'discount.original_price') {
            return item.discount?.original_price?.toString().includes(searchLower);
          } else if (column === 'discount.special_discount') {
            return item.discount?.special_discount?.toLowerCase().includes(searchLower);
          }
          return true;
        });
      }
    });

    // Sort by expire date (ascending), then category, then name
    filtered.sort((a, b) => {
      // First sort by expire date
      const dateA = new Date(a.discount.expire_date).getTime();
      const dateB = new Date(b.discount.expire_date).getTime();
      if (dateA !== dateB) return dateA - dateB;

      // Then by category
      const categoryCompare = a.category.localeCompare(b.category);
      if (categoryCompare !== 0) return categoryCompare;

      // Finally by name
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [data, globalSearch, columnFilters]);

  const handleColumnFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const handleClearAllFilters = () => {
    setGlobalSearch('');
    setColumnFilters({
      'discount.expire_date': '',
      'category': '',
      'name': ''
    });
  };

  return (
    <div className="discounts-view">
      <div className="discounts-header">
        <h1 className="discounts-title">Discount Database</h1>
        <div className="discounts-subtitle">
          {filteredData.length} {filteredData.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      <div className="discounts-toolbar">
        <SearchBar
          value={globalSearch}
          onChange={setGlobalSearch}
          onClear={handleClearAllFilters}
          placeholder="Search in all columns..."
        />
      </div>

      <div className="discounts-content">
        {loading ? (
          <div className="discounts-loading">
            <div className="loading-spinner"></div>
            <p>Loading discounts...</p>
          </div>
        ) : error ? (
          <div className="discounts-error">
            <p>{error}</p>
            <button onClick={loadData} className="retry-button">
              Retry
            </button>
          </div>
        ) : (
          <DatabaseTable
            data={filteredData}
            columnFilters={columnFilters}
            onColumnFilterChange={handleColumnFilterChange}
          />
        )}
      </div>
    </div>
  );
};

export default DiscountsView;
