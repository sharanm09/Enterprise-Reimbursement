const {
  parseSearchParam,
  handleDatabaseError,
  validateNameAndCode,
  handleGetWithFilters,
  handleCreate,
  handleUpdate,
  handleSoftDelete,
  checkCanDelete
} = require('../../routes/masterData-helpers');
const { pool } = require('../../config/database');
const logger = require('../../utils/logger');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => ({
  error: jest.fn()
}));

describe('Master Data Helpers Extended', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseSearchParam', () => {
    test('should parse valid string search param', () => {
      expect(parseSearchParam('test')).toBe('test');
    });

    test('should return null for null', () => {
      expect(parseSearchParam(null)).toBeNull();
    });

    test('should return null for undefined', () => {
      expect(parseSearchParam(undefined)).toBeNull();
    });

    test('should return null for non-string', () => {
      expect(parseSearchParam(123)).toBeNull();
      expect(parseSearchParam({})).toBeNull();
    });
  });

  describe('handleDatabaseError', () => {
    test('should handle unique constraint violation', () => {
      const error = { code: '23505', message: 'Duplicate key' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      handleDatabaseError(error, res, 'Department', 'create');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Department code already exists'
      });
    });

    test('should handle foreign key violation', () => {
      const error = { code: '23503', message: 'Foreign key violation' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      handleDatabaseError(error, res, 'Cost center', 'create');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid reference for Cost center'
      });
    });

    test('should handle other database errors', () => {
      const error = { code: '50000', message: 'Database error' };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      handleDatabaseError(error, res, 'Department', 'update');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('validateNameAndCode', () => {
    test('should return empty array for valid data', () => {
      const errors = validateNameAndCode('Test', 'TEST');
      expect(errors).toHaveLength(0);
    });

    test('should return error for missing name', () => {
      const errors = validateNameAndCode('', 'TEST');
      expect(errors).toContain('Name is required');
    });

    test('should return error for missing code', () => {
      const errors = validateNameAndCode('Test', '');
      expect(errors).toContain('Code is required');
    });

    test('should validate additional fields', () => {
      const errors = validateNameAndCode('Test', 'TEST', { department_id: '' });
      expect(errors).toContain('department_id is required');
    });

    test('should handle null additional fields', () => {
      const errors = validateNameAndCode('Test', 'TEST', { department_id: null });
      expect(errors).toContain('department_id is required');
    });
  });

  describe('handleGetWithFilters', () => {
    test('should build query with table alias detection from selectFields', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        selectFields: 'd.*',
        joinClause: 'LEFT JOIN cost_centers cc ON d.id = cc.department_id',
        searchFields: ['name', 'code']
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('d.name'),
        expect.any(Array)
      );
    });

    test('should build query with status filter', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        additionalFilters: { status: 'active' }
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = $1"),
        ['active']
      );
    });

    test('should build query with search filter', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        additionalFilters: { search: 'test' }
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE"),
        expect.arrayContaining(['%test%'])
      );
    });

    test('should build query with additional filters', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('cost_centers', {
        additionalFilters: { department_id: 1 }
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("department_id = $1"),
        [1]
      );
    });

    test('should handle groupBy and orderBy', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        groupBy: 'GROUP BY d.id',
        orderBy: 'ORDER BY d.name ASC'
      });

      const query = pool.query.mock.calls[0][0];
      expect(query).toContain('GROUP BY');
      expect(query).toContain('ORDER BY');
    });
  });

  describe('handleCreate', () => {
    test('should create entity with default returning', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Test', code: 'TEST' }]
      });

      const result = await handleCreate('departments', ['name', 'code'], ['Test', 'TEST']);

      expect(result.rows).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO departments'),
        ['Test', 'TEST']
      );
    });

    test('should create entity with custom returning', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1 }]
      });

      await handleCreate('departments', ['name'], ['Test'], 'id');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING id'),
        ['Test']
      );
    });
  });

  describe('handleUpdate', () => {
    test('should update entity', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, name: 'Updated', code: 'UPD' }]
      });

      const result = await handleUpdate('departments', 1, ['name', 'code'], ['Updated', 'UPD']);

      expect(result.rows).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE departments'),
        expect.arrayContaining(['Updated', 'UPD', 1])
      );
    });
  });

  describe('checkCanDelete', () => {
    test('should throw error when department has active cost centers', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '5' }]
      });

      await expect(checkCanDelete('departments', 1, 'cost_centers', 'department_id'))
        .rejects.toThrow('Cannot delete department with active cost centers');
    });

    test('should not throw when department has no active cost centers', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '0' }]
      });

      await expect(checkCanDelete('departments', 1, 'cost_centers', 'department_id'))
        .resolves.not.toThrow();
    });

    test('should check cost center with active status', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '0' }]
      });

      await checkCanDelete('departments', 1, 'cost_centers', 'department_id');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = $2"),
        [1, 'active']
      );
    });

    test('should check other entities without status filter', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '0' }]
      });

      await checkCanDelete('cost_centers', 1, 'reimbursements', 'cost_center_id');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("cost_center_id = $1"),
        [1]
      );
    });
  });

  describe('handleSoftDelete', () => {
    test('should soft delete entity without check', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, status: 'inactive' }]
      });

      const result = await handleSoftDelete('departments', 1);

      expect(result.rows).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = $1"),
        ['inactive', 1]
      );
    });

    test('should check before soft delete', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'inactive' }] });

      const result = await handleSoftDelete('departments', 1, 'cost_centers', 'department_id');

      expect(result.rows).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test('should throw error when check fails', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '5' }]
      });

      await expect(handleSoftDelete('departments', 1, 'cost_centers', 'department_id'))
        .rejects.toThrow('Cannot delete');
    });
  });
});


