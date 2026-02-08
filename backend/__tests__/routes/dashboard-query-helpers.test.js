const { executeStatsQuery, getApprovedStatsByStatus } = require('../../routes/dashboard-query-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Query Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeStatsQuery', () => {
    test('should return parsed count and amount from query result', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '10', total: '1000.50' }]
      });

      const result = await executeStatsQuery('SELECT COUNT(*) as count, SUM(amount) as total FROM table', []);

      expect(result.count).toBe(10);
      expect(result.amount).toBe(1000.50);
      expect(pool.query).toHaveBeenCalledWith('SELECT COUNT(*) as count, SUM(amount) as total FROM table', []);
    });

    test('should handle null values and return 0', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: null, total: null }]
      });

      const result = await executeStatsQuery('SELECT COUNT(*) as count, SUM(amount) as total FROM table', []);

      expect(result.count).toBe(0);
      expect(result.amount).toBe(0);
    });

    test('should use default value when query fails', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const result = await executeStatsQuery('SELECT COUNT(*) as count, SUM(amount) as total FROM table', []);

      expect(result.count).toBe(0);
      expect(result.amount).toBe(0);
      expect(pool.query).toHaveBeenCalled();
    });

    test('should use custom default value when provided', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const customDefault = { count: '5', total: '500' };
      const result = await executeStatsQuery('SELECT COUNT(*) as count, SUM(amount) as total FROM table', [], customDefault);

      expect(result.count).toBe(5);
      expect(result.amount).toBe(500);
    });
  });

  describe('getApprovedStatsByStatus', () => {
    test('should query with single status', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '5', total: '500.00' }]
      });

      const result = await getApprovedStatsByStatus('approved_by_manager', false);

      expect(result.count).toBe(5);
      expect(result.amount).toBe(500.00);
      expect(pool.query).toHaveBeenCalled();
    });

    test('should query with multiple statuses', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '10', total: '1000.00' }]
      });

      const result = await getApprovedStatsByStatus(['approved_by_finance', 'paid'], true);

      expect(result.count).toBe(10);
      expect(result.amount).toBe(1000.00);
      expect(pool.query).toHaveBeenCalled();
    });

    test('should use paid_amount when usePaidAmount is true', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '3', total: '300.00' }]
      });

      await getApprovedStatsByStatus('approved_by_finance', true);

      const queryCall = pool.query.mock.calls[0][0];
      expect(queryCall).toContain('COALESCE(ri.paid_amount, ri.amount)');
    });

    test('should use amount when usePaidAmount is false', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '3', total: '300.00' }]
      });

      await getApprovedStatsByStatus('approved_by_manager', false);

      const queryCall = pool.query.mock.calls[0][0];
      expect(queryCall).toContain('ri.amount');
    });
  });
});

