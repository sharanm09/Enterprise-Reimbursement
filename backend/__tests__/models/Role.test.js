const Role = require('../../models/Role');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Role Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should find role by name', async () => {
    const mockRole = { id: 1, name: 'admin', display_name: 'Admin' };
    pool.query.mockResolvedValue({ rows: [mockRole] });

    const role = await Role.findByName('admin');

    expect(role).toBeInstanceOf(Role);
    expect(role.id).toBe(1);
    expect(role.name).toBe('admin');
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM roles WHERE name = $1',
      ['admin']
    );
  });

  test('should return null when role not found', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const role = await Role.findByName('nonexistent');

    expect(role).toBeNull();
  });

  test('should find role by id', async () => {
    const mockRole = { id: 1, name: 'admin', display_name: 'Admin' };
    pool.query.mockResolvedValue({ rows: [mockRole] });

    const role = await Role.findById(1);

    expect(role).toBeInstanceOf(Role);
    expect(role.id).toBe(1);
    expect(role.name).toBe('admin');
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM roles WHERE id = $1',
      [1]
    );
  });

  test('should return null when role id not found', async () => {
    pool.query.mockResolvedValue({ rows: [] });

    const role = await Role.findById(999);

    expect(role).toBeNull();
  });

  test('should handle errors', async () => {
    const error = new Error('Database error');
    pool.query.mockRejectedValue(error);

    await expect(Role.findById(1)).rejects.toThrow('Database error');
  });

  test('should find all roles', async () => {
    const mockRoles = [
      { id: 1, name: 'admin', display_name: 'Admin' },
      { id: 2, name: 'user', display_name: 'User' }
    ];
    pool.query.mockResolvedValue({ rows: mockRoles });

    const roles = await Role.findAll();

    expect(roles).toHaveLength(2);
    expect(roles[0]).toBeInstanceOf(Role);
    expect(roles[1]).toBeInstanceOf(Role);
  });
});

