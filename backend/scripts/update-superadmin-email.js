const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function updateAdminEmail() {
    const client = await pool.connect();
    try {
        const newEmail = process.env.SUPER_ADMIN_EMAIL;
        if (!newEmail) {
            throw new Error('SUPER_ADMIN_EMAIL not set in .env');
        }

        console.log(`Updating superadmin email to: ${newEmail}`);

        // Update using azure_id = 'admin-001' which is the stable ID for superadmin
        const result = await client.query(
            `UPDATE users 
       SET email = $1, display_name = 'Admin User'
       WHERE azure_id = 'admin-001'
       RETURNING id, email, display_name`,
            [newEmail]
        );

        if (result.rowCount > 0) {
            console.log('Successfully updated superadmin email:');
            console.table(result.rows[0]);
        } else {
            console.log('No user found with azure_id = "admin-001". Attempting to find by role "superadmin"...');

            // Fallback: Find by role
            const roleRes = await client.query("SELECT id FROM roles WHERE name = 'superadmin'");
            if (roleRes.rows.length === 0) {
                throw new Error('Superadmin role not found');
            }
            const roleId = roleRes.rows[0].id;

            const updateRes = await client.query(
                `UPDATE users
         SET email = $1
         WHERE role_id = $2
         RETURNING id, email, display_name`,
                [newEmail, roleId]
            );

            if (updateRes.rowCount > 0) {
                console.log('Successfully updated superadmin email by role:');
                console.table(updateRes.rows[0]);
            } else {
                console.log('No superadmin user found to update.');
            }
        }
    } catch (err) {
        console.error('Error updating admin email:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

updateAdminEmail();
