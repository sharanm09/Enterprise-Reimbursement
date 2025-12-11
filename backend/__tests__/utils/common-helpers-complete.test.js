const {
  buildWhereClause,
  buildDateFilter,
  parseSearchParam,
  handleDatabaseError,
  validateRequiredFields,
  buildPagination
} = require('../../utils/common-helpers');
const logger = require('../../utils/logger');

jest.mock('../../utils/logger', () => ({
  error: jest.fn()
}));

describe('Common Helpers Complete Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildWhereClause', () => {
    test('should build WHERE clause with multiple conditions', () => {
      const conditions = {
        status: 'active',
        department_id: 1,
        name: 'Test'
      };
      const result = buildWhereClause(conditions, 0);

      expect(result.whereClause).toContain('WHERE');
      expect(result.whereClause).toContain('status = $1');
      expect(result.whereClause).toContain('department_id = $2');
      expect(result.whereClause).toContain('name = $3');
      expect(result.params).toEqual(['active', 1, 'Test']);
    });

    test('should handle empty conditions', () => {
      const result = buildWhereClause({}, 0);

      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
    });

    test('should handle null and undefined values', () => {
      const conditions = {
        status: 'active',
        department_id: null,
        name: undefined,
        code: ''
      };
      const result = buildWhereClause(conditions, 0);

      expect(result.whereClause).toContain('status = $1');
      expect(result.params).toEqual(['active']);
    });

    test('should handle paramOffset', () => {
      const conditions = {
        status: 'active'
      };
      const result = buildWhereClause(conditions, 5);

      expect(result.whereClause).toContain('$6');
      expect(result.params).toEqual(['active']);
    });
  });

  describe('buildDateFilter', () => {
    test('should build date filter with start and end dates', () => {
      const result = buildDateFilter('2024-01-01', '2024-01-31', 'created_at', 0);

      expect(result.filter).toContain('created_at >= $1');
      expect(result.filter).toContain('created_at <= $2');
      expect(result.params).toHaveLength(2);
    });

    test('should handle only start date', () => {
      const result = buildDateFilter('2024-01-01', null, 'created_at', 0);

      expect(result.filter).toContain('created_at >= $1');
      expect(result.filter).not.toContain('<=');
      expect(result.params).toHaveLength(1);
    });

    test('should handle only end date', () => {
      const result = buildDateFilter(null, '2024-01-31', 'created_at', 0);

      expect(result.filter).not.toContain('>=');
      expect(result.filter).toContain('created_at <= $1');
      expect(result.params).toHaveLength(1);
    });

    test('should set end date to end of day', () => {
      const result = buildDateFilter(null, '2024-01-31', 'created_at', 0);

      const endDate = new Date(result.params[0]);
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);
    });

    test('should handle paramOffset', () => {
      const result = buildDateFilter('2024-01-01', '2024-01-31', 'created_at', 3);

      expect(result.filter).toContain('$4');
      expect(result.filter).toContain('$5');
    });

    test('should use default dateField', () => {
      const result = buildDateFilter('2024-01-01', null);

      expect(result.filter).toContain('created_at >=');
    });
  });

  describe('parseSearchParam', () => {
    test('should parse valid string', () => {
      expect(parseSearchParam('test')).toBe('test');
    });

    test('should return null for null input', () => {
      expect(parseSearchParam(null)).toBeNull();
    });

    test('should return null for undefined input', () => {
      expect(parseSearchParam(undefined)).toBeNull();
    });

    test('should return null for non-string input', () => {
      expect(parseSearchParam(123)).toBeNull();
      expect(parseSearchParam({})).toBeNull();
      expect(parseSearchParam([])).toBeNull();
    });

    test('should convert to string', () => {
      expect(parseSearchParam('123')).toBe('123');
    });
  });

  describe('handleDatabaseError', () => {
    let mockRes;

    beforeEach(() => {
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    test('should handle unique constraint violation', () => {
      const error = { code: '23505' };
      handleDatabaseError(error, mockRes, 'Department', 'create');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Department code already exists'
      });
    });

    test('should handle foreign key constraint violation', () => {
      const error = { code: '23503' };
      handleDatabaseError(error, mockRes, 'Cost Center', 'create');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid reference for Cost Center'
      });
    });

    test('should handle generic database error', () => {
      const error = { code: '42P01', message: 'Table does not exist' };
      handleDatabaseError(error, mockRes, 'User', 'fetch');

      expect(logger.error).toHaveBeenCalledWith('Error fetch User:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to fetch User',
        error: 'Table does not exist'
      });
    });
  });

  describe('validateRequiredFields', () => {
    test('should validate all required fields present', () => {
      const data = {
        name: 'Test',
        code: 'T001',
        description: 'Test description'
      };
      const errors = validateRequiredFields(data, ['name', 'code']);

      expect(errors).toHaveLength(0);
    });

    test('should return errors for missing fields', () => {
      const data = {
        name: 'Test'
      };
      const errors = validateRequiredFields(data, ['name', 'code', 'description']);

      expect(errors).toContain('code is required');
      expect(errors).toContain('description is required');
      expect(errors).not.toContain('name is required');
    });

    test('should return error for empty string', () => {
      const data = {
        name: '   ',
        code: 'T001'
      };
      const errors = validateRequiredFields(data, ['name', 'code']);

      expect(errors).toContain('name is required');
      expect(errors).not.toContain('code is required');
    });

    test('should return error for null values', () => {
      const data = {
        name: null,
        code: 'T001'
      };
      const errors = validateRequiredFields(data, ['name', 'code']);

      expect(errors).toContain('name is required');
    });

    test('should return error for undefined values', () => {
      const data = {
        code: 'T001'
      };
      const errors = validateRequiredFields(data, ['name', 'code']);

      expect(errors).toContain('name is required');
    });
  });

  describe('buildPagination', () => {
    test('should build pagination with default values', () => {
      const result = buildPagination({});

      expect(result.limit).toBe(50);
      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    test('should build pagination with custom values', () => {
      const result = buildPagination({ limit: '20', page: '3' });

      expect(result.limit).toBe(20);
      expect(result.page).toBe(3);
      expect(result.offset).toBe(40);
    });

    test('should cap limit at 100', () => {
      const result = buildPagination({ limit: '200' });

      expect(result.limit).toBe(100);
    });

    test('should ensure page is at least 1', () => {
      const result = buildPagination({ page: '0' });

      expect(result.page).toBe(1);
      expect(result.offset).toBe(0);
    });

    test('should handle negative page', () => {
      const result = buildPagination({ page: '-5' });

      expect(result.page).toBe(1);
    });

    test('should handle invalid limit', () => {
      const result = buildPagination({ limit: 'invalid' });

      expect(result.limit).toBe(50);
    });

    test('should handle custom defaultLimit', () => {
      const result = buildPagination({}, 25);

      expect(result.limit).toBe(25);
    });
  });
});

