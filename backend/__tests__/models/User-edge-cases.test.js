const User = require('../../models/User');
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

describe('User Model Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPER_ADMIN_EMAIL = 'admin@qwikhire.ai';
  });

  describe('findOne', () => {
    test('should handle multiple conditions', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          azure_id: 'azure123',
          email: 'test@example.com',
          role_name: 'employee'
        }]
      });

      const user = await User.findOne({ azureId: 'azure123', email: 'test@example.com' });

      expect(user).toBeDefined();
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('azure_id = $1'),
        expect.arrayContaining(['azure123', 'test@example.com'])
      );
    });

    test('should handle user without role', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          azure_id: 'azure123',
          email: 'test@example.com',
          role_name: null
        }]
      });

      const user = await User.findOne({ azureId: 'azure123' });

      expect(user).toBeDefined();
      expect(user.role).toBeUndefined();
    });
  });

  describe('save', () => {
    test('should handle missing azureId', async () => {
      const user = new User({
        displayName: 'Test User',
        email: 'test@example.com'
      });

      await expect(user.save()).rejects.toThrow('azureId is required');
    });

    test('should handle missing displayName', async () => {
      const user = new User({
        azureId: 'azure123',
        email: 'test@example.com'
      });

      await expect(user.save()).rejects.toThrow('displayName is required');
    });

    test('should handle missing email', async () => {
      const user = new User({
        azureId: 'azure123',
        displayName: 'Test User'
      });

      await expect(user.save()).rejects.toThrow('email is required');
    });

    test('should handle role assignment when roleId already exists', async () => {
      const user = new User({
        id: 1,
        azureId: 'azure123',
        displayName: 'Test User',
        email: 'test@example.com',
        roleId: 5
      });

      user.updateUser = jest.fn().mockResolvedValue(user);

      await user.save();

      expect(user.updateUser).toHaveBeenCalled();
      expect(pool.query).not.toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM roles'),
        expect.any(Array)
      );
    });

    test('should handle employee role assignment with HR manager not found', async () => {
      const user = new User({
        azureId: 'azure123',
        displayName: 'Test User',
        email: 'employee@example.com'
      });

      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // Employee role
        .mockResolvedValueOnce({ rows: [{ name: 'employee' }] }) // Role name
        .mockResolvedValueOnce({ rows: [] }) // HR role not found
        .mockResolvedValueOnce({ rows: [{ ...user.toJSON(), id: 8, role_id: 2 }] }); // Created user

      await user.save();

      expect(user.id).toBe(8);
      expect(user.roleId).toBe(2);
    });

    test('should handle employee role assignment with no HR users', async () => {
      const user = new User({
        azureId: 'azure123',
        displayName: 'Test User',
        email: 'employee@example.com'
      });

      pool.query
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // Employee role
        .mockResolvedValueOnce({ rows: [{ name: 'employee' }] }) // Role name
        .mockResolvedValueOnce({ rows: [{ id: 3 }] }) // HR role
        .mockResolvedValueOnce({ rows: [] }) // No HR users
        .mockResolvedValueOnce({ rows: [{ ...user.toJSON(), id: 8, role_id: 2 }] }); // Created user

      await user.save();

      expect(user.id).toBe(8);
      expect(user.roleId).toBe(2);
    });
  });

  describe('updateRole', () => {
    test('should handle role update when user ID is missing', async () => {
      const user = new User({
        email: 'test@example.com'
      });

      await expect(user.updateRole(2)).rejects.toThrow('User ID is not set');
    });

    test('should handle role update when roleId is null', async () => {
      const user = new User({
        id: 1,
        email: 'test@example.com'
      });

      await expect(user.updateRole(null)).rejects.toThrow('Role ID is required');
    });

    test('should handle role update when roleId is undefined', async () => {
      const user = new User({
        id: 1,
        email: 'test@example.com'
      });

      await expect(user.updateRole(undefined)).rejects.toThrow('Role ID is required');
    });
  });

  describe('assignRole', () => {
    test('should return existing roleId', async () => {
      const user = new User({
        roleId: 5
      });

      const roleId = await user.assignRole(false);

      expect(roleId).toBe(5);
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('should handle superadmin role not found', async () => {
      const user = new User({
        email: 'admin@qwikhire.ai'
      });

      pool.query.mockResolvedValueOnce({ rows: [] });

      const roleId = await user.assignRole(true);

      expect(roleId).toBeNull();
    });

    test('should handle employee role not found', async () => {
      const user = new User({
        email: 'employee@example.com'
      });

      pool.query.mockResolvedValueOnce({ rows: [] });

      const roleId = await user.assignRole(false);

      expect(roleId).toBeNull();
    });
  });

  describe('assignManager', () => {
    test('should return null for hr role', async () => {
      const user = new User({});

      const managerId = await user.assignManager('hr');

      expect(managerId).toBeNull();
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('should return null for finance role', async () => {
      const user = new User({});

      const managerId = await user.assignManager('finance');

      expect(managerId).toBeNull();
      expect(pool.query).not.toHaveBeenCalled();
    });

    test('should return null for superadmin role', async () => {
      const user = new User({});

      const managerId = await user.assignManager('superadmin');

      expect(managerId).toBeNull();
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    test('should handle HR role with self manager assignment', async () => {
      const user = new User({
        azureId: 'hr123',
        displayName: 'HR User',
        email: 'hr@example.com'
      });

      pool.query
        .mockResolvedValueOnce({
          rows: [{
            ...user.toJSON(),
            id: 5,
            role_id: 3,
            manager_id: null
          }]
        })
        .mockResolvedValueOnce({ rows: [] });

      await user.createUser(3, null, 'hr');

      expect(user.id).toBe(5);
      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE users SET manager_id = $1 WHERE id = $1',
        [5]
      );
    });

    test('should handle user creation without surname', async () => {
      const user = new User({
        azureId: 'user123',
        displayName: 'Test User',
        email: 'test@example.com',
        givenName: 'Test'
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          ...user.toJSON(),
          id: 1,
          role_id: 2,
          manager_id: 10
        }]
      });

      await user.createUser(2, 10, 'employee');

      expect(user.id).toBe(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([null, null])
      );
    });
  });
});


