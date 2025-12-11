const request = require('supertest');
const express = require('express');
const masterDataRouter = require('../../routes/masterData');
const { pool } = require('../../config/database');
const User = require('../../models/User');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../../middleware/auth', () => ({
  isAuthenticated: (req, res, next) => {
    if (req.headers['x-skip-auth'] === 'true') {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    next();
  }
}));

jest.mock('../../routes/masterData-crud-helpers', () => ({
  handleGetRequest: jest.fn((req, res, config) => {
    res.json({ success: true, data: [] });
  }),
  handlePostRequest: jest.fn((req, res, config) => {
    res.json({ success: true, data: { id: 1 } });
  }),
  handlePutRequest: jest.fn((req, res, config) => {
    res.json({ success: true, data: { id: 1 } });
  }),
  handleDeleteRequest: jest.fn((req, res, config) => {
    res.json({ success: true, message: 'Deleted' });
  })
}));

describe('Master Data Routes - Enhanced Coverage', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'hr' } };
      req.session = {};
      next();
    });
    app.use('/api/master-data', masterDataRouter);
    jest.clearAllMocks();
  });

  describe('isSuperAdminOrHR middleware', () => {
    test('should allow superadmin access', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'superadmin' }
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = {};
        next();
      });

      const response = await request(app)
        .get('/api/master-data/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should allow HR access', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'hr' }
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = {};
        next();
      });

      const response = await request(app)
        .get('/api/master-data/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should deny access when not authenticated', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(false);
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should deny access when user ID not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = {};
        req.session = {};
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should deny access when user not found', async () => {
      User.findById.mockResolvedValue(null);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 999 };
        req.session = {};
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should deny access for non-superadmin/non-HR roles', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'employee' }
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = {};
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should handle errors in middleware', async () => {
      User.findById.mockRejectedValue(new Error('Database error'));

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = {};
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle user with no role', async () => {
      const mockUser = {
        id: 1,
        role: null
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = {};
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /departments', () => {
    test('should fetch departments successfully', async () => {
      const response = await request(app)
        .get('/api/master-data/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /departments', () => {
    test('should create department as HR', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'hr' }
      };

      User.findById.mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = {};
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'Test Dept', code: 'TD', description: 'Test', status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /cost-centers', () => {
    test('should fetch cost centers with department filter', async () => {
      const response = await request(app)
        .get('/api/master-data/cost-centers?department_id=1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /cost-centers', () => {
    test('should create cost center with department', async () => {
      const mockUser = {
        id: 1,
        role: { name: 'hr' }
      };

      User.findById.mockResolvedValue(mockUser);
      pool.query.mockResolvedValue({ rows: [{ name: 'IT Department' }] });

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = {};
        next();
      });

      const response = await request(app)
        .post('/api/master-data/cost-centers')
        .send({ name: 'CC1', code: 'CC1', department_id: 1, description: 'Test', status: 'active' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /projects', () => {
    test('should fetch projects successfully', async () => {
      const response = await request(app)
        .get('/api/master-data/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

