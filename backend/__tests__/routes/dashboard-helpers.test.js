const {
  getUserStats,
  getPendingApprovalsStats,
  getApprovedStats,
  getRejectedStats
} = require('../../routes/dashboard-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserStats', () => {
    test('should return user statistics', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '5', total: '500.00' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2', total: '200.00' }] })
        .mockResolvedValueOnce({ rows: [{ total: '1000.00' }] });

      const buildDateFilter = () => ({ filter: '', params: [] });

      const result = await getUserStats(1, buildDateFilter);

      expect(result.myApprovedCount).toBe(5);
      expect(result.myApprovedAmount).toBe(500.00);
      expect(result.myRejectedCount).toBe(2);
      expect(result.myRejectedAmount).toBe(200.00);
      expect(result.myTotalAmount).toBe(1000.00);
    });

    test('should handle query errors gracefully', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const buildDateFilter = () => ({ filter: '', params: [] });

      const result = await getUserStats(1, buildDateFilter);

      expect(result.myApprovedCount).toBe(0);
      expect(result.myApprovedAmount).toBe(0);
    });
  });

  describe('getPendingApprovalsStats', () => {
    test('should return pending approvals for finance', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '10', total: '1000.00' }]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, false, true, false, false, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(10);
      expect(result.pendingApprovalsAmount).toBe(1000.00);
    });

    test('should return pending approvals for manager', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '5', total: '500.00' }]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, false, false, false, true, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(5);
      expect(result.pendingApprovalsAmount).toBe(500.00);
    });
  });

  describe('getApprovedStats', () => {
    test('should return approved stats for finance', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '20', total: '2000.00' }]
      });

      const result = await getApprovedStats(false, true, false, false);

      expect(result.approvedCount).toBe(20);
      expect(result.approvedAmount).toBe(2000.00);
    });

    test('should return approved stats for hr', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '15', total: '1500.00' }]
      });

      const result = await getApprovedStats(false, false, true, false);

      expect(result.approvedCount).toBe(15);
      expect(result.approvedAmount).toBe(1500.00);
    });

    test('should return approved stats for manager', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '8', total: '800.00' }]
      });

      const result = await getApprovedStats(false, false, false, true);

      expect(result.approvedCount).toBe(8);
      expect(result.approvedAmount).toBe(800.00);
    });
  });

  describe('getRejectedStats', () => {
    test('should return rejected stats for finance', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: '3', total: '300.00' }]
      });

      const result = await getRejectedStats(1, false, true, false, false);

      expect(result.rejectedCount).toBe(3);
      expect(result.rejectedAmount).toBe(300.00);
    });
  });
});


