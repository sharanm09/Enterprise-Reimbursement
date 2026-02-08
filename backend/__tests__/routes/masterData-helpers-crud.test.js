const {
  handleGetWithFilters,
  handleCreate,
  handleUpdate,
  handleSoftDelete
} = require('../../routes/masterData-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Master Data CRUD Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGetWithFilters', () => {
    test('should build query with status filter', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1, name: 'Test' }] });

      const result = await handleGetWithFilters('departments', {
        additionalFilters: { status: 'active' }
      });

      expect(result.rows).toHaveLength(1);
      expect(pool.query).toHaveBeenCalled();
    });

    test('should build query with search filter', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        additionalFilters: { search: 'test' }
      });

      expect(pool.query).toHaveBeenCalled();
    });

    test('should build query with custom search fields', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        searchFields: ['name'],
        additionalFilters: { search: 'test' }
      });

      expect(pool.query).toHaveBeenCalled();
    });

    test('should build query with join clause', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('cost_centers', {
        joinClause: 'LEFT JOIN departments d ON d.id = cost_centers.department_id',
        additionalFilters: {}
      });

      expect(pool.query).toHaveBeenCalled();
    });

    test('should build query with groupBy and orderBy', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleGetWithFilters('departments', {
        groupBy: 'GROUP BY d.id',
        orderBy: 'ORDER BY d.name ASC',
        additionalFilters: {}
      });

      expect(pool.query).toHaveBeenCalled();
    });
  });

  describe('handleCreate', () => {
    test('should create record with provided fields', async () => {
      const mockResult = { id: 1, name: 'Test', code: 'TEST' };
      pool.query.mockResolvedValue({ rows: [mockResult] });

      const result = await handleCreate('departments', ['name', 'code'], ['Test', 'TEST']);

      expect(result.rows[0]).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalled();
    });

    test('should use custom returning clause', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      await handleCreate('departments', ['name'], ['Test'], 'id');

      expect(pool.query).toHaveBeenCalled();
    });
  });

  describe('handleUpdate', () => {
    test('should update record with provided fields', async () => {
      const mockResult = { id: 1, name: 'Updated', code: 'UPD' };
      pool.query.mockResolvedValue({ rows: [mockResult] });

      const result = await handleUpdate('departments', 1, ['name', 'code'], ['Updated', 'UPD']);

      expect(result.rows[0]).toEqual(mockResult);
      expect(pool.query).toHaveBeenCalled();
    });
  });

  describe('handleSoftDelete', () => {
    test('should soft delete record', async () => {
      pool.query.mockResolvedValue({ rows: [{ id: 1, status: 'inactive' }] });

      const result = await handleSoftDelete('departments', 1);

      expect(result.rows[0].status).toBe('inactive');
      expect(pool.query).toHaveBeenCalled();
    });

    test('should check for related records before deleting', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, status: 'inactive' }] });

      const result = await handleSoftDelete('departments', 1, 'cost_centers', 'department_id');

      expect(result.rows[0].status).toBe('inactive');
    });

    test('should throw error when related records exist', async () => {
      pool.query.mockResolvedValue({ rows: [{ count: '5' }] });

      await expect(
        handleSoftDelete('departments', 1, 'cost_centers', 'department_id')
      ).rejects.toThrow();
    });
  });
});


