const { pool, initializeDatabase } = require('../config/database');

jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  };
  return {
    Pool: jest.fn(() => mockPool)
  };
});

describe('Database Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should export pool', () => {
    expect(pool).toBeDefined();
  });

  test('should export initializeDatabase function', () => {
    expect(typeof initializeDatabase).toBe('function');
  });

  test('should handle database initialization', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(initializeDatabase()).resolves.not.toThrow();
  });
});


