require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

async function setupTestUser() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@qwikhire.ai';

    const userResult = await client.query(
      'SELECT id, email, display_name FROM users WHERE email = $1',
      [superAdminEmail]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`User with email ${superAdminEmail} not found`);
    }

    const userId = userResult.rows[0].id;
    const userName = userResult.rows[0].display_name;

    console.log(`\n📋 Setting up test user: ${userName} (${superAdminEmail})`);
    console.log(`   User ID: ${userId}\n`);

    await client.query(
      'UPDATE users SET manager_id = $1 WHERE id = $1',
      [userId]
    );

    console.log('✅ Set manager_id to self (for testing as Employee → Manager)');
    console.log('   When you are Employee, your manager_id points to yourself');
    console.log('   When you are Manager, you can see your own items\n');

    await client.query('COMMIT');

    console.log('✅ Test user setup completed successfully!');
    console.log('\n📝 Testing Workflow:');
    console.log('   1. Change role to Employee → Create Reimbursement');
    console.log('   2. Change role to Manager → Approve it (you will see your own items)');
    console.log('   3. Change role to HR → Approve it');
    console.log('   4. Change role to Finance → Approve and Mark as Paid');
    console.log('\n⚠️  Note: This is a self-referencing setup for testing only.\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error setting up test user:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  setupTestUser()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { setupTestUser };


