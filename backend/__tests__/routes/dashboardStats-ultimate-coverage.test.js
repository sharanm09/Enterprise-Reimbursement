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

describe('Dashboard Stats Ultimate Coverage', () => {
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
        expect.stringContaining('role_name = \'superadmin\''),
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
        rows: [
          { id: 1, title: 'Pending Approvals', role_name: 'manager', is_active: true, display_order: 1 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE (role_name = $1 OR role_name IS NULL)'),
        ['manager']
      );
    });

    test('should handle missing role name', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'Default Card', role_name: null, is_active: true, display_order: 1 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE (role_name = $1 OR role_name IS NULL)'),
        ['employee']
      );
    });

    test('should handle database error', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Failed to fetch dashboard stats cards');
    });

    test('should filter by is_active = true', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'Active Card', is_active: true, display_order: 1 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND is_active = true'),
        expect.any(Array)
      );
    });

    test('should order by display_order ASC', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, title: 'First', display_order: 1 },
          { id: 2, title: 'Second', display_order: 2 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY display_order ASC'),
        expect.any(Array)
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
          { id: 2, title: 'Card 2', display_order: 2 }
        ]
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards/all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM dashboard_stats'),
        []
      );
    });

    test('should return 403 for non-superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'employee' } };
        next();
      });

      const response = await request(app)
        .get('/api/dashboard/stats-cards/all')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should handle database error', async () => {
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
    test('should create new stats card', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const newCard = {
        id: 1,
        title: 'New Card',
        value: '100',
        icon: 'FiStar',
        color: 'blue',
        role_name: 'employee',
        display_order: 1
      };

      pool.query.mockResolvedValue({
        rows: [newCard]
      });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({
          title: 'New Card',
          value: '100',
          icon: 'FiStar',
          color: 'blue',
          role_name: 'employee',
          display_order: 1
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(newCard);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dashboard_stats'),
        ['New Card', '100', null, 'FiStar', null, 'blue', 'employee', 1]
      );
    });

    test('should return 400 if title is missing', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({
          value: '100',
          icon: 'FiStar'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title and icon are required');
    });

    test('should return 400 if icon is missing', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({
          title: 'New Card',
          value: '100'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Title and icon are required');
    });

    test('should use default values for optional fields', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'New Card', value: '0', icon: 'FiStar' }]
      });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({
          title: 'New Card',
          icon: 'FiStar'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dashboard_stats'),
        ['New Card', '0', null, 'FiStar', null, null, null, 0]
      );
    });

    test('should handle database error', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({
          title: 'New Card',
          icon: 'FiStar'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should return 403 for non-superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'employee' } };
        next();
      });

      const response = await request(app)
        .post('/api/dashboard/stats-cards')
        .send({
          title: 'New Card',
          icon: 'FiStar'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /stats-cards/:id', () => {
    test('should update stats card', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      const updatedCard = {
        id: 1,
        title: 'Updated Card',
        value: '200',
        icon: 'FiStar',
        color: 'red',
        role_name: 'manager',
        display_order: 2,
        is_active: true
      };

      pool.query.mockResolvedValue({
        rows: [updatedCard]
      });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .send({
          title: 'Updated Card',
          value: '200',
          color: 'red',
          role_name: 'manager',
          display_order: 2,
          is_active: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedCard);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE dashboard_stats'),
        expect.arrayContaining([1])
      );
    });

    test('should return 404 if card not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: []
      });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/999')
        .send({
          title: 'Updated Card'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Dashboard stats card not found');
    });

    test('should handle partial updates', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'Updated Card', value: '100' }]
      });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .send({
          title: 'Updated Card'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle database error', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .send({
          title: 'Updated Card'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should return 403 for non-superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'employee' } };
        next();
      });

      const response = await request(app)
        .put('/api/dashboard/stats-cards/1')
        .send({
          title: 'Updated Card'
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /stats-cards/:id', () => {
    test('should delete stats card', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: [{ id: 1, title: 'Deleted Card' }]
      });

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Dashboard stats card deleted successfully');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dashboard_stats'),
        [1]
      );
    });

    test('should return 404 if card not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockResolvedValue({
        rows: []
      });

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Dashboard stats card not found');
    });

    test('should handle database error', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'superadmin' } };
        next();
      });

      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/api/dashboard/stats-cards/1')
        .expect(500);

      expect(response.body.success).toBe(false);
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

      expect(response.body.success).toBe(false);
    });
  });
});

