const {
  getUserStats,
  getPendingApprovalsStats,
  getApprovedStats,
  getRejectedStats,
  getMonthlyTrendData,
  getStatusDistributionData,
  getDepartmentWiseData,
  getAmountTrendData,
  getWeeklyTrendData,
  getDailyData,
  getCategoryWiseData,
  buildRoleFilterQuery
} = require('../../routes/dashboard-helpers');
const { pool } = require('../../config/database');
const logger = require('../../utils/logger');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => ({
  warn: jest.fn()
}));

jest.mock('../../routes/dashboard-query-helpers', () => ({
  getApprovedStatsByStatus: jest.fn()
}));

describe('Dashboard Helpers Comprehensive', () => {
  const { getApprovedStatsByStatus } = require('../../routes/dashboard-query-helpers');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserStats', () => {
    test('should return user stats with date filter', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '5', total: '1000.50' }] })
        .mockResolvedValueOnce({ rows: [{ count: '1', total: '200.00' }] })
        .mockResolvedValueOnce({ rows: [{ total: '1200.50' }] });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: ' AND r.created_at >= $2', params: ['2024-01-01'] });

      const result = await getUserStats(1, buildDateFilter);

      expect(result.myApprovedCount).toBe(5);
      expect(result.myApprovedAmount).toBe(1000.50);
      expect(result.myRejectedCount).toBe(1);
      expect(result.myRejectedAmount).toBe(200.00);
      expect(result.myTotalAmount).toBe(1200.50);
    });

    test('should handle database errors gracefully', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error'));

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getUserStats(1, buildDateFilter);

      expect(result.myApprovedCount).toBe(0);
      expect(result.myApprovedAmount).toBe(0);
    });
  });

  describe('getPendingApprovalsStats', () => {
    test('should return finance pending approvals', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '3', total: '500.00' }] });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, false, true, false, false, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(3);
      expect(result.pendingApprovalsAmount).toBe(500.00);
    });

    test('should return HR pending approvals', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '2', total: '300.00' }] });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, false, false, true, false, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(2);
    });

    test('should return manager pending approvals', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '4', total: '600.00' }] });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, false, false, false, true, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(4);
    });

    test('should return superadmin pending approvals', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '10', total: '2000.00' }] });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, true, false, false, false, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(10);
    });

    test('should handle errors gracefully', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error'));

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, false, true, false, false, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('getApprovedStats', () => {
    test('should return finance approved stats', async () => {
      getApprovedStatsByStatus.mockResolvedValueOnce({ count: 5, amount: 1000 });

      const result = await getApprovedStats(false, true, false, false);

      expect(result.approvedCount).toBe(5);
      expect(result.approvedAmount).toBe(1000);
    });

    test('should return HR approved stats', async () => {
      getApprovedStatsByStatus.mockResolvedValueOnce({ count: 3, amount: 600 });

      const result = await getApprovedStats(false, false, true, false);

      expect(result.approvedCount).toBe(3);
    });

    test('should return manager approved stats', async () => {
      getApprovedStatsByStatus.mockResolvedValueOnce({ count: 2, amount: 400 });

      const result = await getApprovedStats(false, false, false, true);

      expect(result.approvedCount).toBe(2);
    });

    test('should handle errors gracefully', async () => {
      getApprovedStatsByStatus.mockRejectedValueOnce(new Error('DB error'));

      const result = await getApprovedStats(false, true, false, false);

      expect(result.approvedCount).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('getRejectedStats', () => {
    test('should return superadmin rejected stats', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '3', total: '500.00' }] });

      const result = await getRejectedStats(1, true, false, false, false);

      expect(result.rejectedCount).toBe(3);
      expect(result.rejectedAmount).toBe(500.00);
    });

    test('should return finance rejected stats', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '2', total: '300.00' }] });

      const result = await getRejectedStats(1, false, true, false, false);

      expect(result.rejectedCount).toBe(2);
    });

    test('should return manager rejected stats', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ count: '1', total: '200.00' }] });

      const result = await getRejectedStats(1, false, false, false, true);

      expect(result.rejectedCount).toBe(1);
    });

    test('should handle errors gracefully', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error'));

      const result = await getRejectedStats(1, true, false, false, false);

      expect(result.rejectedCount).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('buildRoleFilterQuery', () => {
    test('should return empty query for superadmin', () => {
      const result = buildRoleFilterQuery(true, false, false, false, 1);

      expect(result.query).toBe('');
      expect(result.params).toEqual([]);
    });

    test('should return empty query for finance', () => {
      const result = buildRoleFilterQuery(false, true, false, false, 1);

      expect(result.query).toBe('');
      expect(result.params).toEqual([]);
    });

    test('should return manager filter query', () => {
      const result = buildRoleFilterQuery(false, false, true, false, 1);

      expect(result.query).toContain('manager_id');
      expect(result.params).toEqual([1]);
    });

    test('should return HR filter query', () => {
      const result = buildRoleFilterQuery(false, false, false, true, 1);

      expect(result.query).toContain('role');
      expect(result.params).toEqual([]);
    });

    test('should return user filter query for employee', () => {
      const result = buildRoleFilterQuery(false, false, false, false, 1);

      expect(result.query).toContain('user_id');
      expect(result.params).toEqual([1]);
    });
  });

  describe('getMonthlyTrendData', () => {
    test('should return monthly trend data for employee', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { month: 'Jan 2024', count: '5', total_amount: '1000.00' }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getMonthlyTrendData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(result[0].month).toBe('Jan 2024');
      expect(result[0].count).toBe(5);
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error'));

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getMonthlyTrendData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toEqual([]);
    });
  });

  describe('getStatusDistributionData', () => {
    test('should return status distribution data', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { status: 'Paid', count: '10', total_amount: '2000.00' }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getStatusDistributionData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Paid');
    });
  });

  describe('getDepartmentWiseData', () => {
    test('should return department wise data', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { department: 'IT', count: '5', total_amount: '1000.00' }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getDepartmentWiseData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(result[0].department).toBe('IT');
    });
  });

  describe('getAmountTrendData', () => {
    test('should return amount trend data', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { week: 'Jan 01', total_amount: '500.00', paid_amount: '400.00' }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getAmountTrendData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(result[0].total).toBe(500.00);
      expect(result[0].paid).toBe(400.00);
    });
  });

  describe('getWeeklyTrendData', () => {
    test('should return weekly trend data', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { day: 'Mon', date: '01', count: '3', total_amount: '600.00' }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getWeeklyTrendData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(result[0].day).toBe('Mon');
    });
  });

  describe('getDailyData', () => {
    test('should return daily data', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { day: '01', count: '2', total_amount: '400.00', approved_amount: '300.00', rejected_amount: '100.00' }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getDailyData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(result[0].approved).toBe(300.00);
      expect(result[0].rejected).toBe(100.00);
    });
  });

  describe('getCategoryWiseData', () => {
    test('should return category wise data', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { category: 'Food', count: '5', total_amount: '500.00' }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getCategoryWiseData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Food');
    });
  });
});
