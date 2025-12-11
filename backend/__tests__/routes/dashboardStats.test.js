const request = require('supertest');
const express = require('express');
const dashboardStatsRouter = require('../../routes/dashboardStats');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Stats Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'employee' } };
      next();
    });
    app.use('/api/dashboard-stats', dashboardStatsRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard-stats/stats-cards', () => {
    test('should return stats cards for employee role', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'My Reimbursements', role_name: 'employee', is_active: true }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard-stats/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    test('should return stats cards for superadmin role', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'All Stats', role_name: null, is_active: true }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard-stats/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/dashboard-stats/stats-cards')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/dashboard-stats/stats-cards/all', () => {
    test('should return all stats cards for superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'Card 1' },
          { id: 2, title: 'Card 2' }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard-stats/stats-cards/all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('should return 403 for non-superadmin', async () => {
      const response = await request(app)
        .get('/api/dashboard-stats/stats-cards/all')
        .expect(403);
    });
  });

  describe('POST /api/dashboard-stats/stats-cards', () => {
    test('should create stats card as superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'New Card', icon: 'FiCard' }]
      });

      const response = await request(app)
        .post('/api/dashboard-stats/stats-cards')
        .send({ title: 'New Card', icon: 'FiCard' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 400 when title is missing', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const response = await request(app)
        .post('/api/dashboard-stats/stats-cards')
        .send({ icon: 'FiCard' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 403 for non-superadmin', async () => {
      const response = await request(app)
        .post('/api/dashboard-stats/stats-cards')
        .send({ title: 'New Card', icon: 'FiCard' })
        .expect(403);
    });
  });

  describe('PUT /api/dashboard-stats/stats-cards/:id', () => {
    test('should update stats card as superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'Updated Card' }]
      });

      const response = await request(app)
        .put('/api/dashboard-stats/stats-cards/1')
        .send({ title: 'Updated Card' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when card not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/dashboard-stats/stats-cards/999')
        .send({ title: 'Updated Card' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/dashboard-stats/stats-cards/:id', () => {
    test('should delete stats card as superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'Card to Delete' }]
      });

      const response = await request(app)
        .delete('/api/dashboard-stats/stats-cards/1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when card not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .delete('/api/dashboard-stats/stats-cards/999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
