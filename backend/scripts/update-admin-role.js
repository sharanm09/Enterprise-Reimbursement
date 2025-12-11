const { pool } = require('../config/database');

async function updateAdminRole() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@qwikhire.ai';

    const superAdminRole = await client.query(
      'SELECT id FROM roles WHERE name = $1',
      ['superadmin']
    );

    if (superAdminRole.rows.length === 0) {
      throw new Error('Superadmin role not found in database');
    }

    const roleId = superAdminRole.rows[0].id;

    const userResult = await client.query(
      'SELECT id, email, display_name FROM users WHERE email = $1',
      [superAdminEmail]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`User with email ${superAdminEmail} not found`);
    }

    const userId = userResult.rows[0].id;
    const userName = userResult.rows[0].display_name;

    await client.query(
      'UPDATE users SET role_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [roleId, userId]
    );

    await client.query('COMMIT');

    console.log(`✅ Successfully updated role for ${superAdminEmail} (${userName}) to Superadmin`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Role ID: ${roleId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating admin role:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  updateAdminRole()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { updateAdminRole };

