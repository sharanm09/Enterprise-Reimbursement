import { useState, useEffect } from 'react';
import { formatDate, formatCurrency } from './formatUtils';

/**
 * Shared hook for approval filtering logic
 */
export const useApprovalFilters = (allPendingItems, allApprovedItems, activeTab) => {
  const [pendingItems, setPendingItems] = useState([]);
  const [approvedItems, setApprovedItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const filterItems = () => {
    const sourceItems = activeTab === 'pending' ? allPendingItems : allApprovedItems;
    let filtered = [...sourceItems];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => {
        const status = item.item_status?.toLowerCase() || '';
        return status.includes(statusFilter.toLowerCase());
      });
    }

    // Date range filter
    if (dateRangeStart) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.expense_date || item.created_at);
        return itemDate >= new Date(dateRangeStart);
      });
    }
    if (dateRangeEnd) {
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.expense_date || item.created_at);
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);
        return itemDate <= endDate;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableText = [
          item.user_name,
          item.user_email,
          item.expense_type,
          item.expense_category_name,
          item.department_name,
          item.cost_center_name,
          item.project_name,
          item.item_status,
          formatCurrency(item.amount || 0),
          formatDate(item.expense_date)
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }

    if (activeTab === 'pending') {
      setPendingItems(filtered);
    } else {
      setApprovedItems(filtered);
    }
  };

  useEffect(() => {
    filterItems();
  }, [searchQuery, statusFilter, dateRangeStart, dateRangeEnd, activeTab, allPendingItems, allApprovedItems]);

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setShowAdvancedFilters(false);
  };

  return {
    pendingItems,
    approvedItems,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
    showAdvancedFilters,
    setShowAdvancedFilters,
    clearFilters
  };
};

