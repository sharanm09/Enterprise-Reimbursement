require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

async function addManagerIdColumn() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'manager_id'
    `);

    if (columnCheck.rows.length === 0) {
      const idTypeCheck = await client.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'roles' AND column_name = 'id'
      `);

      const useUUID = !idTypeCheck.rows.length || idTypeCheck.rows[0].data_type === 'uuid';
      const fkType = useUUID ? 'UUID' : 'INTEGER';

      await client.query(`
        ALTER TABLE users 
        ADD COLUMN manager_id ${fkType} REFERENCES users(id) DEFAULT NULL
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id)
      `);

      await client.query('COMMIT');
      console.log('✅ Successfully added manager_id column to users table');
    } else {
      console.log('✅ manager_id column already exists in users table');
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding manager_id column:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  addManagerIdColumn()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { addManagerIdColumn };


