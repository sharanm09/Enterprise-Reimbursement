require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

async function createTestUsers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const rolesResult = await client.query('SELECT id, name FROM roles');
    const roles = {};
    rolesResult.rows.forEach(role => {
      roles[role.name] = role.id;
    });

    const testUsers = [
      {
        email: 'employee@test.com',
        display_name: 'Test Employee',
        azure_id: 'test-employee-001',
        role_name: 'employee',
        manager_email: 'manager@test.com'
      },
      {
        email: 'manager@test.com',
        display_name: 'Test Manager',
        azure_id: 'test-manager-001',
        role_name: 'manager',
        manager_email: null
      },
      {
        email: 'hr@test.com',
        display_name: 'Test HR',
        azure_id: 'test-hr-001',
        role_name: 'hr',
        manager_email: null
      },
      {
        email: 'finance@test.com',
        display_name: 'Test Finance',
        azure_id: 'test-finance-001',
        role_name: 'finance',
        manager_email: null
      }
    ];

    console.log('\n📋 Creating test users for all roles...\n');

    const createdUsers = {};

    for (const userData of testUsers) {
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [userData.email]
      );

      let userId;
      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        await client.query(
          `UPDATE users 
           SET display_name = $1, role_id = $2, azure_id = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [userData.display_name, roles[userData.role_name], userData.azure_id, userId]
        );
        console.log(`✅ Updated existing user: ${userData.display_name} (${userData.email})`);
      } else {
        const result = await client.query(
          `INSERT INTO users (email, display_name, azure_id, role_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id`,
          [userData.email, userData.display_name, userData.azure_id, roles[userData.role_name]]
        );
        userId = result.rows[0].id;
        console.log(`✅ Created new user: ${userData.display_name} (${userData.email})`);
      }

      createdUsers[userData.email] = {
        id: userId,
        ...userData
      };
    }

    console.log('\n📋 Setting up manager relationships...\n');

    const employeeUser = createdUsers['employee@test.com'];
    const managerUser = createdUsers['manager@test.com'];

    if (employeeUser && managerUser) {
      await client.query(
        'UPDATE users SET manager_id = $1 WHERE id = $2',
        [managerUser.id, employeeUser.id]
      );
      console.log(`✅ Set ${employeeUser.display_name} → Manager: ${managerUser.display_name}`);
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@qwikhire.ai';
    const superAdminResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [superAdminEmail]
    );

    if (superAdminResult.rows.length > 0) {
      const superAdminId = superAdminResult.rows[0].id;
      await client.query(
        'UPDATE users SET manager_id = $1 WHERE id = $1',
        [superAdminId]
      );
      console.log(`✅ Set Superadmin self-reference for testing`);
    }

    await client.query('COMMIT');

    console.log('\n✅ Test users setup completed successfully!\n');
    console.log('📝 Test Users Created:');
    console.log('   👤 Employee: employee@test.com');
    console.log('   👔 Manager: manager@test.com');
    console.log('   👥 HR: hr@test.com');
    console.log('   💰 Finance: finance@test.com');
    console.log('\n📋 Testing Options:');
    console.log('   Option 1: Use dummy users (create reimbursements as employee@test.com)');
    console.log('   Option 2: Use your superadmin account and change roles');
    console.log('   Option 3: Mix both - create as employee@test.com, approve as superadmin\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating test users:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  createTestUsers()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createTestUsers };


