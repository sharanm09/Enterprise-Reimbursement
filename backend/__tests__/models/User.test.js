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

describe('User Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should find user by id', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      display_name: 'Test User',
      role_name: 'employee'
    };
    pool.query.mockResolvedValue({ rows: [mockUser] });

    const user = await User.findById(1);

    expect(user).toBeInstanceOf(User);
    expect(user.id).toBe(1);
    expect(user.email).toBe('test@example.com');
    expect(pool.query).toHaveBeenCalled();
  });

  test('should return null when user not found', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const user = await User.findById(999);

    expect(user).toBeNull();
  });

  test('should find user by email', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      display_name: 'Test User',
      role_name: 'employee',
      role_display_name: 'Employee'
    };
    pool.query.mockResolvedValue({ rows: [mockUser] });

    const user = await User.findByEmail('test@example.com');

    expect(user).toBeInstanceOf(User);
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBeDefined();
    expect(user.role.name).toBe('employee');
    expect(pool.query).toHaveBeenCalled();
  });

  test('should find user by azure id', async () => {
    const mockUser = {
      id: 1,
      azure_id: 'azure-123',
      email: 'test@example.com',
      role_name: 'employee',
      role_display_name: 'Employee'
    };
    pool.query.mockResolvedValue({ rows: [mockUser] });

    const user = await User.findByAzureId('azure-123');

    expect(user).toBeInstanceOf(User);
    expect(user.azureId).toBe('azure-123');
    expect(user.role).toBeDefined();
    expect(pool.query).toHaveBeenCalled();
  });

  test('should find user by one method', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      display_name: 'Test User'
    };
    pool.query.mockResolvedValue({ rows: [mockUser] });

    const user = await User.findOne({ email: 'test@example.com' });

    expect(user).toBeInstanceOf(User);
    expect(user.email).toBe('test@example.com');
  });

  test('should return null when user not found by one', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const user = await User.findOne({ email: 'nonexistent@example.com' });

    expect(user).toBeNull();
  });

  test('should return null when no conditions provided', async () => {
    const user = await User.findOne({});

    expect(user).toBeNull();
  });
});

