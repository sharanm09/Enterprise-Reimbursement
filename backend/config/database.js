const { Pool } = require('pg');
const path = require('node:path');
const logger = require('../utils/logger');
const { seedDatabase } = require('./dataInitializer');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Validate required environment variables
function validateDatabaseEnv() {
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    logger.warn('Database configuration missing. Using defaults.');
  }
  return true;
}

validateDatabaseEnv();

let pool;

// Create PostgreSQL connection pool
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') ? { rejectUnauthorized: false } : false
  });
} else {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'enterprise_auth_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    ssl: (process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true') ? { rejectUnauthorized: false } : false
  });
}

console.log('[DB] PostgreSQL pool created successfully');

pool.on('connect', () => {
  logger.info('PostgreSQL connected successfully');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', err);
});

// Safe SQL type definitions - whitelist approach to prevent SQL injection
const ID_COLUMN_DEFS = {
  UUID: 'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
  SERIAL: 'id SERIAL PRIMARY KEY'
};

const FK_TYPES = {
  UUID: 'UUID',
  INTEGER: 'INTEGER'
};

function validateIdColumnDef(def) {
  const values = Object.values(ID_COLUMN_DEFS);
  if (!values.includes(def)) {
    throw new Error('Invalid idColumnDef: must be from whitelist');
  }
  return def;
}

function validateFkType(type) {
  const values = Object.values(FK_TYPES);
  if (!values.includes(type)) {
    throw new Error('Invalid fkType: must be from whitelist');
  }
  return type;
}

// Helper functions to reduce cognitive complexity
async function createRolesTable(idColumnDef) {
  const safeIdColumnDef = validateIdColumnDef(idColumnDef);
  // Use string concatenation with validated value to avoid SQL injection
  const query = 'CREATE TABLE IF NOT EXISTS roles (' +
    safeIdColumnDef + ', ' +
    'name VARCHAR(50) UNIQUE NOT NULL, ' +
    'display_name VARCHAR(100) NOT NULL, ' +
    'description TEXT, ' +
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ')';
  await pool.query(query);
}

async function createUsersTable(idColumnDef, fkType) {
  const safeIdColumnDef = validateIdColumnDef(idColumnDef);
  const safeFkType = validateFkType(fkType);

  const tableExists = await pool.query(
    'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = \'public\' AND table_name = \'users\')'
  );

  if (tableExists.rows[0].exists) {
    const columns = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'users\'');

    const columnNames = new Set(columns.rows.map(r => r.column_name));

    if (!columnNames.has('role_id')) {
      const alterQuery = 'ALTER TABLE users ADD COLUMN role_id ' + safeFkType + ' REFERENCES roles(id) DEFAULT NULL';
      await pool.query(alterQuery);
    }

    if (!columnNames.has('family_name')) {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS family_name VARCHAR(255)');
    }

    if (!columnNames.has('manager_id')) {
      const alterQuery = 'ALTER TABLE users ADD COLUMN manager_id ' + safeFkType + ' REFERENCES users(id) DEFAULT NULL';
      await pool.query(alterQuery);
    }
    if (!columnNames.has('department_id')) {
      const alterQuery = 'ALTER TABLE users ADD COLUMN department_id ' + safeFkType + ' REFERENCES departments(id) DEFAULT NULL';
      await pool.query(alterQuery);
    }
  } else {
    // Use string concatenation with validated values to avoid SQL injection
    const query = 'CREATE TABLE users (' +
      safeIdColumnDef + ', ' +
      'azure_id VARCHAR(255) UNIQUE NOT NULL, ' +
      'display_name VARCHAR(255) NOT NULL, ' +
      'email VARCHAR(255) UNIQUE NOT NULL, ' +
      'given_name VARCHAR(255), ' +
      'surname VARCHAR(255), ' +
      'family_name VARCHAR(255), ' +
      'role_id ' + safeFkType + ' REFERENCES roles(id), ' +
      'department_id ' + safeFkType + ' REFERENCES departments(id), ' +
      'manager_id ' + safeFkType + ' REFERENCES users(id), ' +
      'last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
      'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
      'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
      ')';
    await pool.query(query);
  }

  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_azure_id ON users(azure_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id)');
}

async function createDashboardStatsTable(idColumnDef) {
  const safeIdColumnDef = validateIdColumnDef(idColumnDef);
  // Use string concatenation with validated value to avoid SQL injection
  const query = 'CREATE TABLE IF NOT EXISTS dashboard_stats (' +
    safeIdColumnDef + ', ' +
    'title VARCHAR(255) NOT NULL, ' +
    'value VARCHAR(100) NOT NULL, ' +
    'subtitle VARCHAR(255), ' +
    'icon VARCHAR(50) NOT NULL, ' +
    'emoji VARCHAR(10), ' +
    'color VARCHAR(50), ' +
    'role_name VARCHAR(50), ' +
    'display_order INTEGER DEFAULT 0, ' +
    'is_active BOOLEAN DEFAULT true, ' +
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ')';
  await pool.query(query);

  await pool.query('CREATE INDEX IF NOT EXISTS idx_dashboard_stats_role ON dashboard_stats(role_name)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_dashboard_stats_active ON dashboard_stats(is_active)');
}

async function createMasterDataTables(idColumnDef, fkType) {
  const safeIdColumnDef = validateIdColumnDef(idColumnDef);
  const safeFkType = validateFkType(fkType);

  // Use string concatenation with validated values to avoid SQL injection
  const departmentsQuery = 'CREATE TABLE IF NOT EXISTS departments (' +
    safeIdColumnDef + ', ' +
    'name VARCHAR(255) NOT NULL, ' +
    'code VARCHAR(50) UNIQUE NOT NULL, ' +
    'description TEXT, ' +
    'status VARCHAR(20) DEFAULT \'active\', ' +
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ')';
  await pool.query(departmentsQuery);

  const costCentersQuery = 'CREATE TABLE IF NOT EXISTS cost_centers (' +
    safeIdColumnDef + ', ' +
    'name VARCHAR(255) NOT NULL, ' +
    'code VARCHAR(50) UNIQUE NOT NULL, ' +
    'budget DECIMAL(15, 2) DEFAULT 0, ' +
    'department_id ' + safeFkType + ' REFERENCES departments(id) ON DELETE RESTRICT, ' +
    'description TEXT, ' +
    'status VARCHAR(20) DEFAULT \'active\', ' +
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ')';
  await pool.query(costCentersQuery);

  // Add budget column if it doesn't exist (for existing tables)
  await pool.query('ALTER TABLE cost_centers ADD COLUMN IF NOT EXISTS budget DECIMAL(15, 2) DEFAULT 0');

  const projectsQuery = 'CREATE TABLE IF NOT EXISTS projects (' +
    safeIdColumnDef + ', ' +
    'name VARCHAR(255) NOT NULL, ' +
    'code VARCHAR(50) UNIQUE NOT NULL, ' +
    'description TEXT, ' +
    'start_date DATE, ' +
    'end_date DATE, ' +
    'status VARCHAR(20) DEFAULT \'active\', ' +
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ')';
  await pool.query(projectsQuery);

  const expenseCategoriesQuery = 'CREATE TABLE IF NOT EXISTS expense_categories (' +
    safeIdColumnDef + ', ' +
    'name VARCHAR(255) UNIQUE NOT NULL, ' +
    'code VARCHAR(50) UNIQUE NOT NULL, ' +
    'description TEXT, ' +
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ')';
  await pool.query(expenseCategoriesQuery);
}

async function createReimbursementTables(idColumnDef, fkType) {
  const safeIdColumnDef = validateIdColumnDef(idColumnDef);
  const safeFkType = validateFkType(fkType);

  // Use string concatenation with validated values to avoid SQL injection
  const reimbursementsQuery = 'CREATE TABLE IF NOT EXISTS reimbursements (' +
    safeIdColumnDef + ', ' +
    'user_id ' + safeFkType + ' REFERENCES users(id) ON DELETE CASCADE, ' +
    'department_id ' + safeFkType + ' REFERENCES departments(id), ' +
    'cost_center_id ' + safeFkType + ' REFERENCES cost_centers(id), ' +
    'project_id ' + safeFkType + ' REFERENCES projects(id), ' +
    'request_date DATE DEFAULT CURRENT_DATE, ' +
    'status VARCHAR(50) DEFAULT \'draft\', ' +
    'total_amount DECIMAL(10, 2) DEFAULT 0, ' +
    'description TEXT, ' +
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ')';
  await pool.query(reimbursementsQuery);

  const reimbursementItemsQuery = 'CREATE TABLE IF NOT EXISTS reimbursement_items (' +
    safeIdColumnDef + ', ' +
    'reimbursement_id ' + safeFkType + ' REFERENCES reimbursements(id) ON DELETE CASCADE, ' +
    'expense_category_id ' + safeFkType + ' REFERENCES expense_categories(id), ' +
    'expense_type VARCHAR(50) NOT NULL, ' +
    'amount DECIMAL(10, 2) NOT NULL, ' +
    'paid_amount DECIMAL(10, 2), ' +
    'description TEXT, ' +
    'expense_date DATE NOT NULL, ' +
    'meal_type VARCHAR(50), ' +
    'people_count INTEGER, ' +
    'travel_purpose VARCHAR(255), ' +
    'lodging_city VARCHAR(255), ' +
    'status VARCHAR(50) DEFAULT \'pending\', ' +
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, ' +
    'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ')';
  await pool.query(reimbursementItemsQuery);

  await pool.query('ALTER TABLE reimbursement_items ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2)').catch(() => { });

  const attachmentsQuery = 'CREATE TABLE IF NOT EXISTS reimbursement_attachments (' +
    safeIdColumnDef + ', ' +
    'reimbursement_id ' + safeFkType + ' REFERENCES reimbursements(id) ON DELETE CASCADE, ' +
    'reimbursement_item_id ' + safeFkType + ' REFERENCES reimbursement_items(id) ON DELETE CASCADE, ' +
    'file_name VARCHAR(255) NOT NULL, ' +
    'file_path VARCHAR(500) NOT NULL, ' +
    'file_size INTEGER, ' +
    'file_type VARCHAR(100), ' +
    'uploaded_by ' + safeFkType + ' REFERENCES users(id), ' +
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ')';
  await pool.query(attachmentsQuery);

  const approvalsQuery = 'CREATE TABLE IF NOT EXISTS reimbursement_approvals (' +
    safeIdColumnDef + ', ' +
    'reimbursement_item_id ' + safeFkType + ' REFERENCES reimbursement_items(id) ON DELETE CASCADE, ' +
    'approver_id ' + safeFkType + ' REFERENCES users(id), ' +
    'approval_level VARCHAR(50) NOT NULL, ' +
    'status VARCHAR(50) NOT NULL, ' +
    'comments TEXT, ' +
    'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
    ')';
  await pool.query(approvalsQuery);
}

async function createIndexes() {
  await pool.query('CREATE INDEX IF NOT EXISTS idx_reimbursements_user_id ON reimbursements(user_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_reimbursements_status ON reimbursements(status)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_reimbursement_items_reimbursement_id ON reimbursement_items(reimbursement_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_cost_centers_department_id ON cost_centers(department_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_reimbursement_approvals_item_id ON reimbursement_approvals(reimbursement_item_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_reimbursement_approvals_approver_id ON reimbursement_approvals(approver_id)');
}

async function initializeDatabase() {
  try {
    console.log('[DB] Starting database initialization...');
    console.log('[DB] Starting database initialization...');
    // await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'); // Not supported in some Azure configurations

    const idTypeCheck = await pool.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'roles\' AND column_name = \'id\''
    );

    const useUUID = !idTypeCheck.rows.length || idTypeCheck.rows[0].data_type === 'uuid';
    const idColumnDef = validateIdColumnDef(useUUID ? ID_COLUMN_DEFS.UUID : ID_COLUMN_DEFS.SERIAL);
    const fkType = validateFkType(useUUID ? FK_TYPES.UUID : FK_TYPES.INTEGER);

    console.log('[DB] Creating tables...');
    await createRolesTable(idColumnDef);
    await createUsersTable(idColumnDef, fkType);
    await createDashboardStatsTable(idColumnDef);
    await createMasterDataTables(idColumnDef, fkType);
    await createReimbursementTables(idColumnDef, fkType);
    await createIndexes();

    console.log('[DB] ✓ Tables created');

    // Seed sample data
    await seedDatabase(pool);

    logger.info('Database tables initialized successfully');
    console.log('[DB] ✅ Database initialization complete!\n');
  } catch (error) {
    logger.error('Error initializing database:', error);
    console.error('[DB] ❌ Database initialization failed:', error.message);
    throw error;
  }
}

module.exports = {
  pool,
  initializeDatabase
};
