require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

async function assignHrAsDefaultManager() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hrRoleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['hr']);
    
    if (hrRoleResult.rows.length === 0) {
      throw new Error('HR role not found in database');
    }

    const hrRoleId = hrRoleResult.rows[0].id;

    const hrUsersResult = await client.query(
      'SELECT id, email, display_name FROM users WHERE role_id = $1',
      [hrRoleId]
    );

    if (hrUsersResult.rows.length === 0) {
      console.log('⚠️  No HR users found. Creating a default HR user...');
      
      const hrUserResult = await client.query(
        `INSERT INTO users (azure_id, display_name, email, role_id, manager_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, display_name`,
        ['default-hr-001', 'Default HR Manager', 'hr@default.com', hrRoleId, null]
      );
      
      const hrUserId = hrUserResult.rows[0].id;
      
      await client.query(
        'UPDATE users SET manager_id = $1 WHERE id = $1',
        [hrUserId]
      );
      
      console.log(`✅ Created default HR user: ${hrUserResult.rows[0].display_name} (${hrUserResult.rows[0].email})`);
      console.log(`   HR User ID: ${hrUserId}\n`);
      
      const employeeRoleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['employee']);
      const managerRoleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['manager']);
      
      if (employeeRoleResult.rows.length > 0) {
        const updateResult = await client.query(
          `UPDATE users 
           SET manager_id = $1 
           WHERE role_id = $2 AND (manager_id IS NULL OR manager_id != id)
           RETURNING id, email, display_name`,
          [hrUserId, employeeRoleResult.rows[0].id]
        );
        
        if (updateResult.rows.length > 0) {
          console.log(`✅ Assigned ${updateResult.rows.length} employees to HR manager:`);
          updateResult.rows.forEach(user => {
            console.log(`   - ${user.display_name} (${user.email})`);
          });
        }
      }
      
      if (managerRoleResult.rows.length > 0) {
        const updateResult = await client.query(
          `UPDATE users 
           SET manager_id = $1 
           WHERE role_id = $2 AND (manager_id IS NULL OR manager_id != id)
           RETURNING id, email, display_name`,
          [hrUserId, managerRoleResult.rows[0].id]
        );
        
        if (updateResult.rows.length > 0) {
          console.log(`✅ Assigned ${updateResult.rows.length} managers to HR manager:`);
          updateResult.rows.forEach(user => {
            console.log(`   - ${user.display_name} (${user.email})`);
          });
        }
      }
      
      hrUsersResult.rows.push(hrUserResult.rows[0]);
    } else {
      const hrUserId = hrUsersResult.rows[0].id;
      
      await client.query(
        'UPDATE users SET manager_id = $1 WHERE id = $1',
        [hrUserId]
      );
      console.log(`✅ Set HR user self-reference: ${hrUsersResult.rows[0].display_name} (${hrUsersResult.rows[0].email})\n`);
      
      const employeeRoleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['employee']);
      if (employeeRoleResult.rows.length > 0) {
        const updateResult = await client.query(
          `UPDATE users 
           SET manager_id = $1 
           WHERE role_id = $2 AND (manager_id IS NULL OR manager_id != id)
           RETURNING id, email, display_name`,
          [hrUserId, employeeRoleResult.rows[0].id]
        );
        
        if (updateResult.rows.length > 0) {
          console.log(`✅ Assigned ${updateResult.rows.length} employees to HR manager:`);
          updateResult.rows.forEach(user => {
            console.log(`   - ${user.display_name} (${user.email})`);
          });
        } else {
          console.log('✅ All employees already have managers assigned');
        }
      }
    }

    const hrUsers = hrUsersResult.rows;
    hrUsers.forEach(hrUser => {
      client.query(
        'UPDATE users SET manager_id = $1 WHERE id = $1',
        [hrUser.id]
      );
    });

    await client.query('COMMIT');

    console.log('\n✅ Default manager assignment completed successfully!\n');
    console.log('📝 Summary:');
    console.log('   - All new employees will automatically get HR as manager');
    console.log('   - All new managers will automatically get HR as manager');
    console.log('   - HR users have self-referencing manager_id');
    console.log('   - Superadmin can reassign managers via User Management\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error assigning HR as default manager:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  assignHrAsDefaultManager()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { assignHrAsDefaultManager };

