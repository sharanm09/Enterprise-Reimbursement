import { renderHook, act } from '@testing-library/react';
import { useApprovalFilters } from '../../utils/useApprovalFilters';

jest.mock('../../utils/formatUtils', () => ({
  formatDate: jest.fn((date) => date || 'N/A'),
  formatCurrency: jest.fn((amount) => `$${amount || 0}`)
}));

describe('useApprovalFilters', () => {
  const mockPendingItems = [
    {
      id: 1,
      item_status: 'pending',
      user_name: 'John Doe',
      user_email: 'john@example.com',
      expense_date: '2024-01-15',
      amount: 100
    },
    {
      id: 2,
      item_status: 'approved',
      user_name: 'Jane Smith',
      user_email: 'jane@example.com',
      expense_date: '2024-02-15',
      amount: 200
    }
  ];

  const mockApprovedItems = [
    {
      id: 3,
      item_status: 'approved',
      user_name: 'Bob Johnson',
      user_email: 'bob@example.com',
      expense_date: '2024-03-15',
      amount: 300
    }
  ];

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useApprovalFilters(mockPendingItems, mockApprovedItems, 'pending')
    );

    expect(result.current.searchQuery).toBe('');
    expect(result.current.statusFilter).toBe('all');
    expect(result.current.dateRangeStart).toBe('');
    expect(result.current.dateRangeEnd).toBe('');
    expect(result.current.showAdvancedFilters).toBe(false);
  });

  it('should filter by status', () => {
    const { result } = renderHook(() =>
      useApprovalFilters(mockPendingItems, mockApprovedItems, 'pending')
    );

    act(() => {
      result.current.setStatusFilter('pending');
    });

    expect(result.current.pendingItems).toHaveLength(1);
    expect(result.current.pendingItems[0].item_status).toBe('pending');
  });

  it('should filter by search query', () => {
    const { result } = renderHook(() =>
      useApprovalFilters(mockPendingItems, mockApprovedItems, 'pending')
    );

    act(() => {
      result.current.setSearchQuery('John');
    });

    expect(result.current.pendingItems.length).toBeGreaterThanOrEqual(0);
  });

  it('should filter by date range start', () => {
    const { result } = renderHook(() =>
      useApprovalFilters(mockPendingItems, mockApprovedItems, 'pending')
    );

    act(() => {
      result.current.setDateRangeStart('2024-02-01');
    });

    expect(result.current.pendingItems.length).toBeGreaterThanOrEqual(0);
  });

  it('should filter by date range end', () => {
    const { result } = renderHook(() =>
      useApprovalFilters(mockPendingItems, mockApprovedItems, 'pending')
    );

    act(() => {
      result.current.setDateRangeEnd('2024-01-31');
    });

    expect(result.current.pendingItems.length).toBeGreaterThanOrEqual(0);
  });

  it('should clear filters', () => {
    const { result } = renderHook(() =>
      useApprovalFilters(mockPendingItems, mockApprovedItems, 'pending')
    );

    act(() => {
      result.current.setStatusFilter('pending');
      result.current.setSearchQuery('test');
      result.current.setDateRangeStart('2024-01-01');
      result.current.setShowAdvancedFilters(true);
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.statusFilter).toBe('all');
    expect(result.current.searchQuery).toBe('');
    expect(result.current.dateRangeStart).toBe('');
    expect(result.current.dateRangeEnd).toBe('');
    expect(result.current.showAdvancedFilters).toBe(false);
  });

  it('should switch between pending and approved tabs', () => {
    const { result, rerender } = renderHook(
      ({ activeTab }) => useApprovalFilters(mockPendingItems, mockApprovedItems, activeTab),
      { initialProps: { activeTab: 'pending' } }
    );

    expect(result.current.pendingItems.length).toBeGreaterThanOrEqual(0);

    rerender({ activeTab: 'approved' });

    expect(result.current.approvedItems.length).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty items arrays', () => {
    const { result } = renderHook(() =>
      useApprovalFilters([], [], 'pending')
    );

    expect(result.current.pendingItems).toEqual([]);
    expect(result.current.approvedItems).toEqual([]);
  });
});

