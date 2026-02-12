
const { pool } = require('../config/database');

async function checkSchema() {
    try {
        const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users';
`);
        const columns = result.rows.map(row => row.column_name);
        console.log('Columns in users table:', columns);

        const hasBankAccount = columns.includes('bank_account_no');

        console.log('Has bank_account_no:', hasBankAccount);
    } catch (error) {
        console.error('Error checking schema:', error);
    } finally {
        pool.end();
    }
}

checkSchema();
