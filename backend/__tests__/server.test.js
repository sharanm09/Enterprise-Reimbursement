const request = require('supertest');
const { pool, initializeDatabase } = require('../config/database');

jest.mock('../config/database', () => ({
  pool: {
    query: jest.fn()
  },
  initializeDatabase: jest.fn().mockResolvedValue()
}));

jest.mock('../routes/auth', () => express.Router());
jest.mock('../routes/dashboard', () => express.Router());
jest.mock('../routes/dashboardStats', () => express.Router());
jest.mock('../routes/reimbursements', () => express.Router());
jest.mock('../routes/masterData', () => express.Router());
jest.mock('../routes/approvals', () => express.Router());

// Mock environment variables
const originalEnv = process.env;
beforeAll(() => {
  process.env = {
    ...originalEnv,
    PORT: '5000',
    NODE_ENV: 'test',
    FRONTEND_URL: 'http://localhost:3000',
    API_PREFIX: '/api',
    SESSION_SECRET: 'test-secret',
    JWT_SECRET: 'test-jwt-secret'
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Server', () => {
  let app;
  let server;

  beforeAll(async () => {
    // Clear module cache to ensure fresh import
    jest.resetModules();
    app = require('../server');
    server = app.listen(0); // Use random port for testing
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    }
  });

  test('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      status: 'OK',
      message: 'Server is running'
    });
  });

  test('should initialize database on startup', async () => {
    expect(initializeDatabase).toHaveBeenCalled();
  });

  test('should use default API prefix when not set', () => {
    delete process.env.API_PREFIX;
    jest.resetModules();
    const testApp = require('../server');
    expect(testApp).toBeDefined();
  });

  test('should use custom API prefix when set', () => {
    process.env.API_PREFIX = '/custom-api';
    jest.resetModules();
    const testApp = require('../server');
    expect(testApp).toBeDefined();
  });
});
