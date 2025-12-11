const { getMonthlyTrendData } = require('../../routes/dashboard-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Helpers - Role Filters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMonthlyTrendData should use correct role filter for employee', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const buildDateFilter = () => ({ filter: '', params: [] });
    
    await getMonthlyTrendData(pool, 1, false, false, false, false, buildDateFilter);
    
    // Verify query was called with userId in params
    expect(pool.query).toHaveBeenCalled();
    const callArgs = pool.query.mock.calls[0];
    expect(callArgs[1]).toContain(1);
  });

  test('getMonthlyTrendData should use correct role filter for superadmin', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const buildDateFilter = () => ({ filter: '', params: [] });
    
    await getMonthlyTrendData(pool, 1, true, false, false, false, buildDateFilter);
    
    // Verify query was called without userId in params
    expect(pool.query).toHaveBeenCalled();
    const callArgs = pool.query.mock.calls[0];
    expect(callArgs[1]).not.toContain(1);
  });

  test('getMonthlyTrendData should use correct role filter for finance', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const buildDateFilter = () => ({ filter: '', params: [] });
    
    await getMonthlyTrendData(pool, 1, false, true, false, false, buildDateFilter);
    
    expect(pool.query).toHaveBeenCalled();
    const callArgs = pool.query.mock.calls[0];
    expect(callArgs[1]).not.toContain(1);
  });

  test('getMonthlyTrendData should use correct role filter for manager', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const buildDateFilter = () => ({ filter: '', params: [] });
    
    await getMonthlyTrendData(pool, 1, false, false, true, false, buildDateFilter);
    
    expect(pool.query).toHaveBeenCalled();
    const callArgs = pool.query.mock.calls[0];
    expect(callArgs[1]).toContain(1);
  });

  test('getMonthlyTrendData should use correct role filter for HR', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const buildDateFilter = () => ({ filter: '', params: [] });
    
    await getMonthlyTrendData(pool, 1, false, false, false, true, buildDateFilter);
    
    expect(pool.query).toHaveBeenCalled();
    const callArgs = pool.query.mock.calls[0];
    expect(callArgs[1]).not.toContain(1);
  });
});

describe('Dashboard Helpers - Role Filters', () => {
  test('buildRoleFilterQuery should return empty query for superadmin', () => {
    const result = buildRoleFilterQuery(true, false, false, false, 1);
    expect(result.query).toBe('');
    expect(result.params).toEqual([]);
  });

  test('buildRoleFilterQuery should return empty query for finance', () => {
    const result = buildRoleFilterQuery(false, true, false, false, 1);
    expect(result.query).toBe('');
    expect(result.params).toEqual([]);
  });

  test('buildRoleFilterQuery should return manager filter', () => {
    const result = buildRoleFilterQuery(false, false, true, false, 1);
    expect(result.query).toContain('manager_id');
    expect(result.params).toContain(1);
  });

  test('buildRoleFilterQuery should return HR filter', () => {
    const result = buildRoleFilterQuery(false, false, false, true, 1);
    expect(result.query).toContain('manager_id');
    expect(result.params).toEqual([]);
  });

  test('buildRoleFilterQuery should return user filter for employee', () => {
    const result = buildRoleFilterQuery(false, false, false, false, 1);
    expect(result.query).toContain('user_id');
    expect(result.params).toContain(1);
  });
});

