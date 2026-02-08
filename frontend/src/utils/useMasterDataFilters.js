import { useState, useEffect } from 'react';
import { applyAllFilters } from './filterUtils';

/**
 * Shared hook for master data filtering logic
 */
export const useMasterDataFilters = (allItems, searchFields = ['name', 'code', 'description', 'status']) => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    const filtered = applyAllFilters(allItems, {
      search,
      searchFields,
      statusFilter,
      selectedStatuses,
      dateRangeStart,
      dateRangeEnd
    });
    setItems(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, selectedStatuses, dateRangeStart, dateRangeEnd, allItems]);

  const handleStatusToggle = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setStatusFilter('all');
    setDateRangeStart('');
    setDateRangeEnd('');
    setSearch('');
  };

  return {
    items,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    selectedStatuses,
    handleStatusToggle,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
    showAdvancedFilters,
    setShowAdvancedFilters,
    clearFilters
  };
};

