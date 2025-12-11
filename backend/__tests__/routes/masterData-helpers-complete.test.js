const {
  validateNameAndCode,
  handleGetWithFilters,
  handleCreate,
  handleUpdate,
  handleSoftDelete
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

describe('MasterData Helpers Complete Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateNameAndCode', () => {
    test('should validate name and code', () => {
      const errors = validateNameAndCode('Test Name', 'TEST001');

      expect(errors).toHaveLength(0);
    });

    test('should return error for missing name', () => {
      const errors = validateNameAndCode('', 'TEST001');

      expect(errors).toContain('Name is required');
    });

    test('should return error for missing code', () => {
      const errors = validateNameAndCode('Test Name', '');

      expect(errors).toContain('Code is required');
    });

    test('should validate additional fields', () => {
      const errors = validateNameAndCode('Test', 'T001', {
        department_id: 1,
        status: 'active'
      });

      expect(errors).toHaveLength(0);
    });

    test('should return error for missing additional fields', () => {
      const errors = validateNameAndCode('Test', 'T001', {
        department_id: null,
        status: ''
      });

      expect(errors).toContain('department_id is required');
      expect(errors).toContain('status is required');
    });
  });

  describe('handleGetWithFilters', () => {
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
        searchFields: ['name', 'code'],
        additionalFilters: { search: 'test' }
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        ['%test%']
      );
    });

    test('should build query with table alias', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        tableAlias: 'd',
        selectFields: 'd.*',
        additionalFilters: { status: 'active' }
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('d.status = $1'),
        ['active']
      );
    });

    test('should detect alias from selectFields', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        selectFields: 'd.*',
        additionalFilters: { status: 'active' }
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('d.status'),
        ['active']
      );
    });

    test('should detect alias from joinClause', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        joinClause: 'LEFT JOIN cost_centers cc ON d.id = cc.department_id',
        additionalFilters: { status: 'active' }
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('d.status'),
        ['active']
      );
    });

    test('should build query with groupBy', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        groupBy: 'GROUP BY d.id',
        additionalFilters: {}
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY'),
        []
      );
    });

    test('should build query with orderBy', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        orderBy: 'ORDER BY name ASC',
        additionalFilters: {}
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY'),
        []
      );
    });

    test('should handle additional filters', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('cost_centers', {
        additionalFilters: {
          department_id: 1,
          status: 'active'
        }
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('department_id = $'),
        expect.arrayContaining([1, 'active'])
      );
    });

    test('should handle status = all', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        additionalFilters: { status: 'all' }
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.not.stringContaining('status ='),
        []
      );
    });
  });

  describe('handleCreate', () => {
    test('should create entity', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Test', code: 'T001' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await handleCreate('departments', ['name', 'code'], ['Test', 'T001']);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO departments'),
        ['Test', 'T001']
      );
      expect(result).toEqual(mockResult);
    });

    test('should create entity with custom returning', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      pool.query.mockResolvedValue(mockResult);

      await handleCreate('departments', ['name'], ['Test'], 'id');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING id'),
        ['Test']
      );
    });
  });

  describe('handleUpdate', () => {
    test('should update entity', async () => {
      const mockResult = { rows: [{ id: 1, name: 'Updated', code: 'U001' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await handleUpdate('departments', 1, ['name', 'code'], ['Updated', 'U001']);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE departments'),
        ['Updated', 'U001', 1]
      );
      expect(result).toEqual(mockResult);
    });

    test('should update entity with custom returning', async () => {
      const mockResult = { rows: [{ id: 1 }] };
      pool.query.mockResolvedValue(mockResult);

      await handleUpdate('departments', 1, ['name'], ['Updated'], 'id');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING id'),
        ['Updated', 1]
      );
    });

    test('should update updated_at timestamp', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      await handleUpdate('departments', 1, ['name'], ['Updated']);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = CURRENT_TIMESTAMP'),
        ['Updated', 1]
      );
    });
  });

  describe('handleSoftDelete', () => {
    test('should soft delete entity', async () => {
      const mockResult = { rows: [{ id: 1, status: 'inactive' }] };
      pool.query.mockResolvedValue(mockResult);

      const result = await handleSoftDelete('departments', 1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE departments SET status = $1'),
        ['inactive', 1]
      );
      expect(result).toEqual(mockResult);
    });

    test('should check can delete before soft delete', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // checkCanDelete
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'inactive' }] }); // soft delete

      await handleSoftDelete('departments', 1, 'cost_centers', 'department_id');

      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test('should throw error if cannot delete', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '5' }] }); // Has active cost centers

      await expect(
        handleSoftDelete('departments', 1, 'cost_centers', 'department_id')
      ).rejects.toThrow('Cannot delete department with active cost centers');
    });

    test('should handle cost center check with status filter', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });

      await handleSoftDelete('departments', 1, 'cost_centers', 'department_id');

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $2'),
        [1, 'active']
      );
    });
  });
});

