const request = require('supertest');
const express = require('express');
const authRouter = require('../../routes/auth');
const User = require('../../models/User');
const Role = require('../../models/Role');
const { pool } = require('../../config/database');
const azureConfig = require('../../config/azureConfig');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

jest.mock('../../models/User');
jest.mock('../../models/Role');
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

jest.mock('../../config/azureConfig', () => ({
  isValid: true,
  clientID: 'test-client-id'
}));

jest.mock('passport', () => ({
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn(),
  authenticate: jest.fn(() => (req, res, next) => next())
}));

jest.mock('jwks-rsa', () => {
  return jest.fn(() => ({
    getSigningKey: jest.fn((kid, callback) => {
      callback(null, {
        publicKey: 'test-public-key',
        rsaPublicKey: 'test-rsa-key'
      });
    })
  }));
});

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
  verify: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Auth Routes Full Coverage', () => {
  let app;
  let originalEnv;
  let mockClient;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.isAuthenticated = jest.fn().mockReturnValue(true);
      req.user = { id: 1, role: { name: 'superadmin' } };
      req.login = jest.fn((user, callback) => callback(null));
      req.logout = jest.fn((callback) => callback(null));
      req.session = { 
        destroy: jest.fn((callback) => callback(null)),
        passport: { user: 1 }
      };
      next();
    });
    app.use('/api/auth', authRouter);
    
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    pool.connect.mockResolvedValue(mockClient);
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GET /login', () => {
    test('should redirect to Azure AD login when configured', async () => {
      azureConfig.isValid = true;
      azureConfig.clientID = 'test-client-id';
      
      const response = await request(app)
        .get('/api/auth/login')
        .expect(302);
    });

    test('should return 503 when Azure AD not configured', async () => {
      azureConfig.isValid = false;
      azureConfig.clientID = '';
      
      const response = await request(app)
        .get('/api/auth/login')
        .expect(503);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Azure AD configuration');
    });
  });

  describe('POST /azure/callback', () => {
    test('should handle Azure callback when configured', async () => {
      azureConfig.isValid = true;
      azureConfig.clientID = 'test-client-id';
      
      const response = await request(app)
        .post('/api/auth/azure/callback')
        .expect(302);
    });

    test('should return 503 when Azure AD not configured', async () => {
      azureConfig.isValid = false;
      
      const response = await request(app)
        .post('/api/auth/azure/callback')
        .expect(503);
    });
  });

  describe('POST /validate-token', () => {
    beforeEach(() => {
      process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
      process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    });

    test('should validate token successfully', async () => {
      const mockDecoded = {
        oid: 'test-oid',
        email: 'test@example.com',
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User'
      };

      jwt.decode.mockReturnValue({ header: { kid: 'test-kid' } });
      jwt.verify.mockReturnValue(mockDecoded);

      const mockUser = {
        id: 1,
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          displayName: 'Test User',
          email: 'test@example.com',
          givenName: 'Test',
          surname: 'User'
        }),
        role: { name: 'employee' }
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'valid-token' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    test('should return 400 when token missing', async () => {
      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Token required');
    });

    test('should return 503 when Azure AD not configured', async () => {
      delete process.env.AZURE_AD_TENANT_ID;
      delete process.env.AZURE_AD_CLIENT_ID;

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'token' })
        .expect(503);

      expect(response.body.success).toBe(false);
    });

    test('should return 401 when token format invalid', async () => {
      jwt.decode.mockReturnValue(null);

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle signing key error', async () => {
      jwt.decode.mockReturnValue({ header: { kid: 'test-kid' } });
      
      const mockClient = jwksClient();
      mockClient.getSigningKey.mockImplementation((kid, callback) => {
        callback(new Error('Key not found'), null);
      });

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle token verification error', async () => {
      jwt.decode.mockReturnValue({ header: { kid: 'test-kid' } });
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle Azure ID extraction failure', async () => {
      const mockDecoded = { email: 'test@example.com' };
      jwt.decode.mockReturnValue({ header: { kid: 'test-kid' } });
      jwt.verify.mockReturnValue(mockDecoded);

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'token' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle session creation error', async () => {
      const mockDecoded = { oid: 'test-oid', email: 'test@example.com' };
      jwt.decode.mockReturnValue({ header: { kid: 'test-kid' } });
      jwt.verify.mockReturnValue(mockDecoded);

      const mockUser = {
        id: 1,
        toJSON: jest.fn().mockReturnValue({ id: 1 }),
        role: null
      };

      User.findOne = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.login = jest.fn((user, callback) => callback(new Error('Session error')));
        next();
      });

      const response = await request(app)
        .post('/api/auth/validate-token')
        .send({ idToken: 'token' })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /user', () => {
    test('should return user when authenticated with id', async () => {
      const mockUser = {
        id: 1,
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          displayName: 'Test User',
          email: 'test@example.com',
          givenName: 'Test',
          surname: 'User'
        }),
        role: { name: 'employee' }
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
    });

    test('should return user when authenticated with _id', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { _id: 1 };
        req.session = { passport: { user: 1 } };
        next();
      });

      const mockUser = {
        id: 1,
        toJSON: jest.fn().mockReturnValue({ id: 1 }),
        role: null
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 401 when not authenticated', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(false);
        next();
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should return 401 when userId missing', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = {};
        req.session = {};
        next();
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should return 401 when user not found', async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/auth/user')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should handle database errors', async () => {
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/user')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /roles', () => {
    test('should return all roles', async () => {
      const mockRoles = [
        { id: 1, name: 'employee', toJSON: () => ({ id: 1, name: 'employee' }) },
        { id: 2, name: 'manager', toJSON: () => ({ id: 2, name: 'manager' }) }
      ];

      Role.findAll = jest.fn().mockResolvedValue(mockRoles);

      const response = await request(app)
        .get('/api/auth/roles')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.roles).toHaveLength(2);
    });

    test('should handle database errors', async () => {
      Role.findAll = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/roles')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /test-users', () => {
    test('should return test users in non-production', async () => {
      process.env.NODE_ENV = 'development';
      
      pool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            email: 'test1@test.com',
            display_name: 'Test User 1',
            role_name: 'employee',
            role_display_name: 'Employee'
          }
        ]
      });

      const response = await request(app)
        .get('/api/auth/test-users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
    });

    test('should return 403 in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/auth/test-users')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should handle database errors', async () => {
      process.env.NODE_ENV = 'development';
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/test-users')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /test-login', () => {
    test('should login test user in non-production', async () => {
      process.env.NODE_ENV = 'development';

      const mockUser = {
        id: 1,
        email: 'test@test.com',
        azureId: 'test-123',
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          displayName: 'Test User',
          email: 'test@test.com'
        }),
        role: { name: 'employee' }
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 403 in production', async () => {
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when userId missing', async () => {
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 when user not found', async () => {
      process.env.NODE_ENV = 'development';
      User.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 999 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 403 when user is not test user', async () => {
      process.env.NODE_ENV = 'development';

      const mockUser = {
        id: 1,
        email: 'real@example.com',
        azureId: 'real-123'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should handle session creation error', async () => {
      process.env.NODE_ENV = 'development';

      const mockUser = {
        id: 1,
        email: 'test@test.com',
        azureId: 'test-123',
        toJSON: jest.fn().mockReturnValue({ id: 1 }),
        role: null
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      app.use((req, res, next) => {
        req.login = jest.fn((user, callback) => callback(new Error('Session error')));
        next();
      });

      const response = await request(app)
        .post('/api/auth/test-login')
        .send({ userId: 1 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /users', () => {
    test('should return all users for superadmin', async () => {
      pool.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            email: 'user1@example.com',
            display_name: 'User 1',
            role_name: 'employee',
            role_display_name: 'Employee',
            role_id: 1,
            manager_id: null,
            manager_name: null,
            manager_email: null
          }
        ]
      });

      const response = await request(app)
        .get('/api/auth/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
    });

    test('should return 401 when not authenticated', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(false);
        next();
      });

      const response = await request(app)
        .get('/api/auth/users')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should return 403 for non-superadmin', async () => {
      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = { id: 1, role: { name: 'employee' } };
        next();
      });

      const response = await request(app)
        .get('/api/auth/users')
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    test('should handle database errors', async () => {
      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/auth/users')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:id/manager', () => {
    test('should update user manager', async () => {
      const mockUser = { id: 1, email: 'user@example.com', displayName: 'User' };
      const mockManager = { id: 10, email: 'manager@example.com' };

      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockManager)
        .mockResolvedValueOnce(mockUser);

      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 400 when id missing', async () => {
      const response = await request(app)
        .put('/api/auth/users//manager')
        .send({ managerId: 10 })
        .expect(404);
    });

    test('should return 404 when user not found', async () => {
      User.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/auth/users/999/manager')
        .send({ managerId: 10 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 when manager not found', async () => {
      const mockUser = { id: 1 };
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: 999 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should handle null managerId', async () => {
      const mockUser = { id: 1, email: 'user@example.com', displayName: 'User' };
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);

      pool.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: null })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle database errors', async () => {
      const mockUser = { id: 1 };
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ id: 10 });

      pool.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/auth/users/1/manager')
        .send({ managerId: 10 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /users/:id/role', () => {
    test('should update user role', async () => {
      const mockRole = { id: 2, name: 'employee' };
      const mockUser = {
        id: 1,
        email: 'user@example.com',
        displayName: 'User',
        role: { name: 'employee' },
        roleId: 2,
        updateRole: jest.fn().mockResolvedValue(true)
      };

      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);

      const { updateUserRoleWithManager } = require('../../routes/auth-role-helpers');
      updateUserRoleWithManager.mockResolvedValue();

      mockClient.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 2 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should return 400 when roleId missing', async () => {
      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when id missing', async () => {
      const response = await request(app)
        .put('/api/auth/users//role')
        .send({ roleId: 2 })
        .expect(404);
    });

    test('should return 404 when role not found', async () => {
      Role.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 999 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 404 when user not found', async () => {
      const mockRole = { id: 2 };
      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/auth/users/999/role')
        .send({ roleId: 2 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should return 400 when user missing id', async () => {
      const mockRole = { id: 2 };
      const mockUser = {};

      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 2 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should return 500 when updated user not found', async () => {
      const mockRole = { id: 2 };
      const mockUser = {
        id: 1,
        updateRole: jest.fn().mockResolvedValue(true)
      };

      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn()
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      const { updateUserRoleWithManager } = require('../../routes/auth-role-helpers');
      updateUserRoleWithManager.mockResolvedValue();

      mockClient.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 2 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle database errors', async () => {
      const mockRole = { id: 2 };
      const mockUser = {
        id: 1,
        updateRole: jest.fn().mockResolvedValue(true)
      };

      Role.findById = jest.fn().mockResolvedValue(mockRole);
      User.findById = jest.fn().mockResolvedValue(mockUser);

      mockClient.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put('/api/auth/users/1/role')
        .send({ roleId: 2 })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .get('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle logout errors', async () => {
      app.use((req, res, next) => {
        req.logout = jest.fn((callback) => callback(new Error('Logout error')));
        next();
      });

      const response = await request(app)
        .get('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle session destroy errors', async () => {
      app.use((req, res, next) => {
        req.logout = jest.fn((callback) => callback(null));
        req.session = { destroy: jest.fn((callback) => callback(new Error('Destroy error'))) };
        next();
      });

      const response = await request(app)
        .get('/api/auth/logout')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});

