const {
  parseSearchParam,
  validateNameAndCode,
  handleDatabaseError
} = require('../../routes/masterData-helpers');
const logger = require('../../utils/logger');

jest.mock('../../utils/logger', () => ({
  error: jest.fn()
}));

describe('Master Data Helpers', () => {
  describe('parseSearchParam', () => {
    test('should return string when valid string is provided', () => {
      expect(parseSearchParam('test')).toBe('test');
      expect(parseSearchParam('search term')).toBe('search term');
    });

    test('should return null when null is provided', () => {
      expect(parseSearchParam(null)).toBeNull();
    });

    test('should return null when undefined is provided', () => {
      expect(parseSearchParam(undefined)).toBeNull();
    });

    test('should return null when non-string is provided', () => {
      expect(parseSearchParam(123)).toBeNull();
      expect(parseSearchParam({})).toBeNull();
      expect(parseSearchParam([])).toBeNull();
    });
  });

  describe('validateNameAndCode', () => {
    test('should return empty array when name and code are valid', () => {
      const errors = validateNameAndCode('Test Name', 'TEST_CODE');
      expect(errors).toEqual([]);
    });

    test('should return error when name is missing', () => {
      const errors = validateNameAndCode('', 'TEST_CODE');
      expect(errors).toContain('Name is required');
    });

    test('should return error when code is missing', () => {
      const errors = validateNameAndCode('Test Name', '');
      expect(errors).toContain('Code is required');
    });

    test('should return errors for both missing name and code', () => {
      const errors = validateNameAndCode('', '');
      expect(errors).toContain('Name is required');
      expect(errors).toContain('Code is required');
    });

    test('should validate additional fields', () => {
      const errors = validateNameAndCode('Test', 'CODE', { department_id: '' });
      expect(errors).toContain('department_id is required');
    });

    test('should not error on valid additional fields', () => {
      const errors = validateNameAndCode('Test', 'CODE', { department_id: '123' });
      expect(errors).toEqual([]);
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

    test('should handle duplicate key error (23505)', () => {
      const error = { code: '23505' };
      handleDatabaseError(error, mockRes, 'Department', 'create');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Department code already exists'
      });
    });

    test('should handle foreign key violation (23503)', () => {
      const error = { code: '23503' };
      handleDatabaseError(error, mockRes, 'Cost Center', 'create');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid reference for Cost Center'
      });
    });

    test('should handle generic database error', () => {
      const error = { code: 'OTHER', message: 'Generic error' };
      handleDatabaseError(error, mockRes, 'Project', 'update');

      expect(logger.error).toHaveBeenCalledWith('Error update Project:', error);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to update Project',
        error: 'Generic error'
      });
    });
  });
});


