const { Pool } = require('pg');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkData() {
    try {
        const users = await pool.query('SELECT COUNT(*) FROM users');
        const departments = await pool.query('SELECT COUNT(*) FROM departments');

        console.log(`Users count: ${users.rows[0].count}`);
        console.log(`Departments count: ${departments.rows[0].count}`);

        if (users.rows[0].count > 0 && departments.rows[0].count > 0) {
            console.log('✅ Data seeding successful!');
        } else {
            console.log('❌ Data seeding failed or incomplete.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error checking data:', error);
        process.exit(1);
    }
}

checkData();
