const { fetchTotalCounts, buildApprovalCards, calculateActivityStats } = require('../../routes/dashboard-stats-query-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Stats Query Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTotalCounts', () => {
    test('should fetch all total counts', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: [{ count: '30' }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '15' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      const result = await fetchTotalCounts();

      expect(result.totalUsers).toBe(100);
      expect(result.totalReimbursements).toBe(50);
      expect(result.pendingReimbursements).toBe(20);
      expect(result.approvedReimbursements).toBe(30);
      expect(result.totalDepartments).toBe(10);
      expect(result.totalCostCenters).toBe(15);
      expect(result.totalProjects).toBe(5);
    });

    test('should handle query errors gracefully', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const result = await fetchTotalCounts();

      expect(result.totalUsers).toBe(0);
      expect(result.totalReimbursements).toBe(0);
    });
  });

  describe('buildApprovalCards', () => {
    test('should build approval cards for superadmin', async () => {
      const stats = { cards: [] };
      const getPendingApprovalsStats = jest.fn().mockResolvedValue({ pendingApprovalsCount: 10, pendingApprovalsAmount: 1000 });
      const getApprovedStats = jest.fn().mockResolvedValue({ approvedCount: 20, approvedAmount: 2000 });
      const getRejectedStats = jest.fn().mockResolvedValue({ rejectedCount: 5, rejectedAmount: 500 });
      const buildDateFilter = jest.fn();

      await buildApprovalCards({
        stats,
        userId: 1,
        roleInfo: { isSuperAdmin: true, isFinance: false, isHR: false, isManager: false },
        buildDateFilter,
        getPendingApprovalsStats,
        getApprovedStats,
        getRejectedStats
      });

      expect(stats.cards.length).toBe(3);
      expect(stats.cards[0].title).toBe('Pending Approvals');
      expect(stats.cards[1].title).toBe('Approved');
      expect(stats.cards[2].title).toBe('Rejected');
    });

    test('should not build cards for employee', async () => {
      const stats = { cards: [] };
      const getPendingApprovalsStats = jest.fn();
      const getApprovedStats = jest.fn();
      const getRejectedStats = jest.fn();
      const buildDateFilter = jest.fn();

      await buildApprovalCards({
        stats,
        userId: 1,
        roleInfo: { isSuperAdmin: false, isFinance: false, isHR: false, isManager: false },
        buildDateFilter,
        getPendingApprovalsStats,
        getApprovedStats,
        getRejectedStats
      });

      expect(stats.cards.length).toBe(0);
      expect(getPendingApprovalsStats).not.toHaveBeenCalled();
    });
  });

  describe('calculateActivityStats', () => {
    test('should calculate activity percentages', () => {
      const result = calculateActivityStats(100, 30, 70);

      expect(result.reimbursements).toBe(100);
      expect(result.pending).toBe(30);
      expect(result.approved).toBe(70);
    });

    test('should handle zero total reimbursements', () => {
      const result = calculateActivityStats(0, 0, 0);

      expect(result.reimbursements).toBe(100);
      expect(result.pending).toBe(0);
      expect(result.approved).toBe(0);
    });
  });
});

