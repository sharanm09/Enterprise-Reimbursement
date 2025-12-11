const {
  fetchTotalCounts,
  buildApprovalCards,
  calculateActivityStats
} = require('../../routes/dashboard-stats-query-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Stats Query Helpers Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTotalCounts', () => {
    test('should handle all queries failing', async () => {
      pool.query.mockRejectedValue(new Error('DB error'));

      const result = await fetchTotalCounts();

      expect(result.totalUsers).toBe(0);
      expect(result.totalReimbursements).toBe(0);
      expect(result.pendingReimbursements).toBe(0);
      expect(result.approvedReimbursements).toBe(0);
      expect(result.totalDepartments).toBe(0);
      expect(result.totalCostCenters).toBe(0);
      expect(result.totalProjects).toBe(0);
    });

    test('should handle partial query failures', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '30' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await fetchTotalCounts();

      expect(result.totalUsers).toBe(10);
      expect(result.totalReimbursements).toBe(0);
      expect(result.pendingReimbursements).toBe(5);
    });

    test('should handle null count values', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: null }] })
        .mockResolvedValueOnce({ rows: [{ count: null }] })
        .mockResolvedValueOnce({ rows: [{ count: null }] })
        .mockResolvedValueOnce({ rows: [{ count: null }] })
        .mockResolvedValueOnce({ rows: [{ count: null }] })
        .mockResolvedValueOnce({ rows: [{ count: null }] })
        .mockResolvedValueOnce({ rows: [{ count: null }] });

      const result = await fetchTotalCounts();

      expect(result.totalUsers).toBe(0);
      expect(result.totalReimbursements).toBe(0);
    });

    test('should handle empty rows', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await fetchTotalCounts();

      expect(result.totalUsers).toBe(0);
      expect(result.totalReimbursements).toBe(0);
    });
  });

  describe('buildApprovalCards', () => {
    test('should not build cards when no approval roles', async () => {
      const stats = { cards: [] };
      const config = {
        stats,
        userId: 1,
        roleInfo: { isSuperAdmin: false, isFinance: false, isHR: false, isManager: false },
        buildDateFilter: jest.fn(),
        getPendingApprovalsStats: jest.fn(),
        getApprovedStats: jest.fn(),
        getRejectedStats: jest.fn()
      };

      await buildApprovalCards(config);

      expect(stats.cards).toHaveLength(0);
      expect(config.getPendingApprovalsStats).not.toHaveBeenCalled();
    });

    test('should build cards for superadmin even with zero counts', async () => {
      const stats = { cards: [] };
      const config = {
        stats,
        userId: 1,
        roleInfo: { isSuperAdmin: true, isFinance: false, isHR: false, isManager: false },
        buildDateFilter: jest.fn().mockReturnValue({ filter: '', params: [] }),
        getPendingApprovalsStats: jest.fn().mockResolvedValue({ pendingApprovalsCount: 0, pendingApprovalsAmount: 0 }),
        getApprovedStats: jest.fn().mockResolvedValue({ approvedCount: 0, approvedAmount: 0 }),
        getRejectedStats: jest.fn().mockResolvedValue({ rejectedCount: 0, rejectedAmount: 0 })
      };

      await buildApprovalCards(config);

      expect(stats.cards).toHaveLength(3);
      expect(stats.cards[0].title).toBe('Pending Approvals');
      expect(stats.cards[1].title).toBe('Approved');
      expect(stats.cards[2].title).toBe('Rejected');
    });

    test('should only add approved card when count > 0 for non-admin roles', async () => {
      const stats = { cards: [] };
      const config = {
        stats,
        userId: 1,
        roleInfo: { isSuperAdmin: false, isFinance: true, isHR: false, isManager: false },
        buildDateFilter: jest.fn().mockReturnValue({ filter: '', params: [] }),
        getPendingApprovalsStats: jest.fn().mockResolvedValue({ pendingApprovalsCount: 0, pendingApprovalsAmount: 0 }),
        getApprovedStats: jest.fn().mockResolvedValue({ approvedCount: 0, approvedAmount: 0 }),
        getRejectedStats: jest.fn().mockResolvedValue({ rejectedCount: 0, rejectedAmount: 0 })
      };

      await buildApprovalCards(config);

      // Should still add approved card because isFinance is true
      expect(stats.cards.find(c => c.title === 'Approved')).toBeDefined();
    });

    test('should handle getPendingApprovalsStats errors', async () => {
      const stats = { cards: [] };
      const config = {
        stats,
        userId: 1,
        roleInfo: { isSuperAdmin: false, isFinance: true, isHR: false, isManager: false },
        buildDateFilter: jest.fn().mockReturnValue({ filter: '', params: [] }),
        getPendingApprovalsStats: jest.fn().mockRejectedValue(new Error('Stats error')),
        getApprovedStats: jest.fn().mockResolvedValue({ approvedCount: 0, approvedAmount: 0 }),
        getRejectedStats: jest.fn().mockResolvedValue({ rejectedCount: 0, rejectedAmount: 0 })
      };

      await expect(buildApprovalCards(config)).rejects.toThrow('Stats error');
    });
  });

  describe('calculateActivityStats', () => {
    test('should handle zero total reimbursements', () => {
      const result = calculateActivityStats(0, 0, 0);

      expect(result.reimbursements).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.approved).toBe(0);
    });

    test('should handle null total reimbursements', () => {
      const result = calculateActivityStats(null, 0, 0);

      expect(result.reimbursements).toBe(0);
      expect(result.pending).toBe(0);
      expect(result.approved).toBe(0);
    });

    test('should round percentages correctly', () => {
      const result = calculateActivityStats(33, 10, 15);

      expect(result.reimbursements).toBe(100);
      expect(result.pending).toBe(30);
      expect(result.approved).toBe(45);
    });

    test('should handle large numbers', () => {
      const result = calculateActivityStats(10000, 2000, 5000);

      expect(result.reimbursements).toBe(100);
      expect(result.pending).toBe(20);
      expect(result.approved).toBe(50);
    });

    test('should handle decimal results', () => {
      const result = calculateActivityStats(3, 1, 1);

      expect(result.reimbursements).toBe(100);
      expect(result.pending).toBe(33);
      expect(result.approved).toBe(33);
    });
  });
});


