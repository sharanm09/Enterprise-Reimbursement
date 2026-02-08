const { Pool } = require('pg');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function clearDatabase() {
    try {
        console.log('Clearing database tables...');
        await pool.query('TRUNCATE TABLE cost_centers, projects, departments, users, roles CASCADE;');
        console.log('✅ Database tables cleared successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    }
}

clearDatabase();
