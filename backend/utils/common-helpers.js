// Common helper functions to reduce code duplication across routes
const logger = require('./logger');

/**
 * Build WHERE clause conditions with parameters
 * @param {Object} conditions - Object with field: value pairs
 * @param {number} paramOffset - Starting parameter index offset
 * @returns {Object} - { whereClause: string, params: array }
 */
function buildWhereClause(conditions, paramOffset = 0) {
  const whereParts = [];
  const params = [];
  let paramIndex = paramOffset;

  for (const [field, value] of Object.entries(conditions)) {
    if (value !== undefined && value !== null && value !== '') {
      paramIndex++;
      whereParts.push(`${field} = $${paramIndex}`);
      params.push(value);
    }
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
  return { whereClause, params };
}

/**
 * Build date filter clause
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {string} dateField - Field name for date comparison
 * @param {number} paramOffset - Starting parameter index offset
 * @returns {Object} - { filter: string, params: array }
 */
function buildDateFilter(startDate, endDate, dateField = 'created_at', paramOffset = 0) {
  let filter = '';
  const params = [];
  let paramIndex = paramOffset;

  if (startDate) {
    paramIndex++;
    filter += ` AND ${dateField} >= $${paramIndex}`;
    params.push(String(startDate));
  }
  if (endDate) {
    paramIndex++;
    const endDateTime = new Date(String(endDate));
    endDateTime.setHours(23, 59, 59, 999);
    filter += ` AND ${dateField} <= $${paramIndex}`;
    params.push(endDateTime.toISOString());
  }

  return { filter, params };
}

/**
 * Parse and validate search parameter
 * @param {any} searchRaw - Raw search parameter
 * @returns {string|null} - Validated search string or null
 */
function parseSearchParam(searchRaw) {
  if (searchRaw !== null && searchRaw !== undefined && typeof searchRaw === 'string') {
    return String(searchRaw);
  }
  return null;
}

/**
 * Handle database errors consistently
 * @param {Error} error - Database error
 * @param {Object} res - Express response object
 * @param {string} entityName - Name of entity being operated on
 * @param {string} action - Action being performed (create, update, delete, fetch)
 * @returns {Object} - Express response
 */
function handleDatabaseError(error, res, entityName, action) {
  if (error.code === '23505') {
    return res.status(400).json({ success: false, message: `${entityName} code already exists` });
  }
  if (error.code === '23503') {
    return res.status(400).json({ success: false, message: `Invalid reference for ${entityName}` });
  }
  logger.error(`Error ${action} ${entityName}:`, error);
  return res.status(500).json({ success: false, message: `Failed to ${action} ${entityName}`, error: error.message });
}

/**
 * Validate required fields
 * @param {Object} data - Data object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Array<string>} - Array of error messages
 */
function validateRequiredFields(data, requiredFields) {
  const errors = [];
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors.push(`${field} is required`);
    }
  }
  return errors;
}

/**
 * Build pagination parameters
 * @param {Object} query - Express query object
 * @param {number} defaultLimit - Default limit
 * @returns {Object} - { limit: number, offset: number }
 */
function buildPagination(query, defaultLimit = 50) {
  const limit = Math.min(Number.parseInt(query.limit, 10) || defaultLimit, 100);
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const offset = (page - 1) * limit;
  return { limit, offset, page };
}

module.exports = {
  buildWhereClause,
  buildDateFilter,
  parseSearchParam,
  handleDatabaseError,
  validateRequiredFields,
  buildPagination
};



