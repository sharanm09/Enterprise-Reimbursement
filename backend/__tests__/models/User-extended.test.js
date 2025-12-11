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

describe('User Model Extended', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should find all users', async () => {
    const mockUsers = [
      { id: 1, email: 'user1@example.com', role_name: 'employee' },
      { id: 2, email: 'user2@example.com', role_name: 'manager' }
    ];
    pool.query.mockResolvedValue({ rows: mockUsers });

    const users = await User.findAll();

    expect(users).toHaveLength(2);
    expect(users[0]).toBeInstanceOf(User);
  });

  test('should find user by one with multiple conditions', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      azure_id: 'azure-123',
      role_name: 'employee'
    };
    pool.query.mockResolvedValue({ rows: [mockUser] });

    const user = await User.findOne({ email: 'test@example.com', azureId: 'azure-123' });

    expect(user).toBeInstanceOf(User);
    expect(user.email).toBe('test@example.com');
  });

  test('should update user', async () => {
    const user = new User({
      id: 1,
      displayName: 'Updated Name',
      email: 'updated@example.com',
      givenName: 'Updated',
      surname: 'Name',
      lastLogin: new Date()
    });

    pool.query.mockResolvedValue({
      rows: [{
        id: 1,
        display_name: 'Updated Name',
        email: 'updated@example.com'
      }]
    });

    const result = await user.updateUser();

    expect(result).toBeInstanceOf(User);
    expect(pool.query).toHaveBeenCalled();
  });

  test('should assign role for superadmin', async () => {
    const user = new User({ email: 'admin@example.com' });
    pool.query.mockResolvedValue({ rows: [{ id: 1 }] });

    const roleId = await user.assignRole(true);

    expect(roleId).toBe(1);
  });

  test('should assign role for employee', async () => {
    const user = new User({ email: 'user@example.com' });
    pool.query.mockResolvedValue({ rows: [{ id: 2 }] });

    const roleId = await user.assignRole(false);

    expect(roleId).toBe(2);
  });

  test('should assign manager for employee', async () => {
    const user = new User({ email: 'user@example.com' });
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ id: 10 }] });

    const managerId = await user.assignManager('employee');

    expect(managerId).toBe(10);
  });

  test('should not assign manager for non-employee/manager roles', async () => {
    const user = new User({ email: 'hr@example.com' });
    const managerId = await user.assignManager('hr');

    expect(managerId).toBeNull();
  });

  test('should create user', async () => {
    const user = new User({
      azureId: 'azure-123',
      displayName: 'Test User',
      email: 'test@example.com',
      givenName: 'Test',
      surname: 'User'
    });

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, azure_id: 'azure-123' }] })
      .mockResolvedValueOnce();

    const result = await user.createUser(1, 10, 'employee');

    expect(result).toBeInstanceOf(User);
  });

  test('should create HR user with self as manager', async () => {
    const user = new User({
      azureId: 'azure-hr',
      displayName: 'HR User',
      email: 'hr@example.com'
    });

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 5, azure_id: 'azure-hr' }] })
      .mockResolvedValueOnce();

    const result = await user.createUser(3, null, 'hr');

    expect(result).toBeInstanceOf(User);
    expect(pool.query).toHaveBeenCalledTimes(2);
  });

  test('should save existing user', async () => {
    const user = new User({
      id: 1,
      azureId: 'azure-123',
      displayName: 'Test User',
      email: 'test@example.com'
    });

    pool.query.mockResolvedValue({
      rows: [{ id: 1, display_name: 'Test User' }]
    });

    const result = await user.save();

    expect(result).toBeInstanceOf(User);
  });

  test('should save new user as superadmin', async () => {
    process.env.SUPER_ADMIN_EMAIL = 'admin@example.com';
    const user = new User({
      azureId: 'azure-admin',
      displayName: 'Admin User',
      email: 'admin@example.com'
    });

    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [{ name: 'superadmin' }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, azure_id: 'azure-admin' }] });

    const result = await user.save();

    expect(result).toBeInstanceOf(User);
  });

  test('should throw error when azureId is missing', async () => {
    const user = new User({
      displayName: 'Test User',
      email: 'test@example.com'
    });

    await expect(user.save()).rejects.toThrow('azureId is required');
  });

  test('should update role', async () => {
    const user = new User({ id: 1, email: 'test@example.com' });
    pool.query.mockResolvedValue({
      rows: [{ id: 1, role_id: 2 }]
    });

    const result = await user.updateRole(2);

    expect(result).toBeInstanceOf(User);
    expect(result.roleId).toBe(2);
  });

  test('should throw error when updating role without user id', async () => {
    const user = new User({ email: 'test@example.com' });

    await expect(user.updateRole(2)).rejects.toThrow();
  });
});


