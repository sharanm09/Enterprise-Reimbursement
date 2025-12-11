const {
  fetchRecentReimbursements,
  fetchPendingApprovals
} = require('../../routes/dashboard-stats-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Stats Helpers Extended', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRecentReimbursements', () => {
    test('should fetch recent reimbursements for employee', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          user_name: 'John Doe',
          created_at: '2024-01-15T10:00:00Z',
          status: 'pending',
          total_amount: 1000,
          display_amount: 1000
        }]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await fetchRecentReimbursements(pool, 1, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should fetch recent reimbursements for superadmin', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          user_name: 'John Doe',
          created_at: '2024-01-15T10:00:00Z',
          status: 'pending',
          total_amount: 1000,
          display_amount: 1000
        }]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await fetchRecentReimbursements(pool, 1, true, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle query errors gracefully', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await fetchRecentReimbursements(pool, 1, false, false, buildDateFilter);

      expect(result).toEqual([]);
    });
  });

  describe('fetchPendingApprovals', () => {
    test('should fetch pending approvals for employee', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          user_name: 'Jane Doe',
          created_at: '2024-01-15T10:00:00Z',
          status: 'pending',
          total_amount: 500
        }]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await fetchPendingApprovals(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should fetch pending approvals for manager', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          user_name: 'Jane Doe',
          created_at: '2024-01-15T10:00:00Z',
          status: 'pending',
          total_amount: 500
        }]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await fetchPendingApprovals(pool, 1, false, true, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle query errors gracefully', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await fetchPendingApprovals(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toEqual([]);
    });
  });
});


