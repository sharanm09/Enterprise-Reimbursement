import { applySearchFilter, applyStatusFilter, applyDateRangeFilter, applyAllFilters } from '../../utils/filterUtils';

describe('filterUtils', () => {
  const mockItems = [
    { id: 1, name: 'Test Item 1', code: 'T001', description: 'Description 1', status: 'active', created_at: '2024-01-01' },
    { id: 2, name: 'Test Item 2', code: 'T002', description: 'Description 2', status: 'inactive', created_at: '2024-02-01' },
    { id: 3, name: 'Another Item', code: 'A001', description: 'Another desc', status: 'active', created_at: '2024-03-01' }
  ];

  describe('applySearchFilter', () => {
    it('should filter items by search query', () => {
      const result = applySearchFilter(mockItems, 'Test');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Item 1');
    });

    it('should return all items when search is empty', () => {
      const result = applySearchFilter(mockItems, '');
      expect(result).toHaveLength(3);
    });

    it('should be case insensitive', () => {
      const result = applySearchFilter(mockItems, 'test');
      expect(result).toHaveLength(2);
    });
  });

  describe('applyStatusFilter', () => {
    it('should filter by status filter', () => {
      const result = applyStatusFilter(mockItems, 'active', []);
      expect(result).toHaveLength(2);
    });

    it('should filter by selected statuses', () => {
      const result = applyStatusFilter(mockItems, 'all', ['active']);
      expect(result).toHaveLength(2);
    });

    it('should return all items when filter is all', () => {
      const result = applyStatusFilter(mockItems, 'all', []);
      expect(result).toHaveLength(3);
    });
  });

  describe('applyDateRangeFilter', () => {
    it('should filter by start date', () => {
      const result = applyDateRangeFilter(mockItems, '2024-02-01', '');
      expect(result).toHaveLength(2);
    });

    it('should filter by end date', () => {
      const result = applyDateRangeFilter(mockItems, '', '2024-02-01');
      expect(result).toHaveLength(2);
    });

    it('should filter by date range', () => {
      const result = applyDateRangeFilter(mockItems, '2024-01-15', '2024-02-15');
      expect(result).toHaveLength(1);
    });
  });

  describe('applyAllFilters', () => {
    it('should apply all filters together', () => {
      const filters = {
        search: 'Test',
        searchFields: ['name', 'code'],
        statusFilter: 'active',
        selectedStatuses: [],
        dateRangeStart: '',
        dateRangeEnd: ''
      };
      const result = applyAllFilters(mockItems, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Item 1');
    });
  });
});


