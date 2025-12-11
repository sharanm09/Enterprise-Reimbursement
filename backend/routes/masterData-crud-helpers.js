// Generic CRUD route handlers to eliminate duplication in masterData.js
const { parseSearchParam, handleDatabaseError } = require('../utils/common-helpers');
const { validateNameAndCode, handleGetWithFilters, handleCreate, handleUpdate, handleSoftDelete } = require('./masterData-helpers');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function handleGetRequest(req, res, entityConfig) {
  try {
    const search = parseSearchParam(req.query.search);
    const result = await handleGetWithFilters(entityConfig.tableName, {
      selectFields: entityConfig.selectFields || '*',
      joinClause: entityConfig.joinClause || '',
      groupBy: entityConfig.groupBy || '',
      orderBy: entityConfig.orderBy || '',
      tableAlias: entityConfig.tableAlias || null,
      additionalFilters: { ...entityConfig.additionalFilters, status: req.query.status, search }
    });
    res.json({ success: true, data: result.rows || [] });
  } catch (error) {
    logger.error(`Error fetching ${entityConfig.entityName}:`, error);
    res.status(500).json({ success: false, message: `Failed to fetch ${entityConfig.entityName}`, error: error.message });
  }
}

async function handlePostRequest(req, res, entityConfig) {
  try {
    const fields = entityConfig.getFields(req.body);
    const values = entityConfig.getValues(req.body);
    const additionalFields = entityConfig.getAdditionalFields ? entityConfig.getAdditionalFields(req.body) : {};
    
    const errors = validateNameAndCode(req.body.name, req.body.code, additionalFields);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const result = await handleCreate(entityConfig.tableName, fields, values);
    let data = result.rows[0];
    
    if (entityConfig.postProcess) {
      data = await entityConfig.postProcess(data, req.body);
    }
    
    res.json({ success: true, data });
  } catch (error) {
    return handleDatabaseError(error, res, entityConfig.entityName, 'create');
  }
}

async function handlePutRequest(req, res, entityConfig) {
  try {
    const { id } = req.params;
    const fields = entityConfig.getFields(req.body);
    const values = entityConfig.getValues(req.body);
    const additionalFields = entityConfig.getAdditionalFields ? entityConfig.getAdditionalFields(req.body) : {};
    
    const errors = validateNameAndCode(req.body.name, req.body.code, additionalFields);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', ') });
    }

    const result = await handleUpdate(entityConfig.tableName, id, fields, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `${entityConfig.entityName} not found` });
    }

    let data = result.rows[0];
    if (entityConfig.postProcess) {
      data = await entityConfig.postProcess(data, req.body);
    }

    res.json({ success: true, data });
  } catch (error) {
    return handleDatabaseError(error, res, entityConfig.entityName, 'update');
  }
}

async function handleDeleteRequest(req, res, entityConfig) {
  try {
    const { id } = req.params;
    const result = await handleSoftDelete(
      entityConfig.tableName,
      id,
      entityConfig.checkTable || null,
      entityConfig.checkField || null
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `${entityConfig.entityName} not found` });
    }
    res.json({ success: true, message: `${entityConfig.entityName} deactivated successfully` });
  } catch (error) {
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    logger.error(`Error deleting ${entityConfig.entityName}:`, error);
    res.status(500).json({ success: false, message: `Failed to delete ${entityConfig.entityName}`, error: error.message });
  }
}

module.exports = {
  handleGetRequest,
  handlePostRequest,
  handlePutRequest,
  handleDeleteRequest
};

