const {
  buildUserCards,
  buildHRCards,
  buildSuperAdminCards,
  formatReimbursementRow,
  formatPendingApprovalRow
} = require('../../routes/dashboard-stats-helpers');

describe('Dashboard Stats Helpers', () => {
  describe('formatReimbursementRow', () => {
    test('should format reimbursement row correctly', () => {
      const row = {
        id: 1,
        user_name: 'John Doe',
        created_at: '2024-01-15T10:00:00Z',
        status: 'pending',
        total_amount: 1000.50,
        department_name: 'IT',
        cost_center_name: 'CC001',
        project_name: 'Project A'
      };

      const result = formatReimbursementRow(row);

      expect(result.id).toBe(1);
      expect(result.name).toBe('John Doe');
      expect(result.status).toBe('pending');
      expect(result.amount).toContain('$1,000.50');
      expect(result.department_name).toBe('IT');
    });

    test('should handle null values', () => {
      const row = {
        id: 1,
        user_name: null,
        created_at: '2024-01-15T10:00:00Z',
        status: 'pending',
        total_amount: 0,
        department_name: '',
        cost_center_name: '   ',
        project_name: null
      };

      const result = formatReimbursementRow(row);

      expect(result.name).toBe('Unknown');
      expect(result.department_name).toBeNull();
      expect(result.cost_center_name).toBeNull();
      expect(result.project_name).toBeNull();
    });
  });

  describe('formatPendingApprovalRow', () => {
    test('should format pending approval row correctly', () => {
      const row = {
        item_id: 1,
        user_name: 'Jane Doe',
        created_at: '2024-01-15T10:00:00Z',
        item_status: 'pending',
        amount: 500.25,
        department_name: 'HR',
        cost_center_name: 'CC002',
        project_name: 'Project B'
      };

      const result = formatPendingApprovalRow(row);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Jane Doe');
      expect(result.status).toBe('pending');
      expect(result.amount).toContain('$500.25');
    });
  });

  describe('buildUserCards', () => {
    test('should build user cards for employee', async () => {
      const stats = { cards: [] };
      const roleInfo = { isSuperAdmin: false, userRole: 'employee', isManager: false };
      const userStats = {
        myApprovedCount: 5,
        myApprovedAmount: 1000,
        myRejectedCount: 2,
        myRejectedAmount: 500,
        myTotalAmount: 2000
      };

      await buildUserCards(stats, roleInfo, userStats);

      expect(stats.cards.length).toBeGreaterThan(0);
    });
  });

  describe('buildHRCards', () => {
    test('should build HR cards when isHR is true', async () => {
      const stats = { cards: [] };

      await buildHRCards(stats, true, 10, 5);

      expect(stats.cards.length).toBe(2);
    });

    test('should not build HR cards when isHR is false', async () => {
      const stats = { cards: [] };

      await buildHRCards(stats, false, 10, 5);

      expect(stats.cards.length).toBe(0);
    });
  });

  describe('buildSuperAdminCards', () => {
    test('should build superadmin cards', async () => {
      const stats = { cards: [] };

      await buildSuperAdminCards(stats, 100, 10, 20, 15);

      expect(stats.cards.length).toBe(4);
    });
  });
});

