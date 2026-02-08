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

jest.mock('../../routes/masterData-crud-helpers', () => ({
  handleGetRequest: jest.fn(),
  handlePostRequest: jest.fn(),
  handlePutRequest: jest.fn(),
  handleDeleteRequest: jest.fn()
}));

describe('Master Data Routes Complete Coverage', () => {
  let app;
  const { handleGetRequest, handlePostRequest, handlePutRequest, handleDeleteRequest } = require('../../routes/masterData-crud-helpers');

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'superadmin' } };
      req.session = { passport: { user: 1 } };
      next();
    });
    app.use('/api/master-data', masterDataRouter);
    jest.clearAllMocks();
  });

  describe('Departments Routes', () => {
    test('GET /departments should call handleGetRequest', async () => {
      handleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/master-data/departments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(handleGetRequest).toHaveBeenCalled();
    });

    test('GET /departments with status filter', async () => {
      handleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/master-data/departments?status=active')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /departments with search filter', async () => {
      handleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/master-data/departments?search=IT')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('POST /departments should call handlePostRequest', async () => {
      handlePostRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 1, name: 'IT', code: 'IT' } });
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(handlePostRequest).toHaveBeenCalled();
    });

    test('PUT /departments/:id should call handlePutRequest', async () => {
      handlePutRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 1, name: 'Updated IT', code: 'IT' } });
      });

      const response = await request(app)
        .put('/api/master-data/departments/1')
        .send({ name: 'Updated IT', code: 'IT' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('DELETE /departments/:id should call handleDeleteRequest', async () => {
      handleDeleteRequest.mockImplementation((req, res) => {
        res.json({ success: true, message: 'Department deactivated successfully' });
      });

      const response = await request(app)
        .delete('/api/master-data/departments/1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Cost Centers Routes', () => {
    test('GET /cost-centers should call handleGetRequest', async () => {
      handleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/master-data/cost-centers')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('GET /cost-centers with department_id filter', async () => {
      handleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/master-data/cost-centers?department_id=1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('POST /cost-centers should call handlePostRequest with postProcess', async () => {
      handlePostRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 1, name: 'Dev', code: 'DEV', department_name: 'IT' } });
      });

      pool.query.mockResolvedValue({ rows: [{ name: 'IT' }] });

      const response = await request(app)
        .post('/api/master-data/cost-centers')
        .send({ name: 'Dev', code: 'DEV', department_id: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('PUT /cost-centers/:id should call handlePutRequest with postProcess', async () => {
      handlePutRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 1, name: 'Updated Dev', code: 'DEV' } });
      });

      pool.query.mockResolvedValue({ rows: [{ name: 'IT' }] });

      const response = await request(app)
        .put('/api/master-data/cost-centers/1')
        .send({ name: 'Updated Dev', code: 'DEV', department_id: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('DELETE /cost-centers/:id should call handleDeleteRequest', async () => {
      handleDeleteRequest.mockImplementation((req, res) => {
        res.json({ success: true, message: 'Cost center deactivated successfully' });
      });

      const response = await request(app)
        .delete('/api/master-data/cost-centers/1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Projects Routes', () => {
    test('GET /projects should call handleGetRequest', async () => {
      handleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .get('/api/master-data/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('POST /projects should call handlePostRequest', async () => {
      handlePostRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 1, name: 'Project A', code: 'PROJ-A' } });
      });

      const response = await request(app)
        .post('/api/master-data/projects')
        .send({ name: 'Project A', code: 'PROJ-A' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('PUT /projects/:id should call handlePutRequest', async () => {
      handlePutRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 1, name: 'Updated Project', code: 'PROJ-A' } });
      });

      const response = await request(app)
        .put('/api/master-data/projects/1')
        .send({ name: 'Updated Project', code: 'PROJ-A' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('DELETE /projects/:id should call handleDeleteRequest', async () => {
      handleDeleteRequest.mockImplementation((req, res) => {
        res.json({ success: true, message: 'Project deactivated successfully' });
      });

      const response = await request(app)
        .delete('/api/master-data/projects/1')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Authentication Middleware', () => {
    test('should return 401 when not authenticated', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(false);
        next();
      });

      const response = await request(app)
        .get('/api/master-data/departments')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('isSuperAdminOrHR should allow superadmin', async () => {
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'superadmin' }
      });

      handleGetRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: [] });
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('isSuperAdminOrHR should allow hr', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'hr' } };
        req.session = { passport: { user: 1 } };
        next();
      });

      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'hr' }
      });

      handlePostRequest.mockImplementation((req, res) => {
        res.json({ success: true, data: { id: 1 } });
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('isSuperAdminOrHR should deny employee', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'employee' } };
        req.session = { passport: { user: 1 } };
        next();
      });

      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'employee' }
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('isSuperAdminOrHR should handle missing user ID', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = {};
        req.session = {};
        next();
      });

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('isSuperAdminOrHR should handle user not found', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 999 };
        req.session = { passport: { user: 999 } };
        next();
      });

      User.findById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('isSuperAdminOrHR should handle database errors', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1 };
        req.session = { passport: { user: 1 } };
        next();
      });

      User.findById.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/master-data/departments')
        .send({ name: 'IT', code: 'IT' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});


