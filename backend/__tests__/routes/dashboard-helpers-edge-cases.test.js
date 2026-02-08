const {
  getUserStats,
  getPendingApprovalsStats,
  getApprovedStats,
  getRejectedStats,
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

describe('Dashboard Helpers Edge Cases', () => {
  const { getApprovedStatsByStatus } = require('../../routes/dashboard-query-helpers');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserStats', () => {
    test('should handle null count values', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: null, total: null }] })
        .mockResolvedValueOnce({ rows: [{ count: null, total: null }] })
        .mockResolvedValueOnce({ rows: [{ total: null }] });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getUserStats(1, buildDateFilter);

      expect(result.myApprovedCount).toBe(0);
      expect(result.myApprovedAmount).toBe(0);
      expect(result.myRejectedCount).toBe(0);
      expect(result.myRejectedAmount).toBe(0);
      expect(result.myTotalAmount).toBe(0);
    });

    test('should handle empty rows', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getUserStats(1, buildDateFilter);

      expect(result.myApprovedCount).toBe(0);
      expect(result.myApprovedAmount).toBe(0);
    });

    test('should handle date filter with params', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '5', total: '1000' }] })
        .mockResolvedValueOnce({ rows: [{ count: '1', total: '200' }] })
        .mockResolvedValueOnce({ rows: [{ total: '1200' }] });

      const buildDateFilter = jest.fn().mockReturnValue({
        filter: ' AND r.created_at >= $2',
        params: ['2024-01-01']
      });

      const result = await getUserStats(1, buildDateFilter);

      expect(result.myApprovedCount).toBe(5);
      expect(buildDateFilter).toHaveBeenCalledWith(1);
    });
  });

  describe('getPendingApprovalsStats', () => {
    test('should handle errors in finance pending', async () => {
      pool.query.mockRejectedValue(new Error('DB error'));

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, false, true, false, false, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should handle errors in HR pending', async () => {
      pool.query.mockRejectedValue(new Error('DB error'));

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, false, false, true, false, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(0);
    });

    test('should handle errors in manager pending', async () => {
      pool.query.mockRejectedValue(new Error('DB error'));

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, false, false, false, true, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(0);
    });

    test('should handle errors in superadmin pending', async () => {
      pool.query.mockRejectedValue(new Error('DB error'));

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await getPendingApprovalsStats(1, true, false, false, false, buildDateFilter);

      expect(result.pendingApprovalsCount).toBe(0);
    });
  });

  describe('getApprovedStats', () => {
    test('should handle errors gracefully', async () => {
      getApprovedStatsByStatus.mockRejectedValue(new Error('DB error'));

      const result = await getApprovedStats(false, true, false, false);

      expect(result.approvedCount).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should return zero for employee role', async () => {
      const result = await getApprovedStats(false, false, false, false);

      expect(result.approvedCount).toBe(0);
      expect(result.approvedAmount).toBe(0);
    });
  });

  describe('getRejectedStats', () => {
    test('should handle errors gracefully', async () => {
      pool.query.mockRejectedValue(new Error('DB error'));

      const result = await getRejectedStats(1, true, false, false, false);

      expect(result.rejectedCount).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    test('should return zero for employee role', async () => {
      const result = await getRejectedStats(1, false, false, false, false);

      expect(result.rejectedCount).toBe(0);
      expect(result.rejectedAmount).toBe(0);
    });

    test('should handle null count values', async () => {
      pool.query.mockResolvedValue({
        rows: [{ count: null, total: null }]
      });

      const result = await getRejectedStats(1, true, false, false, false);

      expect(result.rejectedCount).toBe(0);
      expect(result.rejectedAmount).toBe(0);
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

    test('should return manager filter with correct userId', () => {
      const result = buildRoleFilterQuery(false, false, true, false, 123);

      expect(result.query).toContain('manager_id');
      expect(result.params).toEqual([123]);
    });

    test('should return HR filter query', () => {
      const result = buildRoleFilterQuery(false, false, false, true, 1);

      expect(result.query).toContain('role');
      expect(result.params).toEqual([]);
    });

    test('should return user filter for employee', () => {
      const result = buildRoleFilterQuery(false, false, false, false, 456);

      expect(result.query).toContain('user_id');
      expect(result.params).toEqual([456]);
    });
  });
});


