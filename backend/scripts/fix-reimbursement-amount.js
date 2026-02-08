const { pool } = require('../config/database');

async function fixReimbursementAmount() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reimbursementId = '63eba6e6-47af-4dc8-9285-edc0d9c2e7e5';
    const newAmount = 129;

    const itemsResult = await client.query(`
      SELECT id, amount FROM reimbursement_items WHERE reimbursement_id = $1 ORDER BY created_at ASC LIMIT 1
    `, [reimbursementId]);

    if (itemsResult.rows.length > 0) {
      const itemId = itemsResult.rows[0].id;
      
      await client.query(`
        UPDATE reimbursement_items
        SET amount = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newAmount, itemId]);

      await client.query(`
        UPDATE reimbursements
        SET total_amount = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newAmount, reimbursementId]);

      console.log(`✅ Updated reimbursement ${reimbursementId}`);
      console.log(`   Item ${itemId}: amount updated to ${newAmount}`);
      console.log(`   Total amount updated to ${newAmount}`);
    } else {
      console.log('⚠️  No items found for this reimbursement');
    }

    await client.query('COMMIT');
    console.log('\n✅ Amount updated successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating amount:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  fixReimbursementAmount()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixReimbursementAmount };

