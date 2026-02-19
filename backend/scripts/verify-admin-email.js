const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function verify() {
    const client = await pool.connect();
    try {
        console.log('Connected to DB. Checking admin email...');
        const res = await client.query("SELECT email FROM users WHERE azure_id = 'admin-001'");
        if (res.rows.length > 0) {
            console.log('Admin email:', res.rows[0].email);
        } else {
            console.log('Admin user (azure_id=admin-001) not found.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

verify();
