const { pool } = require('../config/database');
const logger = require('../utils/logger');

class User {
  constructor(data) {
    this.id = data.id || data._id;
    this.azureId = data.azureId || data.azure_id;
    this.displayName = data.displayName || data.display_name;
    this.email = data.email;
    this.givenName = data.givenName || data.given_name;
    this.surname = data.surname || data.family_name;
    this.roleId = data.roleId || data.role_id;
    this.managerId = data.managerId || data.manager_id;
    this.lastLogin = data.lastLogin || data.last_login;
    this.createdAt = data.createdAt || data.created_at;
    this.updatedAt = data.updatedAt || data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      _id: this.id,
      azureId: this.azureId,
      displayName: this.displayName,
      email: this.email,
      givenName: this.givenName,
      surname: this.surname,
      surname: this.surname,
      roleId: this.roleId,
      managerId: this.managerId,
      lastLogin: this.lastLogin
    };
  }

  static async findOne(conditions) {
    try {
      let query = 'SELECT u.*, r.name as role_name, r.display_name as role_display_name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE ';
      const values = [];
      const conditionsArray = [];

      if (conditions.azureId) {
        conditionsArray.push(`u.azure_id = $${values.length + 1}`);
        values.push(conditions.azureId);
      }
      if (conditions.email) {
        conditionsArray.push(`u.email = $${values.length + 1}`);
        values.push(conditions.email);
      }
      if (conditions.id) {
        conditionsArray.push(`u.id = $${values.length + 1}`);
        values.push(conditions.id);
      }

      if (conditionsArray.length === 0) {
        return null;
      }

      query += conditionsArray.join(' AND ');
      query += ' LIMIT 1';

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      const userData = result.rows[0];
      const user = new User(userData);
      if (userData.role_name) {
        user.role = {
          name: userData.role_name,
          displayName: userData.role_display_name
        };
      }
      return user;
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query(`
        SELECT u.*, r.name as role_name, r.display_name as role_display_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const userData = result.rows[0];
      const user = new User(userData);
      if (userData.role_name) {
        user.role = {
          name: userData.role_name,
          displayName: userData.role_display_name
        };
      }
      return user;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async findAll() {
    try {
      const result = await pool.query(`
        SELECT u.*, r.name as role_name, r.display_name as role_display_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        ORDER BY u.created_at DESC
      `);
      return rows.map(row => {
        const user = new User(row);
        if (row.role_name) {
          user.role = {
            name: row.role_name,
            displayName: row.role_display_name
          };
        }
        return user;
      });
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw error;
    }
  }

  async updateUser() {
    const result = await pool.query(
      `UPDATE users 
       SET display_name = $1, email = $2, given_name = $3, surname = $4, last_login = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [this.displayName, this.email, this.givenName, this.surname, this.lastLogin, this.id]
    );

    if (result.rows.length > 0) {
      Object.assign(this, new User(result.rows[0]));
    }
    return this;
  }

  async assignRole(isSuperAdmin) {
    if (this.roleId) {
      return this.roleId;
    }

    if (isSuperAdmin) {
      const superAdminRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['superadmin']);
      return superAdminRole.rows[0]?.id || null;
    }

    const employeeRole = await pool.query('SELECT id FROM roles WHERE name = $1', ['employee']);
    return employeeRole.rows[0]?.id || null;
  }

  async assignManager(roleName) {
    if (roleName !== 'employee' && roleName !== 'manager') {
      return null;
    }

    const hrRoleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['hr']);
    if (hrRoleResult.rows.length === 0) {
      return null;
    }

    const hrUsersResult = await pool.query(
      'SELECT id FROM users WHERE role_id = $1 LIMIT 1',
      [hrRoleResult.rows[0].id]
    );

    return hrUsersResult.rows.length > 0 ? hrUsersResult.rows[0].id : null;
  }

  async createUser(roleId, managerId, roleName) {
    const surnameValue = this.surname || null;

    const result = await pool.query(
      `INSERT INTO users (azure_id, display_name, email, given_name, surname, family_name, role_id, manager_id, last_login)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        this.azureId,
        this.displayName,
        this.email,
        this.givenName || null,
        surnameValue,
        surnameValue,
        roleId,
        managerId,
        this.lastLogin || new Date()
      ]
    );

    if (result.rows.length > 0) {
      Object.assign(this, new User(result.rows[0]));

      if (roleName === 'hr' && this.id) {
        await pool.query(
          'UPDATE users SET manager_id = $1 WHERE id = $1',
          [this.id]
        );
      }
    }
    return this;
  }

  validateRequiredFields() {
    if (!this.azureId) {
      throw new Error('azureId is required but was not provided');
    }
    if (!this.displayName) {
      throw new Error('displayName is required but was not provided');
    }
    if (!this.email) {
      throw new Error('email is required but was not provided');
    }
  }

  async createNewUser() {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@qwikhire.ai';
    const isSuperAdmin = this.email.toLowerCase() === superAdminEmail.toLowerCase();

    const roleId = await this.assignRole(isSuperAdmin);
    const roleResult = await pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
    const roleName = roleResult.rows[0]?.name;
    const managerId = await this.assignManager(roleName);

    return await this.createUser(roleId, managerId, roleName);
  }

  async save() {
    try {
      this.validateRequiredFields();

      if (this.id) {
        return await this.updateUser();
      }

      return await this.createNewUser();
    } catch (error) {
      logger.error('Error saving user:', error);
      throw error;
    }
  }

  async updateRole(roleId) {
    try {
      if (!this.id) {
        throw new Error(`User ID is not set. Current user object: ${JSON.stringify({ id: this.id, email: this.email })}`);
      }

      if (!roleId) {
        throw new Error('Role ID is required');
      }

      const result = await pool.query(
        `UPDATE users 
         SET role_id = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
        [roleId, this.id]
      );

      if (result.rows.length === 0) {
        throw new Error(`No user found with ID: ${this.id}`);
      }

      this.roleId = result.rows[0].role_id;
      return this;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }
}

module.exports = User;
