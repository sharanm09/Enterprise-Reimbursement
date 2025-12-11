const request = require('supertest');
const express = require('express');
const dashboardRouter = require('../../routes/dashboard');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Routes Extended', () => {
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

  describe('GET /api/dashboard/stats - Extended scenarios', () => {
    test('should handle finance role', async () => {
      const app2 = express();
      app2.use(express.json());
      app2.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'finance' } };
        next();
      });
      app2.use('/api/dashboard', dashboardRouter);

      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '10', total: '2000.00' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app2)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle HR role', async () => {
      const app3 = express();
      app3.use(express.json());
      app3.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'hr' } };
        next();
      });
      app3.use('/api/dashboard', dashboardRouter);

      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '5', total: '1000.00' }] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app3)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle manager role', async () => {
      const app4 = express();
      app4.use(express.json());
      app4.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'manager' } };
        next();
      });
      app4.use('/api/dashboard', dashboardRouter);

      pool.query
        .mockResolvedValueOnce({ rows: [{ count: '8', total: '1500.00' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app4)
        .get('/api/dashboard/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/dashboard/charts - Extended scenarios', () => {
    test('should return chart data for finance role', async () => {
      const app5 = express();
      app5.use(express.json());
      app5.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'finance' } };
        next();
      });
      app5.use('/api/dashboard', dashboardRouter);

      pool.query
        .mockResolvedValue({ rows: [] });

      const response = await request(app5)
        .get('/api/dashboard/charts')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return chart data for HR role', async () => {
      const app6 = express();
      app6.use(express.json());
      app6.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'hr' } };
        next();
      });
      app6.use('/api/dashboard', dashboardRouter);

      pool.query
        .mockResolvedValue({ rows: [] });

      const response = await request(app6)
        .get('/api/dashboard/charts')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});


