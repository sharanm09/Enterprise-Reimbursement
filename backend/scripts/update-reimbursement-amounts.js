const { pool } = require('../config/database');

async function updateReimbursementAmounts() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reimbursementsResult = await client.query(`
      SELECT r.id, r.total_amount, 
             (SELECT COALESCE(SUM(ri.amount), 0) FROM reimbursement_items ri WHERE ri.reimbursement_id = r.id) as calculated_total
      FROM reimbursements r
    `);

    console.log(`Found ${reimbursementsResult.rows.length} reimbursements`);

    for (const reimbursement of reimbursementsResult.rows) {
      const currentTotal = parseFloat(reimbursement.total_amount || 0);
      const calculatedTotal = parseFloat(reimbursement.calculated_total || 0);

      if (currentTotal !== calculatedTotal && calculatedTotal > 0) {
        await client.query(`
          UPDATE reimbursements
          SET total_amount = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [calculatedTotal, reimbursement.id]);

        console.log(`✅ Updated reimbursement ${reimbursement.id}: ${currentTotal} → ${calculatedTotal}`);
      } else if (currentTotal === 0 && calculatedTotal === 0) {
        console.log(`⚠️  Reimbursement ${reimbursement.id} has no items or zero amount`);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Reimbursement amounts updated successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating reimbursement amounts:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  updateReimbursementAmounts()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { updateReimbursementAmounts };

