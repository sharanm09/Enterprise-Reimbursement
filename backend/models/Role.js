const { pool } = require('../config/database');

class Role {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.displayName = data.display_name || data.displayName;
    this.description = data.description;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description
    };
  }

  static async findAll() {
    try {
      const result = await pool.query('SELECT * FROM roles ORDER BY id');
      return result.rows.map(row => new Role(row));
    } catch (error) {
      console.error('Error finding roles:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return new Role(result.rows[0]);
    } catch (error) {
      console.error('Error finding role by ID:', error);
      throw error;
    }
  }

  static async findByName(name) {
    try {
      const result = await pool.query('SELECT * FROM roles WHERE name = ?', [name]);
      if (result.rows.length === 0) {
        return null;
      }
      return new Role(result.rows[0]);
    } catch (error) {
      console.error('Error finding role by name:', error);
      throw error;
    }
  }
}

module.exports = Role;

