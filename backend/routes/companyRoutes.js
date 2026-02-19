const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const logger = require('../utils/logger');

// Configure multer for company logo
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/company-logos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Keep consistent filename for logo to avoid accumulation if needed, or timestamped
        cb(null, `company-logo-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Helper to get the single company ID (assuming single tenant/company for now)
const getCompanyId = async () => {
    const result = await pool.query('SELECT id FROM company_details LIMIT 1');
    return result.rows.length > 0 ? result.rows[0].id : null;
};

// GET company details
router.get('/', async (req, res) => {
    try {
        const companyResult = await pool.query('SELECT * FROM company_details LIMIT 1');
        const company = companyResult.rows[0];

        if (!company) {
            return res.json({ success: true, company: null, bankAccounts: [] });
        }

        const banksResult = await pool.query('SELECT * FROM company_bank_accounts WHERE company_id = $1 ORDER BY is_default DESC, created_at ASC', [company.id]);

        // Transform keys to match frontend expectation (camelCase)
        const formattedCompany = {
            id: company.id,
            companyName: company.company_name,
            gstNo: company.gst_no,
            panNo: company.pan_no,
            registerOffice: company.registered_office,
            corporateOffice: company.corporate_office,
            website: company.website,
            portfolio: company.portfolio,
            logoPath: company.logo_path ? `/uploads/company-logos/${path.basename(company.logo_path)}` : null
        };

        const formattedBanks = banksResult.rows.map(bank => ({
            id: bank.id,
            bankName: bank.bank_name,
            accountNumber: bank.account_number,
            ifsc: bank.ifsc_code,
            branch: bank.branch,
            isDefault: bank.is_default
        }));

        res.json({
            success: true,
            company: formattedCompany,
            bankAccounts: formattedBanks
        });
    } catch (error) {
        logger.error('Error fetching company details:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch company details' });
    }
});

// POST update company details
router.post('/', upload.single('logo'), async (req, res) => {
    try {
        const { companyName, gstNo, panNo, registerOffice, corporateOffice, website, portfolio } = req.body;
        let logoPath = req.file ? req.file.path : undefined;

        // Check if company exists
        const companyResult = await pool.query('SELECT id, logo_path FROM company_details LIMIT 1');
        const existingCompany = companyResult.rows[0];

        if (existingCompany) {
            // Update
            const updateQuery = `
        UPDATE company_details 
        SET company_name = $1, gst_no = $2, pan_no = $3, registered_office = $4, 
            corporate_office = $5, website = $6, portfolio = $7, updated_at = CURRENT_TIMESTAMP
            ${logoPath ? ', logo_path = $8' : ''}
        WHERE id = $9
        RETURNING *
      `;

            const params = [
                companyName, gstNo, panNo, registerOffice, corporateOffice, website, portfolio
            ];

            if (logoPath) {
                params.push(logoPath);
                params.push(existingCompany.id);

                // Delete old logo if it exists and is different (optional, implemented for cleanup)
                if (existingCompany.logo_path && fs.existsSync(existingCompany.logo_path)) {
                    try {
                        fs.unlinkSync(existingCompany.logo_path);
                    } catch (err) {
                        logger.warn('Failed to delete old logo:', err);
                    }
                }
            } else {
                params.push(existingCompany.id);
            }

            await pool.query(updateQuery, params);

            res.json({ success: true, message: 'Company details updated successfully', logoPath: logoPath ? `/uploads/company-logos/${path.basename(logoPath)}` : undefined });
        } else {
            // Insert
            const insertQuery = `
        INSERT INTO company_details (company_name, gst_no, pan_no, registered_office, corporate_office, website, portfolio, logo_path)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;
            await pool.query(insertQuery, [companyName, gstNo, panNo, registerOffice, corporateOffice, website, portfolio, logoPath]);
            res.json({ success: true, message: 'Company details created successfully', logoPath: logoPath ? `/uploads/company-logos/${path.basename(logoPath)}` : undefined });
        }

    } catch (error) {
        logger.error('Error updating company details:', error);
        res.status(500).json({ success: false, message: 'Failed to update company details' });
    }
});

// POST add bank account
router.post('/bank-account', async (req, res) => {
    try {
        const { bankName, accountNumber, ifsc, branch, isDefault } = req.body;
        let companyId = await getCompanyId();

        if (!companyId) {
            return res.status(400).json({ success: false, message: 'Company details must be created before adding bank accounts' });
        }

        if (isDefault) {
            // Reset other defaults
            await pool.query('UPDATE company_bank_accounts SET is_default = false WHERE company_id = $1', [companyId]);
        }

        const insertQuery = `
      INSERT INTO company_bank_accounts (company_id, bank_name, account_number, ifsc_code, branch, is_default)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
        const result = await pool.query(insertQuery, [companyId, bankName, accountNumber, ifsc, branch, isDefault || false]);

        res.json({ success: true, id: result.rows[0].id, message: 'Bank account added successfully' });
    } catch (error) {
        logger.error('Error adding bank account:', error);
        res.status(500).json({ success: false, message: 'Failed to add bank account' });
    }
});

// DELETE bank account
router.delete('/bank-account/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM company_bank_accounts WHERE id = $1', [id]);
        res.json({ success: true, message: 'Bank account deleted successfully' });
    } catch (error) {
        logger.error('Error deleting bank account:', error);
        res.status(500).json({ success: false, message: 'Failed to delete bank account' });
    }
});

// PUT set default bank account
router.put('/bank-account/:id/default', async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = await getCompanyId();

        // Transaction to ensure data consistency
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('UPDATE company_bank_accounts SET is_default = false WHERE company_id = $1', [companyId]);
            await client.query('UPDATE company_bank_accounts SET is_default = true WHERE id = $1', [id]);
            await client.query('COMMIT');
            res.json({ success: true, message: 'Default bank account updated' });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error setting default bank account:', error);
        res.status(500).json({ success: false, message: 'Failed to set default bank account' });
    }
});

module.exports = router;
