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

describe('Dashboard Stats Query Helpers Comprehensive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchTotalCounts', () => {
    test('should fetch all total counts', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '30' }] })
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] });

      const result = await fetchTotalCounts();

      expect(result.totalUsers).toBe(10);
      expect(result.totalReimbursements).toBe(50);
      expect(result.pendingReimbursements).toBe(5);
      expect(result.approvedReimbursements).toBe(30);
      expect(result.totalDepartments).toBe(3);
      expect(result.totalCostCenters).toBe(5);
      expect(result.totalProjects).toBe(2);
    });

    test('should handle database errors gracefully', async () => {
      pool.query
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await fetchTotalCounts();

      expect(result.totalUsers).toBe(0);
    });
  });

  describe('buildApprovalCards', () => {
    test('should build approval cards for finance', async () => {
      const stats = { cards: [] };
      const config = {
        stats,
        userId: 1,
        roleInfo: { isSuperAdmin: false, isFinance: true, isHR: false, isManager: false },
        buildDateFilter: jest.fn().mockReturnValue({ filter: '', params: [] }),
        getPendingApprovalsStats: jest.fn().mockResolvedValue({ pendingApprovalsCount: 3, pendingApprovalsAmount: 500 }),
        getApprovedStats: jest.fn().mockResolvedValue({ approvedCount: 5, approvedAmount: 1000 }),
        getRejectedStats: jest.fn().mockResolvedValue({ rejectedCount: 1, rejectedAmount: 200 })
      };

      await buildApprovalCards(config);

      expect(stats.cards).toHaveLength(3);
      expect(stats.cards[0].title).toBe('Pending Approvals');
      expect(stats.cards[1].title).toBe('Approved');
      expect(stats.cards[2].title).toBe('Rejected');
    });

    test('should not build cards for employee', async () => {
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
    });

    test('should build cards for manager', async () => {
      const stats = { cards: [] };
      const config = {
        stats,
        userId: 1,
        roleInfo: { isSuperAdmin: false, isFinance: false, isHR: false, isManager: true },
        buildDateFilter: jest.fn().mockReturnValue({ filter: '', params: [] }),
        getPendingApprovalsStats: jest.fn().mockResolvedValue({ pendingApprovalsCount: 2, pendingApprovalsAmount: 300 }),
        getApprovedStats: jest.fn().mockResolvedValue({ approvedCount: 4, approvedAmount: 800 }),
        getRejectedStats: jest.fn().mockResolvedValue({ rejectedCount: 0, rejectedAmount: 0 })
      };

      await buildApprovalCards(config);

      expect(stats.cards.length).toBeGreaterThan(0);
    });

    test('should only add approved card when count > 0 or user has approval role', async () => {
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

      expect(stats.cards.find(c => c.title === 'Approved')).toBeDefined();
    });
  });

  describe('calculateActivityStats', () => {
    test('should calculate activity stats correctly', () => {
      const result = calculateActivityStats(100, 20, 50);

      expect(result.reimbursements).toBe(100);
      expect(result.pending).toBe(20);
      expect(result.approved).toBe(50);
    });

    test('should handle zero total reimbursements', () => {
      const result = calculateActivityStats(0, 0, 0);

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
  });
});


