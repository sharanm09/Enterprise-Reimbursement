const {
  assignManagerForRole,
  setHRManagerSelf,
  updateUserRoleWithManager
} = require('../../routes/auth-role-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

describe('Auth Role Helpers Comprehensive Coverage', () => {
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn()
    };
  });

  describe('assignManagerForRole', () => {
    test('should assign HR manager for employee role', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 2 }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await assignManagerForRole(mockClient, 10, 'employee');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM roles WHERE name = $1',
        ['hr']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE role_id = $1 LIMIT 1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $2',
        [2, 10]
      );
    });

    test('should assign HR manager for manager role', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 2 }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await assignManagerForRole(mockClient, 10, 'manager');

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM roles WHERE name = $1',
        ['hr']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE role_id = $1 LIMIT 1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $2',
        [2, 10]
      );
    });

    test('should not assign manager for non-employee/manager roles', async () => {
      await assignManagerForRole(mockClient, 10, 'superadmin');
      await assignManagerForRole(mockClient, 10, 'hr');
      await assignManagerForRole(mockClient, 10, 'finance');

      expect(mockClient.query).not.toHaveBeenCalled();
    });

    test('should handle case when HR role does not exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await assignManagerForRole(mockClient, 10, 'employee');

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM roles WHERE name = $1',
        ['hr']
      );
    });

    test('should handle case when no HR users exist', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await assignManagerForRole(mockClient, 10, 'employee');

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).not.toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $2',
        expect.any(Array)
      );
    });

    test('should handle database errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        assignManagerForRole(mockClient, 10, 'employee')
      ).rejects.toThrow('Database error');
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

    test('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(setHRManagerSelf(mockClient, 5)).rejects.toThrow('Database error');
    });
  });

  describe('updateUserRoleWithManager', () => {
    test('should assign manager for employee role', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ name: 'employee' }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 2 }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await updateUserRoleWithManager(mockClient, 10, 1);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT name FROM roles WHERE id = $1',
        [1]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT id FROM roles WHERE name = $1',
        ['hr']
      );
    });

    test('should assign manager for manager role', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ name: 'manager' }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 1 }]
        })
        .mockResolvedValueOnce({
          rows: [{ id: 2 }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await updateUserRoleWithManager(mockClient, 10, 2);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT name FROM roles WHERE id = $1',
        [2]
      );
    });

    test('should set HR manager self for HR role', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{ name: 'hr' }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await updateUserRoleWithManager(mockClient, 5, 3);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT name FROM roles WHERE id = $1',
        [3]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $1',
        [5]
      );
    });

    test('should not assign manager for other roles', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ name: 'superadmin' }]
      });

      await updateUserRoleWithManager(mockClient, 10, 4);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT name FROM roles WHERE id = $1',
        [4]
      );
      // Should not call assignManagerForRole or setHRManagerSelf
      expect(mockClient.query).not.toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $2',
        expect.any(Array)
      );
      expect(mockClient.query).not.toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $1',
        expect.any(Array)
      );
    });

    test('should handle case when role does not exist', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await updateUserRoleWithManager(mockClient, 10, 999);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT name FROM roles WHERE id = $1',
        [999]
      );
      // Should not proceed with manager assignment
      expect(mockClient.query).not.toHaveBeenCalledWith(
        'UPDATE users SET manager_id',
        expect.any(Array)
      );
    });

    test('should handle database errors', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        updateUserRoleWithManager(mockClient, 10, 1)
      ).rejects.toThrow('Database error');
    });

    test('should handle finance role', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [{ name: 'finance' }]
      });

      await updateUserRoleWithManager(mockClient, 10, 5);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT name FROM roles WHERE id = $1',
        [5]
      );
      // Finance role should not trigger manager assignment
      expect(mockClient.query).not.toHaveBeenCalledWith(
        'UPDATE users SET manager_id',
        expect.any(Array)
      );
    });
  });
});

