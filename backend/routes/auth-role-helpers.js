// Helper functions to reduce cognitive complexity in auth.js role update route
const { pool } = require('../config/database');
const User = require('../models/User');
const logger = require('../utils/logger');

async function assignManagerForRole(client, userId, roleName) {
  if (roleName !== 'employee' && roleName !== 'manager') {
    return;
  }

  const hrRoleResult = await client.query('SELECT id FROM roles WHERE name = $1', ['hr']);
  if (hrRoleResult.rows.length === 0) {
    return;
  }

  const hrUsersResult = await client.query(
    'SELECT id FROM users WHERE role_id = $1 LIMIT 1',
    [hrRoleResult.rows[0].id]
  );
  
  if (hrUsersResult.rows.length > 0) {
    await client.query(
      'UPDATE users SET manager_id = $1 WHERE id = $2',
      [hrUsersResult.rows[0].id, userId]
    );
  }
}

async function setHRManagerSelf(client, userId) {
  await client.query(
    'UPDATE users SET manager_id = $1 WHERE id = $1',
    [userId]
  );
}

async function updateUserRoleWithManager(client, userId, roleId, roleName) {
  const roleResult = await client.query('SELECT name FROM roles WHERE id = $1', [roleId]);
  const actualRoleName = roleResult.rows[0]?.name;

  if (actualRoleName === 'employee' || actualRoleName === 'manager') {
    await assignManagerForRole(client, userId, actualRoleName);
  } else if (actualRoleName === 'hr') {
    await setHRManagerSelf(client, userId);
  }
}

module.exports = {
  assignManagerForRole,
  setHRManagerSelf,
  updateUserRoleWithManager
};


