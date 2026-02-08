const {
  buildUserCards,
  buildSuperAdminCards,
  buildHRCards,
  formatReimbursementRow,
  formatPendingApprovalRow,
  fetchRecentReimbursements,
  fetchPendingApprovals
} = require('../../routes/dashboard-stats-helpers');
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

describe('Dashboard Stats Helpers Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildUserCards', () => {
    test('should not add cards when all values are zero', async () => {
      const stats = { cards: [] };
      const roleInfo = { isSuperAdmin: false, userRole: 'employee', isManager: false };
      const userStats = {
        myApprovedCount: 0,
        myApprovedAmount: 0,
        myRejectedCount: 0,
        myRejectedAmount: 0,
        myTotalAmount: 0
      };

      await buildUserCards(stats, roleInfo, userStats);

      expect(stats.cards).toHaveLength(0);
    });

    test('should add only approved card when rejected is zero', async () => {
      const stats = { cards: [] };
      const roleInfo = { isSuperAdmin: false, userRole: 'employee', isManager: false };
      const userStats = {
        myApprovedCount: 5,
        myApprovedAmount: 1000,
        myRejectedCount: 0,
        myRejectedAmount: 0,
        myTotalAmount: 1000
      };

      await buildUserCards(stats, roleInfo, userStats);

      expect(stats.cards).toHaveLength(2); // Approved and My Total
      expect(stats.cards.find(c => c.title === 'Rejected')).toBeUndefined();
    });

    test('should add only rejected card when approved is zero', async () => {
      const stats = { cards: [] };
      const roleInfo = { isSuperAdmin: false, userRole: 'employee', isManager: false };
      const userStats = {
        myApprovedCount: 0,
        myApprovedAmount: 0,
        myRejectedCount: 1,
        myRejectedAmount: 200,
        myTotalAmount: 200
      };

      await buildUserCards(stats, roleInfo, userStats);

      expect(stats.cards).toHaveLength(2); // Rejected and My Total
      expect(stats.cards.find(c => c.title === 'Approval')).toBeUndefined();
    });

    test('should handle superadmin role', async () => {
      const stats = { cards: [] };
      const roleInfo = { isSuperAdmin: true, userRole: 'superadmin', isManager: false };
      const userStats = {
        myApprovedCount: 10,
        myApprovedAmount: 2000,
        myRejectedCount: 2,
        myRejectedAmount: 400,
        myTotalAmount: 2400
      };

      await buildUserCards(stats, roleInfo, userStats);

      expect(stats.cards.length).toBeGreaterThan(0);
    });
  });

  describe('formatReimbursementRow', () => {
    test('should handle missing created_at and use request_date', () => {
      const row = {
        id: 1,
        request_date: '2024-01-15T10:00:00Z',
        status: 'submitted',
        total_amount: 500
      };

      const result = formatReimbursementRow(row);

      expect(result.date).toBeDefined();
    });

    test('should handle empty string department names', () => {
      const row = {
        id: 1,
        created_at: '2024-01-15T10:00:00Z',
        status: 'submitted',
        total_amount: 500,
        department_name: '   ',
        cost_center_name: '',
        project_name: '  '
      };

      const result = formatReimbursementRow(row);

      expect(result.department_name).toBeNull();
      expect(result.cost_center_name).toBeNull();
      expect(result.project_name).toBeNull();
    });

    test('should handle display_amount priority over total_amount', () => {
      const row = {
        id: 1,
        created_at: '2024-01-15T10:00:00Z',
        status: 'submitted',
        display_amount: 750,
        total_amount: 1000
      };

      const result = formatReimbursementRow(row);

      expect(result.amount).toContain('750');
    });
  });

  describe('formatPendingApprovalRow', () => {
    test('should handle missing created_at', () => {
      const row = {
        id: 1,
        user_name: 'Test User',
        status: 'pending',
        total_amount: 500
      };

      expect(() => formatPendingApprovalRow(row)).toThrow();
    });

    test('should handle null total_amount', () => {
      const row = {
        id: 1,
        user_name: 'Test User',
        created_at: '2024-01-15T10:00:00Z',
        status: 'pending',
        total_amount: null
      };

      const result = formatPendingApprovalRow(row);

      expect(result.amount).toContain('0.00');
    });
  });

  describe('fetchRecentReimbursements', () => {
    test('should handle HR role with date filter', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          user_name: 'John Doe',
          created_at: '2024-01-15T10:00:00Z',
          status: 'submitted',
          display_amount: 1000
        }]
      });

      const buildDateFilter = jest.fn().mockReturnValue({
        filter: ' AND r.created_at >= $1',
        params: ['2024-01-01']
      });

      const result = await fetchRecentReimbursements(pool, 1, false, true, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(buildDateFilter).toHaveBeenCalledWith(0);
    });

    test('should handle employee role with date filter', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          user_name: 'John Doe',
          created_at: '2024-01-15T10:00:00Z',
          status: 'submitted',
          display_amount: 1000
        }]
      });

      const buildDateFilter = jest.fn().mockReturnValue({
        filter: ' AND r.created_at >= $2',
        params: ['2024-01-01']
      });

      const result = await fetchRecentReimbursements(pool, 1, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(buildDateFilter).toHaveBeenCalledWith(1);
    });
  });

  describe('fetchPendingApprovals', () => {
    test('should handle manager role with date filter', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          user_name: 'John Doe',
          created_at: '2024-01-15T10:00:00Z',
          status: 'pending',
          total_amount: 500
        }]
      });

      const buildDateFilter = jest.fn().mockReturnValue({
        filter: '',
        params: []
      });

      const result = await fetchPendingApprovals(pool, 1, false, true, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(buildDateFilter).toHaveBeenCalledWith(0);
    });

    test('should handle employee role with date filter', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          user_name: 'John Doe',
          created_at: '2024-01-15T10:00:00Z',
          status: 'pending',
          total_amount: 500
        }]
      });

      const buildDateFilter = jest.fn().mockReturnValue({
        filter: ' AND r.created_at >= $2',
        params: ['2024-01-01']
      });

      const result = await fetchPendingApprovals(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(buildDateFilter).toHaveBeenCalledWith(1);
    });
  });
});


