const request = require('supertest');
const express = require('express');
const dashboardStatsRouter = require('../../routes/dashboardStats');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Dashboard Stats Routes Extended', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'superadmin' } };
      next();
    });
    app.use('/api/dashboard', dashboardStatsRouter);
    jest.clearAllMocks();
  });

  describe('POST /api/dashboard/stats-cards', () => {
    test('should create dashboard stats card', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'New Card',
          value: '100',
          icon: 'FiStar'
        }]
      });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({
          title: 'New Card',
          value: '100',
          icon: 'FiStar'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('should return error when title is missing', async () => {
      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({
          value: '100',
          icon: 'FiStar'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return error when icon is missing', async () => {
      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({
          title: 'New Card',
          value: '100'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/dashboard/stats-cards/:id', () => {
    test('should update dashboard stats card', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'Updated Card',
          value: '200',
          icon: 'FiStar'
        }]
      });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .send({
          title: 'Updated Card',
          value: '200'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when card not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/999')
        .send({
          title: 'Updated Card',
          value: '200'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/dashboard/stats-cards/:id', () => {
    test('should delete dashboard stats card', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'Card to Delete' }]
      });

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when card not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/dashboard/stats-cards/all', () => {
    test('should return all dashboard stats cards for superadmin', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'Card 1' },
          { id: 2, title: 'Card 2' }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards/all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });
});


