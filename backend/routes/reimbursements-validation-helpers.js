// Helper functions to reduce cognitive complexity in reimbursements.js POST route
const logger = require('../utils/logger');

function parseRequestData(req) {
  let requestData;
  
  try {
    requestData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
  } catch (parseError) {
    logger.warn('Failed to parse request data, using raw body:', parseError.message);
    requestData = req.body;
  }
  
  return requestData;
}

function validateItems(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'At least one reimbursement item is required' };
  }
  return { valid: true };
}

function calculateTotalAmount(items) {
  const totalAmount = items.reduce((sum, item) => {
    const itemAmount = Number.parseFloat(item.amount || 0);
    if (Number.isNaN(itemAmount) || itemAmount < 0) {
      throw new Error(`Invalid amount for item: ${item.amount}`);
    }
    return sum + itemAmount;
  }, 0);
  
  if (totalAmount <= 0) {
    return { valid: false, error: 'Total amount must be greater than 0' };
  }
  
  return { valid: true, totalAmount };
}

function determineReimbursementStatus(status) {
  return status === 'submitted' ? 'pending approval' : status;
}

module.exports = {
  parseRequestData,
  validateItems,
  calculateTotalAmount,
  determineReimbursementStatus
};


