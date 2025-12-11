// Helper functions to process reimbursement items and finalize reimbursement
const logger = require('../utils/logger');

async function processAllItems(client, reimbursementId, items, itemFilesMap, userId, organizeItemFiles, processReimbursementItem) {
  for (let i = 0; i < items.length; i++) {
    const result = await processReimbursementItem(client, reimbursementId, items[i], i, itemFilesMap, userId);
    if (result.error) {
      return { success: false, error: result.error };
    }
  }
  return { success: true };
}

async function recalculateAndUpdateTotal(client, reimbursementId, totalAmount) {
  const recalculatedTotal = await client.query(`
    SELECT COALESCE(SUM(amount), 0) as total FROM reimbursement_items WHERE reimbursement_id = $1
  `, [reimbursementId]);

  const finalTotal = Number.parseFloat(recalculatedTotal.rows[0].total);
  if (Math.abs(finalTotal - totalAmount) > 0.01) {
    await client.query(`
      UPDATE reimbursements
      SET total_amount = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [finalTotal, reimbursementId]);
  }
  
  return finalTotal;
}

module.exports = {
  processAllItems,
  recalculateAndUpdateTotal
};


