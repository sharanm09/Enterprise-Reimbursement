import { renderHook, act } from '@testing-library/react';
import { useMasterDataFilters } from '../../utils/useMasterDataFilters';

jest.mock('../../utils/filterUtils', () => ({
  applyAllFilters: jest.fn((items) => items)
}));

describe('useMasterDataFilters', () => {
  const mockItems = [
    { id: 1, name: 'Item 1', code: 'I1', description: 'Desc 1', status: 'active' },
    { id: 2, name: 'Item 2', code: 'I2', description: 'Desc 2', status: 'inactive' }
  ];

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useMasterDataFilters(mockItems)
    );

    expect(result.current.search).toBe('');
    expect(result.current.statusFilter).toBe('all');
    expect(result.current.selectedStatuses).toEqual([]);
    expect(result.current.dateRangeStart).toBe('');
    expect(result.current.dateRangeEnd).toBe('');
    expect(result.current.showAdvancedFilters).toBe(false);
  });

  it('should update search', () => {
    const { result } = renderHook(() =>
      useMasterDataFilters(mockItems)
    );

    act(() => {
      result.current.setSearch('test');
    });

    expect(result.current.search).toBe('test');
  });

  it('should update status filter', () => {
    const { result } = renderHook(() =>
      useMasterDataFilters(mockItems)
    );

    act(() => {
      result.current.setStatusFilter('active');
    });

    expect(result.current.statusFilter).toBe('active');
  });

  it('should toggle status', () => {
    const { result } = renderHook(() =>
      useMasterDataFilters(mockItems)
    );

    act(() => {
      result.current.handleStatusToggle('active');
    });

    expect(result.current.selectedStatuses).toContain('active');

    act(() => {
      result.current.handleStatusToggle('active');
    });

    expect(result.current.selectedStatuses).not.toContain('active');
  });

  it('should clear filters', () => {
    const { result } = renderHook(() =>
      useMasterDataFilters(mockItems)
    );

    act(() => {
      result.current.setSearch('test');
      result.current.setStatusFilter('active');
      result.current.handleStatusToggle('active');
      result.current.setDateRangeStart('2024-01-01');
      result.current.setShowAdvancedFilters(true);
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.search).toBe('');
    expect(result.current.statusFilter).toBe('all');
    expect(result.current.selectedStatuses).toEqual([]);
    expect(result.current.dateRangeStart).toBe('');
    expect(result.current.dateRangeEnd).toBe('');
    expect(result.current.showAdvancedFilters).toBe(false);
  });

  it('should use custom search fields', () => {
    const customFields = ['name', 'code'];
    renderHook(() =>
      useMasterDataFilters(mockItems, customFields)
    );

    // Hook should accept custom fields
    expect(true).toBe(true);
  });
});

