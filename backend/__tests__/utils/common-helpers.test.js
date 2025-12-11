const {
  buildWhereClause,
  buildDateFilter,
  parseSearchParam,
  validateRequiredFields,
  buildPagination
} = require('../../utils/common-helpers');

describe('Common Helpers', () => {
  describe('buildWhereClause', () => {
    it('should build WHERE clause with conditions', () => {
      const result = buildWhereClause({ status: 'active', name: 'Test' });
      expect(result.whereClause).toContain('WHERE');
      expect(result.params).toEqual(['active', 'Test']);
    });

    it('should handle empty conditions', () => {
      const result = buildWhereClause({});
      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
    });

    it('should ignore null/undefined values', () => {
      const result = buildWhereClause({ status: 'active', name: null, code: undefined });
      expect(result.params).toEqual(['active']);
    });

    it('should use param offset', () => {
      const result = buildWhereClause({ status: 'active' }, 5);
      expect(result.whereClause).toContain('$6');
    });
  });

  describe('buildDateFilter', () => {
    it('should build date filter with start and end dates', () => {
      const result = buildDateFilter('2024-01-01', '2024-12-31');
      expect(result.filter).toContain('>=');
      expect(result.filter).toContain('<=');
      expect(result.params).toHaveLength(2);
    });

    it('should handle only start date', () => {
      const result = buildDateFilter('2024-01-01', null);
      expect(result.filter).toContain('>=');
      expect(result.params).toHaveLength(1);
    });

    it('should handle custom date field', () => {
      const result = buildDateFilter('2024-01-01', '2024-12-31', 'updated_at');
      expect(result.filter).toContain('updated_at');
    });
  });

  describe('parseSearchParam', () => {
    it('should parse valid string', () => {
      expect(parseSearchParam('test')).toBe('test');
    });

    it('should return null for invalid input', () => {
      expect(parseSearchParam(null)).toBeNull();
      expect(parseSearchParam(undefined)).toBeNull();
      expect(parseSearchParam(123)).toBeNull();
    });
  });

  describe('validateRequiredFields', () => {
    it('should return errors for missing fields', () => {
      const errors = validateRequiredFields({ name: 'Test' }, ['name', 'code']);
      expect(errors).toContain('code is required');
    });

    it('should return empty array when all fields present', () => {
      const errors = validateRequiredFields({ name: 'Test', code: 'T001' }, ['name', 'code']);
      expect(errors).toHaveLength(0);
    });

    it('should handle empty strings', () => {
      const errors = validateRequiredFields({ name: '   ', code: 'T001' }, ['name', 'code']);
      expect(errors).toContain('name is required');
    });
  });

  describe('buildPagination', () => {
    it('should build pagination with default values', () => {
      const result = buildPagination({});
      expect(result.limit).toBe(50);
      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    it('should use provided query parameters', () => {
      const result = buildPagination({ limit: '20', page: '2' });
      expect(result.limit).toBe(20);
      expect(result.page).toBe(2);
      expect(result.offset).toBe(20);
    });

    it('should enforce maximum limit', () => {
      const result = buildPagination({ limit: '200' });
      expect(result.limit).toBe(100);
    });

    it('should enforce minimum page', () => {
      const result = buildPagination({ page: '0' });
      expect(result.page).toBe(1);
    });
  });
});



