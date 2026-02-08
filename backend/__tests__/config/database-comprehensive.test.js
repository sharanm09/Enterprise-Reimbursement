const { pool, initializeDatabase } = require('../../config/database');
const logger = require('../../utils/logger');

jest.mock('../../config/database', () => {
  const actualModule = jest.requireActual('../../config/database');
  return {
    ...actualModule,
    pool: {
      query: jest.fn()
    }
  };
});

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

describe('Database Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeDatabase', () => {
    test('should initialize database with UUID type', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: [{ column_name: 'id', data_type: 'uuid' }]
        }) // Check id type
        .mockResolvedValueOnce() // createRolesTable
        .mockResolvedValueOnce() // createUsersTable
        .mockResolvedValueOnce() // createDashboardStatsTable
        .mockResolvedValueOnce() // createMasterDataTables
        .mockResolvedValueOnce() // createReimbursementTables
        .mockResolvedValueOnce() // createIndexes
        .mockResolvedValueOnce(); // assignDefaultRoles

      await initializeDatabase();

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('CREATE EXTENSION'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Database tables initialized'));
    });

    test('should initialize database with SERIAL type when no UUID found', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: []
        }) // Check id type - empty means no UUID
        .mockResolvedValueOnce() // createRolesTable
        .mockResolvedValueOnce() // createUsersTable
        .mockResolvedValueOnce() // createDashboardStatsTable
        .mockResolvedValueOnce() // createMasterDataTables
        .mockResolvedValueOnce() // createReimbursementTables
        .mockResolvedValueOnce() // createIndexes
        .mockResolvedValueOnce(); // assignDefaultRoles

      await initializeDatabase();

      expect(pool.query).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Database tables initialized'));
    });

    test('should handle errors during initialization', async () => {
      const error = new Error('Database connection failed');
      pool.query.mockRejectedValueOnce(error);

      await expect(initializeDatabase()).rejects.toThrow('Database connection failed');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error initializing database'), error);
    });

    test('should create all required tables', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: [{ column_name: 'id', data_type: 'uuid' }]
        })
        .mockResolvedValueOnce() // roles
        .mockResolvedValueOnce() // users
        .mockResolvedValueOnce() // dashboard_stats
        .mockResolvedValueOnce() // departments
        .mockResolvedValueOnce() // cost_centers
        .mockResolvedValueOnce() // projects
        .mockResolvedValueOnce() // expense_categories
        .mockResolvedValueOnce() // reimbursements
        .mockResolvedValueOnce() // reimbursement_items
        .mockResolvedValueOnce() // reimbursement_attachments
        .mockResolvedValueOnce() // reimbursement_approvals
        .mockResolvedValueOnce() // indexes
        .mockResolvedValueOnce(); // assignDefaultRoles

      await initializeDatabase();

      const createTableCalls = pool.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('CREATE TABLE')
      );
      expect(createTableCalls.length).toBeGreaterThan(0);
    });

    test('should create indexes', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: [{ column_name: 'id', data_type: 'uuid' }]
        })
        .mockResolvedValueOnce() // roles
        .mockResolvedValueOnce() // users
        .mockResolvedValueOnce() // dashboard_stats
        .mockResolvedValueOnce() // departments
        .mockResolvedValueOnce() // cost_centers
        .mockResolvedValueOnce() // projects
        .mockResolvedValueOnce() // expense_categories
        .mockResolvedValueOnce() // reimbursements
        .mockResolvedValueOnce() // reimbursement_items
        .mockResolvedValueOnce() // reimbursement_attachments
        .mockResolvedValueOnce() // reimbursement_approvals
        .mockResolvedValueOnce() // index 1
        .mockResolvedValueOnce() // index 2
        .mockResolvedValueOnce() // index 3
        .mockResolvedValueOnce() // index 4
        .mockResolvedValueOnce() // index 5
        .mockResolvedValueOnce() // index 6
        .mockResolvedValueOnce(); // assignDefaultRoles

      await initializeDatabase();

      const indexCalls = pool.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('CREATE INDEX')
      );
      expect(indexCalls.length).toBeGreaterThan(0);
    });

    test('should assign default roles', async () => {
      pool.query
        .mockResolvedValueOnce() // CREATE EXTENSION
        .mockResolvedValueOnce({
          rows: [{ column_name: 'id', data_type: 'uuid' }]
        })
        .mockResolvedValueOnce() // roles
        .mockResolvedValueOnce() // users
        .mockResolvedValueOnce() // dashboard_stats
        .mockResolvedValueOnce() // departments
        .mockResolvedValueOnce() // cost_centers
        .mockResolvedValueOnce() // projects
        .mockResolvedValueOnce() // expense_categories
        .mockResolvedValueOnce() // reimbursements
        .mockResolvedValueOnce() // reimbursement_items
        .mockResolvedValueOnce() // reimbursement_attachments
        .mockResolvedValueOnce() // reimbursement_approvals
        .mockResolvedValueOnce() // indexes
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // employee role
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // superadmin role
        .mockResolvedValueOnce() // update superadmin
        .mockResolvedValueOnce(); // update employees

      await initializeDatabase();

      const updateCalls = pool.query.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('UPDATE users')
      );
      expect(updateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('validateIdColumnDef', () => {
    test('should accept valid UUID definition', () => {
      const { validateIdColumnDef } = require('../../config/database');
      const validDef = 'id UUID PRIMARY KEY DEFAULT uuid_generate_v4()';
      expect(() => validateIdColumnDef(validDef)).not.toThrow();
    });

    test('should accept valid SERIAL definition', () => {
      const { validateIdColumnDef } = require('../../config/database');
      const validDef = 'id SERIAL PRIMARY KEY';
      expect(() => validateIdColumnDef(validDef)).not.toThrow();
    });

    test('should reject invalid definition', () => {
      const { validateIdColumnDef } = require('../../config/database');
      const invalidDef = 'id INTEGER PRIMARY KEY';
      expect(() => validateIdColumnDef(invalidDef)).toThrow('Invalid idColumnDef');
    });
  });

  describe('validateFkType', () => {
    test('should accept valid UUID type', () => {
      const { validateFkType } = require('../../config/database');
      expect(() => validateFkType('UUID')).not.toThrow();
    });

    test('should accept valid INTEGER type', () => {
      const { validateFkType } = require('../../config/database');
      expect(() => validateFkType('INTEGER')).not.toThrow();
    });

    test('should reject invalid type', () => {
      const { validateFkType } = require('../../config/database');
      expect(() => validateFkType('VARCHAR')).toThrow('Invalid fkType');
    });
  });
});


