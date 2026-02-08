const request = require('supertest');
const express = require('express');
const dashboardRouter = require('../../routes/dashboard');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'employee' } };
      next();
    });
    app.use('/api/dashboard', dashboardRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard/stats', () => {
    test('should return dashboard stats for employee', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '5', total: '1000.00' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2', total: '500.00' }] })
        .mockResolvedValueOnce({ rows: [{ total: '2000.00' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should return dashboard stats for manager', async () => {
      const app2 = express();
      app2.use(express.json());
      app2.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'manager' } };
        next();
      });
      app2.use('/api/dashboard', dashboardRouter);

      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '10', total: '2000.00' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app2)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return dashboard stats for superadmin', async () => {
      const app3 = express();
      app3.use(express.json());
      app3.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });
      app3.use('/api/dashboard', dashboardRouter);

      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '20' }] })
        .mockResolvedValueOnce({ rows: [{ count: '15' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app3)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle date filters', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '5', total: '1000.00' }] })
        .mockResolvedValueOnce({ rows: [{ count: '2', total: '500.00' }] })
        .mockResolvedValueOnce({ rows: [{ total: '2000.00' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/dashboard/stats?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 401 when not authenticated', async () => {
      const app4 = express();
      app4.use(express.json());
      app4.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(false);
        next();
      });
      app4.use('/api/dashboard', dashboardRouter);

      await request(app4)
        .get('/api/dashboard/stats')
        .expect(401);
    });
  });

  describe('GET /api/dashboard/charts', () => {
    test('should return chart data', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/dashboard/charts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should handle date filters in charts', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/dashboard/charts?startDate=2024-01-01&endDate=2024-12-31')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});


