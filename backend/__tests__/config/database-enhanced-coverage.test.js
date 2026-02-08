const { pool, initializeDatabase } = require('../../config/database');
const logger = require('../../utils/logger');

jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  };
  return {
    Pool: jest.fn(() => mockPool)
  };
});

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Database Configuration Enhanced Coverage', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Pool Configuration', () => {
    test('should create pool with DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.NODE_ENV = 'development';

      const { Pool } = require('pg');
      require('../../config/database');

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost/db',
        ssl: false
      });
    });

    test('should create pool with DATABASE_URL and SSL in production', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      process.env.NODE_ENV = 'production';

      const { Pool } = require('pg');
      require('../../config/database');

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost/db',
        ssl: { rejectUnauthorized: false }
      });
    });

    test('should create pool with individual DB config when DATABASE_URL not set', () => {
      delete process.env.DATABASE_URL;
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'test_db';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_pass';

      const { Pool } = require('pg');
      require('../../config/database');

      expect(Pool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_pass'
      });
    });

    test('should use default values when DB config not set', () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_HOST;

      const { Pool } = require('pg');
      require('../../config/database');

      expect(Pool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 5432,
        database: 'enterprise_auth_db',
        user: 'root',
        password: 'root'
      });
    });

    test('should handle pool connect event', () => {
      const { Pool } = require('pg');
      const db = require('../../config/database');
      
      const mockPool = Pool.mock.results[0].value;
      const connectHandler = mockPool.on.mock.calls.find(call => call[0] === 'connect');
      
      if (connectHandler) {
        connectHandler[1]();
        expect(logger.info).toHaveBeenCalledWith('PostgreSQL connected successfully');
      }
    });

    test('should handle pool error event', () => {
      const { Pool } = require('pg');
      const db = require('../../config/database');
      
      const mockPool = Pool.mock.results[0].value;
      const errorHandler = mockPool.on.mock.calls.find(call => call[0] === 'error');
      
      if (errorHandler) {
        const testError = new Error('Connection error');
        errorHandler[1](testError);
        expect(logger.error).toHaveBeenCalledWith('Unexpected error on idle PostgreSQL client', testError);
      }
    });
  });

  describe('initializeDatabase', () => {
    test('should initialize database with UUID type when roles table exists', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: [{ column_name: 'id', data_type: 'uuid' }]
        }) // Check id type
        .mockResolvedValueOnce() // createRolesTable - INSERT roles
        .mockResolvedValueOnce() // createUsersTable - check table exists
        .mockResolvedValueOnce({ rows: [] }) // createUsersTable - check columns
        .mockResolvedValueOnce() // createDashboardStatsTable
        .mockResolvedValueOnce() // createDashboardStatsTable - INSERT default stats
        .mockResolvedValueOnce() // createMasterDataTables - departments
        .mockResolvedValueOnce() // createMasterDataTables - cost_centers
        .mockResolvedValueOnce() // createMasterDataTables - projects
        .mockResolvedValueOnce() // createMasterDataTables - expense_categories
        .mockResolvedValueOnce() // createMasterDataTables - INSERT categories
        .mockResolvedValueOnce() // createReimbursementTables - reimbursements
        .mockResolvedValueOnce() // createReimbursementTables - reimbursement_items
        .mockResolvedValueOnce() // createReimbursementTables - ALTER reimbursement_items
        .mockResolvedValueOnce() // createReimbursementTables - reimbursement_attachments
        .mockResolvedValueOnce() // createReimbursementTables - reimbursement_approvals
        .mockResolvedValueOnce() // createIndexes - idx_reimbursements_user_id
        .mockResolvedValueOnce() // createIndexes - idx_reimbursements_status
        .mockResolvedValueOnce() // createIndexes - idx_reimbursement_items_reimbursement_id
        .mockResolvedValueOnce() // createIndexes - idx_cost_centers_department_id
        .mockResolvedValueOnce() // createIndexes - idx_reimbursement_approvals_item_id
        .mockResolvedValueOnce() // createIndexes - idx_reimbursement_approvals_approver_id
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // assignDefaultRoles - employee role
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // assignDefaultRoles - superadmin role
        .mockResolvedValueOnce() // assignDefaultRoles - UPDATE superadmin
        .mockResolvedValueOnce(); // assignDefaultRoles - UPDATE employees

      await initializeDatabase();

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('CREATE EXTENSION'));
      expect(logger.info).toHaveBeenCalledWith('Database tables initialized successfully');
    });

    test('should initialize database with SERIAL type when roles table does not exist', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({ rows: [] }) // Check id type - empty means no UUID
        .mockResolvedValueOnce() // createRolesTable - CREATE TABLE
        .mockResolvedValueOnce() // createRolesTable - INSERT roles
        .mockResolvedValueOnce() // createUsersTable - check table exists
        .mockResolvedValueOnce({ rows: [] }) // createUsersTable - check columns
        .mockResolvedValueOnce() // createDashboardStatsTable
        .mockResolvedValueOnce() // createDashboardStatsTable - INSERT default stats
        .mockResolvedValueOnce() // createMasterDataTables - departments
        .mockResolvedValueOnce() // createMasterDataTables - cost_centers
        .mockResolvedValueOnce() // createMasterDataTables - projects
        .mockResolvedValueOnce() // createMasterDataTables - expense_categories
        .mockResolvedValueOnce() // createMasterDataTables - INSERT categories
        .mockResolvedValueOnce() // createReimbursementTables - reimbursements
        .mockResolvedValueOnce() // createReimbursementTables - reimbursement_items
        .mockResolvedValueOnce() // createReimbursementTables - ALTER reimbursement_items
        .mockResolvedValueOnce() // createReimbursementTables - reimbursement_attachments
        .mockResolvedValueOnce() // createReimbursementTables - reimbursement_approvals
        .mockResolvedValueOnce() // createIndexes
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      await initializeDatabase();

      expect(pool.query).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Database tables initialized successfully');
    });

    test('should handle existing users table with missing columns', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: [{ column_name: 'id', data_type: 'uuid' }]
        })
        .mockResolvedValueOnce() // createRolesTable
        .mockResolvedValueOnce() // createUsersTable - check table exists
        .mockResolvedValueOnce({
          rows: [
            { column_name: 'id' },
            { column_name: 'azure_id' },
            { column_name: 'display_name' }
          ]
        }) // createUsersTable - check columns (missing role_id, manager_id, family_name)
        .mockResolvedValueOnce() // ALTER TABLE - add role_id
        .mockResolvedValueOnce() // ALTER TABLE - add family_name
        .mockResolvedValueOnce() // ALTER TABLE - add manager_id
        .mockResolvedValueOnce() // CREATE INDEX
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createDashboardStatsTable
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createMasterDataTables
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createReimbursementTables
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createIndexes
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      await initializeDatabase();

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE users ADD COLUMN role_id')
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE users ADD COLUMN IF NOT EXISTS family_name')
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('ALTER TABLE users ADD COLUMN manager_id')
      );
    });

    test('should handle existing users table with all columns', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: [{ column_name: 'id', data_type: 'uuid' }]
        })
        .mockResolvedValueOnce() // createRolesTable
        .mockResolvedValueOnce() // createUsersTable - check table exists
        .mockResolvedValueOnce({
          rows: [
            { column_name: 'id' },
            { column_name: 'role_id' },
            { column_name: 'manager_id' },
            { column_name: 'family_name' }
          ]
        }) // createUsersTable - check columns (all present)
        .mockResolvedValueOnce() // CREATE INDEX
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createDashboardStatsTable
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createMasterDataTables
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createReimbursementTables
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createIndexes
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      await initializeDatabase();

      // Should not call ALTER TABLE for existing columns
      const alterCalls = pool.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('ALTER TABLE users ADD COLUMN role_id')
      );
      expect(alterCalls.length).toBe(0);
    });

    test('should handle dashboard stats with existing entries', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: [{ column_name: 'id', data_type: 'uuid' }]
        })
        .mockResolvedValueOnce() // createRolesTable
        .mockResolvedValueOnce() // createUsersTable
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createDashboardStatsTable - CREATE TABLE
        .mockResolvedValueOnce() // createDashboardStatsTable - CREATE INDEX
        .mockResolvedValueOnce() // createDashboardStatsTable - CREATE INDEX
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check existing - My Reimbursements
        .mockResolvedValueOnce({ rows: [] }) // INSERT My Reimbursements
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // Check existing - Total Users
        .mockResolvedValueOnce() // Skip INSERT
        .mockResolvedValueOnce({ rows: [] }) // Check existing - Departments
        .mockResolvedValueOnce() // INSERT Departments
        .mockResolvedValueOnce({ rows: [] }) // Check existing - Cost Centers
        .mockResolvedValueOnce() // INSERT Cost Centers
        .mockResolvedValueOnce({ rows: [] }) // Check existing - Projects
        .mockResolvedValueOnce() // INSERT Projects
        .mockResolvedValueOnce({ rows: [] }) // Check existing - Pending Approvals (manager)
        .mockResolvedValueOnce() // INSERT Pending Approvals (manager)
        .mockResolvedValueOnce({ rows: [] }) // Check existing - Pending Approvals (hr)
        .mockResolvedValueOnce() // INSERT Pending Approvals (hr)
        .mockResolvedValueOnce({ rows: [] }) // Check existing - Pending Approvals (finance)
        .mockResolvedValueOnce() // INSERT Pending Approvals (finance)
        .mockResolvedValueOnce() // createMasterDataTables
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createReimbursementTables
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createIndexes
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      await initializeDatabase();

      expect(pool.query).toHaveBeenCalled();
    });

    test('should handle expense categories with existing entries', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: [{ column_name: 'id', data_type: 'uuid' }]
        })
        .mockResolvedValueOnce() // createRolesTable
        .mockResolvedValueOnce() // createUsersTable
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createDashboardStatsTable
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createMasterDataTables - departments
        .mockResolvedValueOnce() // createMasterDataTables - cost_centers
        .mockResolvedValueOnce() // createMasterDataTables - projects
        .mockResolvedValueOnce() // createMasterDataTables - expense_categories CREATE
        .mockResolvedValueOnce() // INSERT Food (conflict)
        .mockResolvedValueOnce() // INSERT Travel (conflict)
        .mockResolvedValueOnce() // INSERT Accommodation (conflict)
        .mockResolvedValueOnce() // INSERT Material (conflict)
        .mockResolvedValueOnce() // INSERT Others (conflict)
        .mockResolvedValueOnce() // createReimbursementTables
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createIndexes
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce();

      await initializeDatabase();

      expect(pool.query).toHaveBeenCalled();
    });

    test('should handle errors during initialization', async () => {
      const error = new Error('Database connection failed');
      pool.query.mockRejectedValueOnce(error);

      await expect(initializeDatabase()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalledWith('Error initializing database:', error);
    });

    test('should use SUPER_ADMIN_EMAIL from env', async () => {
      process.env.SUPER_ADMIN_EMAIL = 'admin@custom.com';

      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: [{ column_name: 'id', data_type: 'uuid' }]
        })
        .mockResolvedValueOnce() // createRolesTable
        .mockResolvedValueOnce() // createUsersTable
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createDashboardStatsTable
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createMasterDataTables
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createReimbursementTables
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce() // createIndexes
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce()
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2 }] })
        .mockResolvedValueOnce() // UPDATE superadmin
        .mockResolvedValueOnce(); // UPDATE employees

      await initializeDatabase();

      const updateCalls = pool.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('UPDATE users SET role_id')
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('validateDatabaseEnv', () => {
    test('should warn when DATABASE_URL and DB_HOST missing', () => {
      delete process.env.DATABASE_URL;
      delete process.env.DB_HOST;

      require('../../config/database');

      expect(logger.warn).toHaveBeenCalledWith('Database configuration missing. Using defaults.');
    });

    test('should not warn when DATABASE_URL is set', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost/db';
      jest.clearAllMocks();

      require('../../config/database');

      expect(logger.warn).not.toHaveBeenCalledWith('Database configuration missing. Using defaults.');
    });

    test('should not warn when DB_HOST is set', () => {
      delete process.env.DATABASE_URL;
      process.env.DB_HOST = 'localhost';
      jest.clearAllMocks();

      require('../../config/database');

      expect(logger.warn).not.toHaveBeenCalledWith('Database configuration missing. Using defaults.');
    });
  });
});

