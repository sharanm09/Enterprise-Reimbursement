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

// Helper function to detect table alias from selectFields
function detectAliasFromSelectFields(selectFields) {
  const aliasMatch = selectFields.match(/^([a-z]+)\./);
  return aliasMatch ? aliasMatch[1] : null;
}

// Helper function to detect table alias from joinClause
function detectAliasFromJoinClause(joinClause) {
  if (!joinClause.includes(' ON ')) {
    return null;
  }
  const joinAliasMatch = joinClause.match(/ON\s+([a-z]+)\./);
  return joinAliasMatch ? joinAliasMatch[1] : null;
}

// Helper function to determine main table alias
function determineTableAlias(tableAlias, selectFields, joinClause) {
  if (tableAlias) {
    return tableAlias;
  }
  return detectAliasFromSelectFields(selectFields) || detectAliasFromJoinClause(joinClause);
}

// Helper function to qualify field name with alias
function qualifyField(field, alias) {
  return alias ? `${alias}.${field}` : field;
}

// Helper function to build FROM clause
function buildFromClause(tableName, alias) {
  return alias ? `${tableName} ${alias}` : tableName;
}

// Helper function to add status filter to query
function addStatusFilter(query, params, paramCount, qualifiedStatusField, status) {
  if (!status || status === 'all') {
    return { query, params, paramCount };
  }
  const newParamCount = paramCount + 1;
  const newQuery = query + ` AND ${qualifiedStatusField} = $${newParamCount}`;
  const newParams = [...params, status];
  return { query: newQuery, params: newParams, paramCount: newParamCount };
}

// Helper function to add search filter to query
function addSearchFilter(query, params, paramCount, qualifiedSearchFields, search) {
  if (!search) {
    return { query, params, paramCount };
  }
  const newParamCount = paramCount + 1;
  const searchConditions = qualifiedSearchFields.map(field => `${field} ILIKE $${newParamCount}`).join(' OR ');
  const newQuery = query + ` AND (${searchConditions})`;
  const newParams = [...params, `%${search}%`];
  return { query: newQuery, params: newParams, paramCount: newParamCount };
}

// Helper function to add additional filters to query
function addAdditionalFilters(query, params, paramCount, additionalFilters, mainTableAlias) {
  let currentQuery = query;
  let currentParams = [...params];
  let currentParamCount = paramCount;
  
  for (const [field, value] of Object.entries(additionalFilters)) {
    if (field !== 'status' && field !== 'search' && value !== undefined && value !== null) {
      currentParamCount++;
      const qualifiedField = qualifyField(field, mainTableAlias);
      currentQuery += ` AND ${qualifiedField} = $${currentParamCount}`;
      currentParams.push(value);
    }
  }
  
  return { query: currentQuery, params: currentParams, paramCount: currentParamCount };
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
  
  const mainTableAlias = determineTableAlias(tableAlias, selectFields, joinClause);
  const fromClause = buildFromClause(tableName, mainTableAlias);
  const qualifiedStatusField = qualifyField(statusField, mainTableAlias);
  const qualifiedSearchFields = searchFields.map(field => qualifyField(field, mainTableAlias));
  
  let query = `SELECT ${selectFields} FROM ${fromClause} ${joinClause} WHERE 1=1`;
  let params = [];
  let paramCount = 0;
  
  const statusResult = addStatusFilter(query, params, paramCount, qualifiedStatusField, additionalFilters.status);
  query = statusResult.query;
  params = statusResult.params;
  paramCount = statusResult.paramCount;
  
  const searchResult = addSearchFilter(query, params, paramCount, qualifiedSearchFields, additionalFilters.search);
  query = searchResult.query;
  params = searchResult.params;
  paramCount = searchResult.paramCount;
  
  const additionalResult = addAdditionalFilters(query, params, paramCount, additionalFilters, mainTableAlias);
  query = additionalResult.query;
  params = additionalResult.params;
  
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

