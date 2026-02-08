const {
  buildUserCards,
  buildSuperAdminCards,
  buildHRCards,
  fetchRecentReimbursements,
  fetchPendingApprovals,
  formatReimbursementRow,
  formatPendingApprovalRow
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

describe('Dashboard Stats Helpers Comprehensive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildUserCards', () => {
    test('should build cards for employee with approved items', async () => {
      const stats = { cards: [] };
      const roleInfo = { isSuperAdmin: false, userRole: 'employee', isManager: false };
      const userStats = {
        myApprovedCount: 5,
        myApprovedAmount: 1000,
        myRejectedCount: 1,
        myRejectedAmount: 200,
        myTotalAmount: 1200
      };

      await buildUserCards(stats, roleInfo, userStats);

      expect(stats.cards).toHaveLength(3);
      expect(stats.cards[0].title).toBe('Approval');
      expect(stats.cards[1].title).toBe('Rejected');
      expect(stats.cards[2].title).toBe('My Total');
    });

    test('should build cards for manager', async () => {
      const stats = { cards: [] };
      const roleInfo = { isSuperAdmin: false, userRole: 'manager', isManager: true };
      const userStats = {
        myApprovedCount: 3,
        myApprovedAmount: 600,
        myRejectedCount: 0,
        myRejectedAmount: 0,
        myTotalAmount: 600
      };

      await buildUserCards(stats, roleInfo, userStats);

      expect(stats.cards.length).toBeGreaterThan(0);
    });

    test('should not build cards for other roles', async () => {
      const stats = { cards: [] };
      const roleInfo = { isSuperAdmin: false, userRole: 'hr', isManager: false };
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

    test('should only add approved card when count > 0', async () => {
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

      expect(stats.cards.find(c => c.title === 'Approval')).toBeUndefined();
      expect(stats.cards.find(c => c.title === 'Rejected')).toBeDefined();
    });
  });

  describe('buildSuperAdminCards', () => {
    test('should build superadmin cards', async () => {
      const stats = { cards: [] };

      await buildSuperAdminCards(stats, 10, 3, 5, 2);

      expect(stats.cards).toHaveLength(4);
      expect(stats.cards[0].title).toBe('Total Users');
      expect(stats.cards[1].title).toBe('Departments');
      expect(stats.cards[2].title).toBe('Cost Centers');
      expect(stats.cards[3].title).toBe('Projects');
    });
  });

  describe('buildHRCards', () => {
    test('should build HR cards when isHR is true', async () => {
      const stats = { cards: [] };

      await buildHRCards(stats, true, 3, 2);

      expect(stats.cards).toHaveLength(2);
      expect(stats.cards[0].title).toBe('Departments');
      expect(stats.cards[1].title).toBe('Projects');
    });

    test('should not build cards when isHR is false', async () => {
      const stats = { cards: [] };

      await buildHRCards(stats, false, 3, 2);

      expect(stats.cards).toHaveLength(0);
    });
  });

  describe('formatReimbursementRow', () => {
    test('should format reimbursement row correctly', () => {
      const row = {
        id: 1,
        user_name: 'John Doe',
        created_at: '2024-01-15T10:00:00Z',
        status: 'submitted',
        display_amount: 1000.50,
        department_name: 'IT',
        cost_center_name: 'Development',
        project_name: 'Project A'
      };

      const result = formatReimbursementRow(row);

      expect(result.id).toBe(1);
      expect(result.name).toBe('John Doe');
      expect(result.amount).toContain('1,000.50');
      expect(result.department_name).toBe('IT');
    });

    test('should handle missing optional fields', () => {
      const row = {
        id: 1,
        created_at: '2024-01-15T10:00:00Z',
        status: 'submitted',
        total_amount: 500
      };

      const result = formatReimbursementRow(row);

      expect(result.name).toBe('Unknown');
      expect(result.department_name).toBeNull();
    });

    test('should trim whitespace from department names', () => {
      const row = {
        id: 1,
        created_at: '2024-01-15T10:00:00Z',
        status: 'submitted',
        total_amount: 500,
        department_name: '  IT  '
      };

      const result = formatReimbursementRow(row);

      expect(result.department_name).toBe('IT');
    });
  });

  describe('formatPendingApprovalRow', () => {
    test('should format pending approval row correctly', () => {
      const row = {
        id: 1,
        user_name: 'Jane Doe',
        created_at: '2024-01-15T10:00:00Z',
        status: 'pending',
        total_amount: 750.25,
        department_name: 'HR'
      };

      const result = formatPendingApprovalRow(row);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Jane Doe');
      expect(result.amount).toContain('750.25');
    });
  });

  describe('fetchRecentReimbursements', () => {
    test('should fetch recent reimbursements for employee', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_name: 'John Doe',
            created_at: '2024-01-15T10:00:00Z',
            status: 'submitted',
            display_amount: 1000
          }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await fetchRecentReimbursements(pool, 1, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    test('should fetch recent reimbursements for superadmin', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_name: 'John Doe',
            created_at: '2024-01-15T10:00:00Z',
            status: 'submitted',
            display_amount: 1000
          }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await fetchRecentReimbursements(pool, 1, true, false, buildDateFilter);

      expect(result).toHaveLength(1);
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error'));

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await fetchRecentReimbursements(pool, 1, false, false, buildDateFilter);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('fetchPendingApprovals', () => {
    test('should fetch pending approvals for employee', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_name: 'John Doe',
            created_at: '2024-01-15T10:00:00Z',
            status: 'pending',
            total_amount: 500
          }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await fetchPendingApprovals(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
    });

    test('should fetch pending approvals for manager', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            user_name: 'John Doe',
            created_at: '2024-01-15T10:00:00Z',
            status: 'pending',
            total_amount: 500
          }
        ]
      });

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await fetchPendingApprovals(pool, 1, false, true, false, false, buildDateFilter);

      expect(result).toHaveLength(1);
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('DB error'));

      const buildDateFilter = jest.fn().mockReturnValue({ filter: '', params: [] });

      const result = await fetchPendingApprovals(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});


