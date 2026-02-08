const {
  getWeeklyTrendData,
  getDailyData,
  getCategoryWiseData
} = require('../../routes/dashboard-helpers');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Helpers More', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeeklyTrendData', () => {
    test('should return weekly trend data', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { day: 'Mon', date: '01', count: '5', total_amount: '500' },
          { day: 'Tue', date: '02', count: '8', total_amount: '800' }
        ]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await getWeeklyTrendData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getDailyData', () => {
    test('should return daily data', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { day: '01', count: '2', total_amount: '200', approved_amount: '150', rejected_amount: '50' },
          { day: '02', count: '3', total_amount: '300', approved_amount: '250', rejected_amount: '50' }
        ]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await getDailyData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getCategoryWiseData', () => {
    test('should return category wise data', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { category: 'Travel', count: '10', total_amount: '2000' },
          { category: 'Meals', count: '5', total_amount: '500' }
        ]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await getCategoryWiseData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

