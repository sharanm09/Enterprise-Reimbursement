const { assignManagerForRole, setHRManagerSelf, updateUserRoleWithManager } = require('../../routes/auth-role-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Auth Role Helpers Complete Coverage', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('assignManagerForRole', () => {
    test('should assign HR manager for employee role', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 3 }] }) // HR role
        .mockResolvedValueOnce({ rows: [{ id: 10 }] }) // HR user
        .mockResolvedValueOnce({ rows: [] }); // UPDATE

      await assignManagerForRole(mockClient, 1, 'employee');

      expect(mockClient.query).toHaveBeenCalledWith('SELECT id FROM roles WHERE name = $1', ['hr']);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE role_id = $1 LIMIT 1',
        [3]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $2',
        [10, 1]
      );
    });

    test('should assign HR manager for manager role', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: [] });

      await assignManagerForRole(mockClient, 1, 'manager');

      expect(mockClient.query).toHaveBeenCalled();
    });

    test('should return early for hr role', async () => {
      await assignManagerForRole(mockClient, 1, 'hr');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should return early for finance role', async () => {
      await assignManagerForRole(mockClient, 1, 'finance');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should return early for superadmin role', async () => {
      await assignManagerForRole(mockClient, 1, 'superadmin');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should return early when HR role not found', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await assignManagerForRole(mockClient, 1, 'employee');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('should return early when no HR users found', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({ rows: [] });

      await assignManagerForRole(mockClient, 1, 'employee');

      expect(mockClient.query).toHaveBeenCalledTimes(2);
    });

    test('should handle multiple HR users and select first', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }, { id: 11 }] })
        .mockResolvedValueOnce({ rows: [] });

      await assignManagerForRole(mockClient, 1, 'employee');

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $2',
        [10, 1]
      );
    });
  });

  describe('setHRManagerSelf', () => {
    test('should set HR user as their own manager', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await setHRManagerSelf(mockClient, 5);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $1',
        [5]
      );
    });

    test('should handle different user IDs', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await setHRManagerSelf(mockClient, 100);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $1',
        [100]
      );
    });
  });

  describe('updateUserRoleWithManager', () => {
    test('should update employee role and assign manager', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ name: 'employee' }] })
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: [] });

      await updateUserRoleWithManager(mockClient, 1, 2);

      expect(mockClient.query).toHaveBeenCalledWith('SELECT name FROM roles WHERE id = $1', [2]);
    });

    test('should update manager role and assign manager', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ name: 'manager' }] })
        .mockResolvedValueOnce({ rows: [{ id: 3 }] })
        .mockResolvedValueOnce({ rows: [{ id: 10 }] })
        .mockResolvedValueOnce({ rows: [] });

      await updateUserRoleWithManager(mockClient, 1, 4);

      expect(mockClient.query).toHaveBeenCalled();
    });

    test('should update HR role and set self as manager', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ name: 'hr' }] })
        .mockResolvedValueOnce({ rows: [] });

      await updateUserRoleWithManager(mockClient, 5, 3);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $1',
        [5]
      );
    });

    test('should not assign manager for finance role', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ name: 'finance' }] });

      await updateUserRoleWithManager(mockClient, 1, 5);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('should not assign manager for superadmin role', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ name: 'superadmin' }] });

      await updateUserRoleWithManager(mockClient, 1, 6);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('should handle role lookup returning empty result', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] });

      await updateUserRoleWithManager(mockClient, 1, 999);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });

    test('should handle role lookup returning null name', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ name: null }] });

      await updateUserRoleWithManager(mockClient, 1, 999);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });
});

