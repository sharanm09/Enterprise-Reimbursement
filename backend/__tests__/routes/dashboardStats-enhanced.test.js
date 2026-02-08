const request = require('supertest');
const express = require('express');
const dashboardStatsRouter = require('../../routes/dashboardStats');
const { pool } = require('../../config/database');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../middleware/auth', () => ({
  isAuthenticated: (req, res, next) => {
    if (req.headers['x-skip-auth'] === 'true') {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    next();
  }
}));

jest.mock('../../middleware/roleChecks', () => ({
  isSuperAdmin: (req, res, next) => {
    if (req.headers['x-is-superadmin'] !== 'true') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  }
}));

describe('Dashboard Stats Routes - Enhanced Coverage', () => {
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
    test('should return stats cards for employee role with role_name filter', async () => {
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

    test('should return stats cards for superadmin with all roles', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'All Stats', role_name: null, is_active: true, display_order: 1 },
          { id: 2, title: 'Manager Stats', role_name: 'manager', is_active: true, display_order: 2 }
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

    test('should handle database errors gracefully', async () => {
      pool.query.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch dashboard stats cards');
    });

    test('should handle empty results', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    test('should handle user with no role', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: null };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'Default Stats', role_name: null, is_active: true, display_order: 1 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('role_name = $1'),
        ['employee']
      );
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
          { id: 3, title: 'Card 3', display_order: 3 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards/all')
        .set('x-is-superadmin', 'true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM dashboard_stats'),
        []
      );
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
        .set('x-is-superadmin', 'true')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /stats-cards', () => {
    test('should create stats card with all fields', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const newCard = {
        id: 1,
        title: 'New Card',
        value: '100',
        subtitle: 'Subtitle',
        icon: 'FiCard',
        emoji: '📊',
        color: 'blue',
        role_name: 'employee',
        display_order: 5
      };

      pool.query.mockResolvedValue({ rows: [newCard] });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .set('x-is-superadmin', 'true')
        .send(newCard)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(newCard);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dashboard_stats'),
        ['New Card', '100', 'Subtitle', 'FiCard', '📊', 'blue', 'employee', 5]
      );
    });

    test('should create stats card with minimal required fields', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const newCard = {
        id: 1,
        title: 'Minimal Card',
        icon: 'FiCard'
      };

      pool.query.mockResolvedValue({ rows: [newCard] });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .set('x-is-superadmin', 'true')
        .send({ title: 'Minimal Card', icon: 'FiCard' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dashboard_stats'),
        ['Minimal Card', '0', null, 'FiCard', null, null, null, 0]
      );
    });

    test('should return 400 when icon is missing', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .set('x-is-superadmin', 'true')
        .send({ title: 'Card without icon' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('icon');
    });

    test('should handle database errors during creation', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .set('x-is-superadmin', 'true')
        .send({ title: 'New Card', icon: 'FiCard' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /stats-cards/:id', () => {
    test('should update stats card with all fields', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const updatedCard = {
        id: 1,
        title: 'Updated Card',
        value: '200',
        subtitle: 'Updated Subtitle',
        icon: 'FiUpdated',
        emoji: '📈',
        color: 'green',
        role_name: 'manager',
        display_order: 10,
        is_active: true
      };

      pool.query.mockResolvedValue({ rows: [updatedCard] });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .set('x-is-superadmin', 'true')
        .send(updatedCard)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedCard);
    });

    test('should update stats card with partial fields', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const updatedCard = {
        id: 1,
        title: 'Partially Updated',
        value: '150'
      };

      pool.query.mockResolvedValue({ rows: [updatedCard] });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .set('x-is-superadmin', 'true')
        .send({ title: 'Partially Updated', value: '150' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle database errors during update', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .set('x-is-superadmin', 'true')
        .send({ title: 'Updated Card' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /stats-cards/:id', () => {
    test('should delete stats card successfully', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'Card to Delete' }]
      });

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/1')
        .set('x-is-superadmin', 'true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    test('should handle database errors during deletion', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/1')
        .set('x-is-superadmin', 'true')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});

