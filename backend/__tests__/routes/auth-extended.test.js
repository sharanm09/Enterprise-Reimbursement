const request = require('supertest');
const express = require('express');
const authRouter = require('../../routes/auth');
const User = require('../../models/User');

jest.mock('../../models/User', () => ({
  findByAzureId: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn()
}));

describe('Auth Routes Extended', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRouter);
    jest.clearAllMocks();
  });

  describe('GET /api/auth/user', () => {
    test('should return user with role information', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        displayName: 'Test User',
        role: { name: 'employee', displayName: 'Employee' }
      };

      app.use((req, res, next) => {
        req.isAuthenticated = jest.fn().mockReturnValue(true);
        req.user = mockUser;
        next();
      });

      const response = await request(app)
        .get('/api/auth/user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.role).toBeDefined();
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should handle logout with session destroy', async () => {
      app.use((req, res, next) => {
        req.logout = jest.fn((callback) => callback());
        req.session = { destroy: jest.fn((callback) => callback()) };
        next();
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should handle logout errors gracefully', async () => {
      app.use((req, res, next) => {
        req.logout = jest.fn((callback) => callback(new Error('Logout error')));
        req.session = { destroy: jest.fn((callback) => callback()) };
        next();
      });

      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});


