const {
  getMonthlyTrendData,
  getStatusDistributionData,
  getDepartmentWiseData,
  getAmountTrendData
} = require('../../routes/dashboard-helpers');
const { pool } = require('../../config/database');

// Mock pool at module level
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

describe('Dashboard Helpers Extended', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMonthlyTrendData', () => {
    test('should return monthly trend data for employee', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { month: 'Jan 2024', count: '10', total_amount: '1000' },
          { month: 'Feb 2024', count: '15', total_amount: '1500' }
        ]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await getMonthlyTrendData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should return monthly trend data for superadmin', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { month: 'Jan 2024', count: '20', total_amount: '2000' }
        ]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await getMonthlyTrendData(pool, 1, true, false, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getStatusDistributionData', () => {
    test('should return status distribution data', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { status: 'Pending', count: '5', total_amount: '500' },
          { status: 'Approved by Manager', count: '10', total_amount: '1000' }
        ]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await getStatusDistributionData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getDepartmentWiseData', () => {
    test('should return department wise data', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { department: 'IT', count: '10', total_amount: '2000' },
          { department: 'HR', count: '5', total_amount: '1000' }
        ]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await getDepartmentWiseData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getAmountTrendData', () => {
    test('should return amount trend data', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { week: 'Jan 01', total_amount: '1000', paid_amount: '800' },
          { week: 'Jan 08', total_amount: '1500', paid_amount: '1200' }
        ]
      });

      const buildDateFilter = () => ({ filter: '', params: [] });
      const result = await getAmountTrendData(pool, 1, false, false, false, false, buildDateFilter);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

