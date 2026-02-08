// Helper functions to reduce cognitive complexity in reimbursements.js
const logger = require('../utils/logger');

function organizeItemFiles(files) {
  const itemFilesMap = {};
  if (files && files.length > 0) {
    for (const file of files) {
      const fieldMatch = file.fieldname.match(/^item_(\d+)_attachments$/);
      if (fieldMatch) {
        const itemIndex = Number.parseInt(fieldMatch[1], 10);
        if (!itemFilesMap[itemIndex]) {
          itemFilesMap[itemIndex] = [];
        }
        itemFilesMap[itemIndex].push(file);
      }
    }
  }
  return itemFilesMap;
}

async function processReimbursementItem(client, reimbursementId, item, itemIndex, itemFilesMap, userId, initialStatus = 'pending') {
  const { expense_category_id, expense_type, amount, description: itemDescription, expense_date, meal_type, people_count, travel_purpose, lodging_city } = item;

  if (!expense_type || !amount || !expense_date) {
    await client.query('ROLLBACK');
    return { error: 'Expense type, amount, and date are required for each item' };
  }

  const itemAmount = Number.parseFloat(amount);
  if (Number.isNaN(itemAmount) || itemAmount <= 0) {
    await client.query('ROLLBACK');
    return { error: `Invalid amount for item: ${amount}. Amount must be a positive number.` };
  }

  const itemResult = await client.query(`
    INSERT INTO reimbursement_items (
      reimbursement_id, expense_category_id, expense_type, amount, description, 
      expense_date, meal_type, people_count, travel_purpose, lodging_city, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `, [
    reimbursementId,
    expense_category_id || null,
    expense_type,
    itemAmount,
    itemDescription || null,
    expense_date,
    meal_type || null,
    people_count || null,
    travel_purpose || null,
    lodging_city || null,
    initialStatus
  ]);

  const itemId = itemResult.rows[0].id;

  // Save attachments for this item
  if (itemFilesMap[itemIndex] && itemFilesMap[itemIndex].length > 0) {
    for (const file of itemFilesMap[itemIndex]) {
      try {
        await client.query(`
          INSERT INTO reimbursement_attachments (
            reimbursement_id, reimbursement_item_id, file_name, file_path, file_size, file_type, uploaded_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          reimbursementId,
          itemId,
          file.originalname,
          file.path,
          file.size,
          file.mimetype,
          userId
        ]);
      } catch (attachError) {
        if (attachError.code !== '42P01') {
          logger.warn('Error saving item attachment', attachError);
        }
      }
    }
  }

  return { success: true };
}

async function fetchReimbursementWithDetails(pool, reimbursementId) {
  let createdReimbursement = { rows: [] };
  let itemsResult = { rows: [] };
  let attachmentsResult = { rows: [] };

  try {
    createdReimbursement = await pool.query(`
      SELECT r.*, 
        d.name as department_name,
        cc.name as cost_center_name,
        p.name as project_name
      FROM reimbursements r
      LEFT JOIN departments d ON r.department_id = d.id
      LEFT JOIN cost_centers cc ON r.cost_center_id = cc.id
      LEFT JOIN projects p ON r.project_id = p.id
      WHERE r.id = $1
    `, [reimbursementId]);

    itemsResult = await pool.query(`
      SELECT ri.*, ec.name as expense_category_name
      FROM reimbursement_items ri
      LEFT JOIN expense_categories ec ON ri.expense_category_id = ec.id
      WHERE ri.reimbursement_id = $1
    `, [reimbursementId]);

    try {
      attachmentsResult = await pool.query(`
        SELECT id, file_name, file_path, file_size, file_type, created_at
        FROM reimbursement_attachments
        WHERE reimbursement_id = $1
      `, [reimbursementId]);
    } catch (attachQueryError) {
      if (attachQueryError.code !== '42P01') {
        logger.warn('Error fetching attachments', attachQueryError);
      }
    }
  } catch (joinError) {
    logger.warn('Error fetching joined data, returning basic data', joinError);
  }

  return {
    reimbursement: createdReimbursement.rows[0] || null,
    items: itemsResult.rows || [],
    attachments: attachmentsResult.rows || []
  };
}

module.exports = {
  organizeItemFiles,
  processReimbursementItem,
  fetchReimbursementWithDetails
};


