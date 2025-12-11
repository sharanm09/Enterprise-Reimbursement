// Helper functions to reduce duplication in masterData.js
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { parseSearchParam, handleDatabaseError } = require('../utils/common-helpers');

// Common validation for name and code
function validateNameAndCode(name, code, additionalFields = {}) {
  const errors = [];
  if (!name) errors.push('Name is required');
  if (!code) errors.push('Code is required');
  
  for (const [field, value] of Object.entries(additionalFields)) {
    if (value === undefined || value === null || value === '') {
      errors.push(`${field} is required`);
    }
  }
  
  return errors;
}

// Common GET handler with search and status filter
async function handleGetWithFilters(tableName, options = {}) {
  const {
    statusField = 'status',
    searchFields = ['name', 'code'],
    joinClause = '',
    groupBy = '',
    orderBy = '',
    additionalFilters = {},
    selectFields = '*',
    tableAlias = null
  } = options;
  
  // Determine table alias - use provided alias or detect from selectFields/joinClause
  let mainTableAlias = tableAlias;
  if (!mainTableAlias) {
    // Detect alias from selectFields (e.g., 'd.*' or 'cc.*')
    const aliasMatch = selectFields.match(/^([a-z]+)\./);
    if (aliasMatch) {
      mainTableAlias = aliasMatch[1];
    } else if (joinClause.includes(' ON ')) {
      // Detect from join clause (e.g., 'LEFT JOIN cost_centers cc ON d.id')
      const joinAliasMatch = joinClause.match(/ON\s+([a-z]+)\./);
      if (joinAliasMatch) {
        mainTableAlias = joinAliasMatch[1];
      }
    }
  }
  
  // Build FROM clause with alias if needed
  const fromClause = mainTableAlias ? `${tableName} ${mainTableAlias}` : tableName;
  const qualifiedStatusField = mainTableAlias ? `${mainTableAlias}.${statusField}` : statusField;
  const qualifiedSearchFields = searchFields.map(field => 
    mainTableAlias ? `${mainTableAlias}.${field}` : field
  );
  
  let query = `SELECT ${selectFields} FROM ${fromClause} ${joinClause} WHERE 1=1`;
  const params = [];
  let paramCount = 0;
  
  // Status filter
  if (additionalFilters.status && additionalFilters.status !== 'all') {
    paramCount++;
    query += ` AND ${qualifiedStatusField} = $${paramCount}`;
    params.push(additionalFilters.status);
  }
  
  // Search filter
  if (additionalFilters.search) {
    paramCount++;
    const searchConditions = qualifiedSearchFields.map(field => `${field} ILIKE $${paramCount}`).join(' OR ');
    query += ` AND (${searchConditions})`;
    params.push(`%${additionalFilters.search}%`);
  }
  
  // Additional filters - qualify field names with table alias if needed
  for (const [field, value] of Object.entries(additionalFilters)) {
    if (field !== 'status' && field !== 'search' && value !== undefined && value !== null) {
      paramCount++;
      const qualifiedField = mainTableAlias ? `${mainTableAlias}.${field}` : field;
      query += ` AND ${qualifiedField} = $${paramCount}`;
      params.push(value);
    }
  }
  
  if (groupBy) {
    query += ` ${groupBy}`;
  }
  
  if (orderBy) {
    query += ` ${orderBy}`;
  }
  
  return pool.query(query, params);
}

// Common POST handler
async function handleCreate(tableName, fields, values, returning = '*') {
  const fieldNames = fields.join(', ');
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
  
  const query = `
    INSERT INTO ${tableName} (${fieldNames})
    VALUES (${placeholders})
    RETURNING ${returning}
  `;
  
  return pool.query(query, values);
}

// Common PUT handler
async function handleUpdate(tableName, id, fields, values, returning = '*') {
  const updates = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
  const idParam = fields.length + 1;
  
  const query = `
    UPDATE ${tableName}
    SET ${updates}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${idParam}
    RETURNING ${returning}
  `;
  
  return pool.query(query, [...values, id]);
}

// Check if entity can be deleted (has active related records)
async function checkCanDelete(tableName, id, checkTable, checkField) {
  const isDepartmentCheck = checkTable === 'cost_centers' && checkField === 'department_id';
  const checkQuery = isDepartmentCheck
    ? `SELECT COUNT(*) as count FROM ${checkTable} WHERE ${checkField} = $1 AND status = $2`
    : `SELECT COUNT(*) as count FROM ${checkTable} WHERE ${checkField} = $1`;
  
  const checkParams = isDepartmentCheck ? [id, 'active'] : [id];
  const checkResult = await pool.query(checkQuery, checkParams);
  
  if (Number.parseInt(checkResult.rows[0].count, 10) > 0) {
    const entityName = tableName === 'departments' ? 'department' : 'cost center';
    const relatedName = checkTable === 'cost_centers' ? 'cost centers' : 'reimbursements';
    throw new Error(`Cannot delete ${entityName} with active ${relatedName}. Please deactivate instead.`);
  }
}

// Common DELETE handler (soft delete by setting status to inactive)
async function handleSoftDelete(tableName, id, checkTable = null, checkField = null) {
  if (checkTable && checkField) {
    await checkCanDelete(tableName, id, checkTable, checkField);
  }
  
  return pool.query(
    `UPDATE ${tableName} SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    ['inactive', id]
  );
}

module.exports = {
  validateNameAndCode,
  handleGetWithFilters,
  handleCreate,
  handleUpdate,
  handleSoftDelete
};

