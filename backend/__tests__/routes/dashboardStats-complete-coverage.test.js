const request = require('supertest');
const express = require('express');
const dashboardStatsRouter = require('../../routes/dashboardStats');
const { pool } = require('../../config/database');
const { isSuperAdmin } = require('../../middleware/roleChecks');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../middleware/auth', () => ({
  isAuthenticated: jest.fn((req, res, next) => {
    req.isAuthenticated = jest.fn().mockReturnValue(true);
    next();
  })
}));

jest.mock('../../middleware/roleChecks', () => ({
  isSuperAdmin: jest.fn((req, res, next) => {
    const userRole = req.user?.role?.name || 'employee';
    if (userRole === 'superadmin') {
      return next();
    }
    return res.status(403).json({ success: false, message: 'Access denied' });
  })
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('Dashboard Stats Complete Coverage', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'employee' } };
      next();
    });
    app.use('/api/dashboard', dashboardStatsRouter);
    jest.clearAllMocks();
  });

  describe('GET /stats-cards', () => {
    test('should return stats cards for employee role', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'My Reimbursements', role_name: 'employee', is_active: true, display_order: 1 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE (role_name = $1 OR role_name IS NULL)'),
        ['employee']
      );
    });

    test('should return stats cards for superadmin role with all roles', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'Total Users', role_name: 'superadmin', is_active: true, display_order: 1 },
          { id: 2, title: 'Departments', role_name: null, is_active: true, display_order: 2 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('role_name = \'superadmin\' OR role_name = \'employee\''),
        []
      );
    });

    test('should handle role name from user.role.name', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'manager' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'Pending Approvals', role_name: 'manager', is_active: true, display_order: 1 }]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should default to employee role when role.name is missing', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: {} };
        next();
      });

      pool.query.mockResolvedValue({
        rows: []
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch dashboard stats cards');
    });
  });

  describe('GET /stats-cards/all', () => {
    test('should return all stats cards for superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'Card 1', display_order: 1 },
          { id: 2, title: 'Card 2', display_order: 2 },
          { id: 3, title: 'Card 3', is_active: false, display_order: 3 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards/all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM dashboard_stats')
      );
    });

    test('should return 403 for non-superadmin', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats-cards/all')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should handle database errors', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/dashboard/stats-cards/all')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /stats-cards', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });
    });

    test('should create stats card with all fields', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'New Card',
          value: '100',
          subtitle: 'Subtitle',
          icon: 'FiCard',
          emoji: '🎉',
          color: 'blue',
          role_name: 'employee',
          display_order: 1
        }]
      });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({
          title: 'New Card',
          value: '100',
          subtitle: 'Subtitle',
          icon: 'FiCard',
          emoji: '🎉',
          color: 'blue',
          role_name: 'employee',
          display_order: 1
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('New Card');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dashboard_stats'),
        ['New Card', '100', 'Subtitle', 'FiCard', '🎉', 'blue', 'employee', 1]
      );
    });

    test('should create stats card with minimal required fields', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'Minimal Card', icon: 'FiIcon', value: '0' }]
      });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({ title: 'Minimal Card', icon: 'FiIcon' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dashboard_stats'),
        ['Minimal Card', '0', null, 'FiIcon', null, null, null, 0]
      );
    });

    test('should return 400 when title is missing', async () => {
      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({ icon: 'FiCard' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title and icon are required');
    });

    test('should return 400 when icon is missing', async () => {
      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({ title: 'Card Title' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title and icon are required');
    });

    test('should return 403 for non-superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'employee' } };
        next();
      });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({ title: 'New Card', icon: 'FiCard' })
        .expect(403);
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({ title: 'New Card', icon: 'FiCard' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /stats-cards/:id', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });
    });

    test('should update stats card with all fields', async () => {
      pool.query.mockResolvedValue({
        rows: [{
          id: 1,
          title: 'Updated Card',
          value: '200',
          subtitle: 'Updated Subtitle',
          icon: 'FiUpdated',
          emoji: '✅',
          color: 'green',
          role_name: 'manager',
          display_order: 2,
          is_active: true
        }]
      });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .send({
          title: 'Updated Card',
          value: '200',
          subtitle: 'Updated Subtitle',
          icon: 'FiUpdated',
          emoji: '✅',
          color: 'green',
          role_name: 'manager',
          display_order: 2,
          is_active: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Card');
    });

    test('should update stats card with partial fields', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'Original', value: '100', icon: 'FiIcon' }]
      });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 404 when card not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/999')
        .send({ title: 'Updated Card' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Dashboard stats card not found');
    });

    test('should return 403 for non-superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'employee' } };
        next();
      });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .send({ title: 'Updated Card' })
        .expect(403);
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .send({ title: 'Updated Card' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /stats-cards/:id', () => {
    beforeEach(() => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });
    });

    test('should delete stats card successfully', async () => {
      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'Card to Delete' }]
      });

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Dashboard stats card deleted successfully');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dashboard_stats'),
        ['1']
      );
    });

    test('should return 404 when card not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Dashboard stats card not found');
    });

    test('should return 403 for non-superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'employee' } };
        next();
      });

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/1')
        .expect(403);
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/1')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});

