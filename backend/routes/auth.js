const express = require('express');
const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const crypto = require('crypto');
const User = require('../models/User');
const Role = require('../models/Role');
const azureConfig = require('../config/azureConfig');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'text/csv' ||
      file.originalname.match(/\.(xlsx|csv)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .csv files are allowed!'), false);
    }
  }
});

const router = express.Router();

let client = null;
if (process.env.AZURE_AD_TENANT_ID) {
  client = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/discovery/v2.0/keys`
  });
}

if (azureConfig.isValid && azureConfig.clientID) {
  try {
    passport.use(new OIDCStrategy(azureConfig, async (iss, sub, profile, accessToken, refreshToken, done) => {
      try {
        const azureId = profile.oid || profile.id || sub || profile._json?.oid || profile._json?.sub;

        if (!azureId) {
          logger.error('No Azure ID found in profile');
          return done(new Error('Azure ID not found in profile'), null);
        }

        let user = await User.findOne({ azureId: azureId });

        if (user) {
          user.lastLogin = new Date();
          await user.save();
        } else {
          user = new User({
            azureId: azureId,
            displayName: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || profile._json?.email || 'User',
            email: profile._json?.email || profile._json?.upn || profile._json?.preferred_username,
            givenName: profile.name?.givenName,
            surname: profile.name?.familyName
          });
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        logger.error('Passport OIDC error:', error);
        return done(error, null);
      }
    }));
  } catch (error) {
    logger.error('Error initializing Passport Azure AD strategy:', error.message);
  }
} else {
  logger.warn('Azure AD configuration is incomplete. Passport OIDC strategy not initialized.');
}

passport.serializeUser((user, done) => {
  const userId = user.id || user._id;
  if (!userId) {
    return done(new Error('User ID not found'), null);
  }
  done(null, userId);
});

passport.deserializeUser(async (id, done) => {
  try {
    if (!id) {
      return done(new Error('No user ID provided'), null);
    }
    const user = await User.findById(id);
    if (!user) {
      return done(new Error('User not found'), null);
    }
    done(null, user);
  } catch (error) {
    logger.error('Deserialize user error:', error);
    done(error, null);
  }
});

const isSuperAdmin = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!user.role || user.role.name !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Access denied. Super Admin only.' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Error checking superadmin status:', error);
    return res.status(500).json({ success: false, message: 'Error checking permissions' });
  }
};

router.get('/login', (req, res, next) => {
  if (!azureConfig.isValid || !azureConfig.clientID) {
    return res.status(503).json({
      success: false,
      message: 'Azure AD configuration is not set up. Please configure your .env file.'
    });
  }
  passport.authenticate('azuread-openidconnect', {
    failureRedirect: '/login',
    session: true
  })(req, res, next);
}, (req, res) => {
  res.redirect(process.env.FRONTEND_URL);
});

router.post('/azure/callback', (req, res, next) => {
  if (!azureConfig.isValid || !azureConfig.clientID) {
    return res.status(503).json({
      success: false,
      message: 'Azure AD configuration is not set up. Please configure your .env file.'
    });
  }
  passport.authenticate('azuread-openidconnect', {
    failureRedirect: '/login',
    session: true
  })(req, res, next);
}, (req, res) => {
  res.redirect(process.env.FRONTEND_URL);
});

router.post('/validate-token', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Token required' });
    }

    if (!process.env.AZURE_AD_TENANT_ID || !process.env.AZURE_AD_CLIENT_ID || !client) {
      return res.status(503).json({
        success: false,
        message: 'Azure AD configuration is not set up. Please configure AZURE_AD_TENANT_ID and AZURE_AD_CLIENT_ID in your .env file.'
      });
    }

    const decodedHeader = jwt.decode(idToken, { complete: true });
    if (!decodedHeader) {
      return res.status(401).json({ success: false, message: 'Invalid token format' });
    }

    client.getSigningKey(decodedHeader.header.kid, async (err, key) => {
      if (err) {
        logger.error('Error getting signing key:', err);
        return res.status(401).json({ success: false, message: 'Failed to get signing key' });
      }

      const signingKey = key.publicKey || key.rsaPublicKey;

      try {
        const decoded = jwt.verify(idToken, signingKey, {
          audience: process.env.AZURE_AD_CLIENT_ID,
          issuer: [`https://sts.windows.net/${process.env.AZURE_AD_TENANT_ID}/`, `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`],
          algorithms: ['RS256']
        });

        const { extractAzureId, findOrCreateUser, buildUserResponse } = require('./auth-helpers');
        const azureId = extractAzureId(decoded);

        if (!azureId) {
          return res.status(400).json({
            success: false,
            message: 'Invalid token: Azure ID not found.'
          });
        }

        const user = await findOrCreateUser(azureId, decoded);

        req.login(user, (err) => {
          if (err) {
            logger.error('Session creation error:', err);
            return res.status(500).json({ success: false, message: 'Session creation failed', error: err.message });
          }

          res.json(buildUserResponse(user));
        });
      } catch (verifyError) {
        logger.error('Token verification error:', verifyError);
        return res.status(401).json({ success: false, message: 'Invalid token', error: verifyError.message });
      }
    });
  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(500).json({ success: false, message: 'Token validation failed', error: error.message });
  }
});

router.get('/user', async (req, res) => {
  try {
    if (req.isAuthenticated()) {
      const userId = req.user?.id || req.user?._id || req.session?.passport?.user;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated. Please login first through the frontend application.'
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Please login again.'
        });
      }

      const userData = user.toJSON ? user.toJSON() : user;
      res.json({
        success: true,
        user: {
          id: userData.id || userData._id,
          displayName: userData.displayName,
          email: userData.email,
          givenName: userData.givenName,
          surname: userData.surname,
          role: user.role || null
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Not authenticated. Please login first through the frontend application.'
      });
    }
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user information',
      error: error.message
    });
  }
});

router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.findAll();
    res.json({
      success: true,
      roles: roles.map(role => role.toJSON())
    });
  } catch (error) {
    logger.error('Error fetching roles:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
});

router.get('/test-users', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test login is not available in production'
      });
    }

    const usersResult = await pool.query(`
      SELECT u.*, r.name as role_name, r.display_name as role_display_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email LIKE '%@qwikhire.ai' 
         OR u.email LIKE '%@company.com'
         OR u.email LIKE '%@test.com' 
         OR u.azure_id LIKE '%-001' 
         OR u.azure_id LIKE '%-002'
         OR u.azure_id LIKE 'test-%'
      ORDER BY u.created_at DESC
    `);

    res.json({
      success: true,
      users: usersResult.rows.map(row => ({
        id: row.id,
        displayName: row.display_name,
        email: row.email,
        role: row.role_name ? {
          name: row.role_name,
          displayName: row.role_display_name
        } : null
      }))
    });
  } catch (error) {
    logger.error('Error fetching test users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch test users' });
  }
});

router.post('/test-login', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Test login is not available in production'
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Test user not found' });
    }

    const isTestUser = user.email?.includes('@test.com') ||
      user.email?.includes('@qwikhire.ai') ||
      user.email?.includes('@company.com') ||
      user.azureId?.startsWith('test-') ||
      user.azureId?.endsWith('-001') ||
      user.azureId?.endsWith('-002');

    if (!isTestUser) {
      return res.status(403).json({
        success: false,
        message: 'Only test users can login via this method'
      });
    }

    req.login(user, (err) => {
      if (err) {
        logger.error('Test login session creation error:', err);
        return res.status(500).json({
          success: false,
          message: 'Session creation failed',
          error: err.message
        });
      }

      const userData = user.toJSON ? user.toJSON() : user;
      res.json({
        success: true,
        message: 'Logged in as test user successfully',
        user: {
          id: userData.id || userData._id,
          displayName: userData.displayName,
          email: userData.email,
          role: user.role || null
        }
      });
    });
  } catch (error) {
    logger.error('Error in test login:', error);
    res.status(500).json({
      success: false,
      message: 'Test login failed',
      error: error.message
    });
  }
});

router.get('/users', isSuperAdmin, async (req, res) => {
  try {
    const usersResult = await pool.query(`
      SELECT u.*, r.name as role_name, r.display_name as role_display_name,
             m.id as manager_id, m.display_name as manager_name, m.email as manager_email
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN users m ON u.manager_id = m.id
      ORDER BY 
        CASE 
          WHEN u.employee_id ~ '^[0-9]+$' THEN CAST(u.employee_id AS INTEGER) 
          WHEN u.employee_id ~ '^[A-Za-z]+[0-9]+$' THEN CAST(NULLIF(regexp_replace(u.employee_id, '[^0-9]', '', 'g'), '') AS INTEGER)
          ELSE 999999 
        END ASC,
        u.employee_id ASC
    `);

    res.json({
      success: true,
      users: usersResult.rows.map(row => ({
        id: row.id,
        displayName: row.display_name,
        email: row.email,
        role: row.role_name ? {
          name: row.role_name,
          displayName: row.role_display_name
        } : null,
        roleId: row.role_id,
        managerId: row.manager_id,
        managerName: row.manager_name,
        managerEmail: row.manager_email,
        managerId: row.manager_id,
        managerName: row.manager_name,
        managerEmail: row.manager_email,
        bankAccountNo: row.bank_account_no,
        employeeId: row.employee_id,
        ifscCode: row.ifsc_code,
        isIciciBank: row.is_icici_bank,
        costCenter: row.cost_center,
        location: row.location,
        departmentId: row.department_id
      }))
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.post('/users', isSuperAdmin, async (req, res) => {
  console.log('--- Entering POST /users ---');
  try {
    const { displayName, email, roleId, managerId, bankAccountNo, employeeId, ifscCode, isIciciBank, costCenter, location, departmentId } = req.body;

    if (!displayName || !email || !roleId) {
      return res.status(400).json({ success: false, message: 'Display Name, Email, and Role are required' });
    }

    // Check if user exists
    let existingUser;
    try {
      existingUser = await User.findOne({ email });
    } catch (e) {
      throw new Error(`User.findOne failed: ${e.message}`);
    }
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    const newUser = new User({
      azureId: crypto.randomUUID(), // Generate a manual ID
      displayName,
      email,
      roleId,
      managerId: managerId || null,
      bankAccountNo: bankAccountNo || null,
      employeeId: employeeId || null,
      ifscCode: ifscCode || null,
      isIciciBank: isIciciBank || false,
      costCenter: costCenter || null,
      location: location || null,
      departmentId: departmentId || null
    });

    let roleResult;
    try {
      roleResult = await Role.findById(roleId);
    } catch (e) {
      throw new Error(`Role.findById failed: ${e.message}`);
    }
    const roleName = roleResult ? roleResult.name : null;

    try {
      await newUser.createUser(roleId, managerId || null, roleName);
    } catch (e) {
      throw new Error(`newUser.createUser failed: ${e.message}`);
    }

    res.status(201).json({
      success: true,
      user: newUser.toJSON(),
      message: 'User created successfully'
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Failed to create user', error: error.message, stack: error.stack });
  }
});

router.put('/users/:id', isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, email, bankAccountNo, employeeId, ifscCode, isIciciBank, costCenter, location, departmentId } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update fields
    if (displayName) user.displayName = displayName;
    if (email) user.email = email;
    if (bankAccountNo !== undefined) user.bankAccountNo = bankAccountNo;
    if (employeeId !== undefined) user.employeeId = employeeId;
    if (ifscCode !== undefined) user.ifscCode = ifscCode;
    if (isIciciBank !== undefined) user.isIciciBank = isIciciBank;
    if (costCenter !== undefined) user.costCenter = costCenter;
    if (location !== undefined) user.location = location;
    if (departmentId !== undefined) user.departmentId = departmentId;

    await user.updateUser();

    res.json({
      success: true,
      user: user.toJSON(),
      message: 'User updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
  }
});

router.delete('/users/:id', isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting self
    if (req.user.id === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
  }
});

router.put('/users/:id/manager', isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { managerId } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (managerId) {
      const manager = await User.findById(managerId);
      if (!manager) {
        return res.status(404).json({ success: false, message: 'Manager not found' });
      }
    }

    await pool.query(
      'UPDATE users SET manager_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [managerId || null, id]
    );

    const updatedUser = await User.findById(id);

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        managerId: managerId || null
      }
    });
  } catch (error) {
    logger.error('Error updating user manager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user manager',
      error: error.message
    });
  }
});

router.put('/users/:id/role', isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ success: false, message: 'Role ID is required' });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.id) {
      return res.status(400).json({ success: false, message: 'Invalid user object - missing ID' });
    }

    await user.updateRole(roleId);

    const { updateUserRoleWithManager } = require('./auth-role-helpers');
    const client = await pool.connect();
    try {
      await updateUserRoleWithManager(client, id, roleId);
    } finally {
      client.release();
    }

    const updatedUser = await User.findById(id);

    if (!updatedUser) {
      return res.status(500).json({ success: false, message: 'Failed to fetch updated user' });
    }

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        email: updatedUser.email,
        role: updatedUser.role || null,
        roleId: updatedUser.roleId
      }
    });
  } catch (error) {
    logger.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
});

router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      logger.error('Logout error:', err);
    }
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destroy error:', err);
        return res.status(500).json({ success: false, message: 'Session destroy failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

router.post('/users/import', isSuperAdmin, upload.single('file'), async (req, res) => {
  let client;
  const tempFilePath = req.file ? req.file.path : null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, message: 'File is empty or invalid' });
    }

    // Initialize summary
    let summary = {
      totalRows: data.length,
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: []
    };

    const validEmployeeIds = [];
    const rowsToProcess = [];

    // Pre-validation and ID extraction
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // Excel row number (1-based + 1 for header)
      // Check various variations for Employee ID
      const employeeId = row['Employee ID'] || row['employee_id'] || row['EmployeeId'] || row['Emp ID'] || row['EmpID'] || row['Emp Id'];
      const email = row['Email'] || row['email'];
      const displayName = row['Display Name'] || row['display_name'] || row['Name'];

      if (!employeeId) {
        summary.failed++;
        summary.errors.push({ row: rowNumber, error: 'Missing Employee ID' });
        continue;
      }

      // Basic duplicate check within file
      if (validEmployeeIds.includes(employeeId)) {
        summary.failed++;
        summary.errors.push({ row: rowNumber, error: 'Duplicate Employee ID in file' });
        continue;
      }

      if (!email || !String(email).includes('@')) {
        summary.failed++;
        summary.errors.push({ row: rowNumber, error: 'Invalid or missing Email' });
        continue;
      }

      if (!displayName) {
        summary.failed++;
        summary.errors.push({ row: rowNumber, error: 'Missing Display Name' });
        continue;
      }

      validEmployeeIds.push(employeeId);
      rowsToProcess.push({ ...row, employeeIdLower: String(employeeId).trim(), rowNumber });
    }


    if (validEmployeeIds.length === 0) {
      // Cleanup
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      return res.json({ success: true, summary });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Fetch existing users by employee_id or email
    // We check both because email must be unique too, and employee_id is the key
    const existingUsersResult = await client.query(
      'SELECT * FROM users WHERE employee_id = ANY($1) OR email = ANY($2)',
      [validEmployeeIds, rowsToProcess.map(r => r['Email'] || r['email'])]
    );

    const existingUsersMap = new Map(); // Key: employee_id
    const existingEmailsMap = new Set();

    existingUsersResult.rows.forEach(user => {
      if (user.employee_id) existingUsersMap.set(user.employee_id, user);
      if (user.email) existingEmailsMap.add(user.email.toLowerCase());
    });

    // Process rows
    for (const row of rowsToProcess) {
      try {
        const employeeId = row['Employee ID'] || row['employee_id'] || row['EmployeeId'] || row['Emp ID'] || row['EmpID'] || row['Emp Id'];
        const employeeIdStr = String(employeeId).trim();

        // Map other fields
        const email = (row['Email'] || row['email']).trim();
        const displayName = (row['Display Name'] || row['display_name'] || row['Name']).trim();
        const bankAccountNo = row['Bank Account No'] || row['bank_account_no'] || row['BankAccountNo'];
        const ifscCode = row['IFSC Code'] || row['ifsc_code'] || row['IFSC'];
        const costCenter = row['Cost Center'] || row['cost_center'] || row['CostCenter'];
        const location = row['Location'] || row['location'];
        const departmentName = row['Department'] || row['department'];
        const roleName = row['Role'] || row['role'];
        const excelRoleId = row['Role ID'] || row['role_id'] || row['RoleID']; // Support direct Role ID
        const isIciciStr = row['Is ICICI'] || row['is_icici_bank'];
        const isIciciBank = String(isIciciStr).toLowerCase() === 'yes' || String(isIciciStr).toLowerCase() === 'true';

        // Get Role ID
        let roleId = null;

        // 1. Try direct Role ID if provided
        if (excelRoleId) {
          const roleRes = await client.query('SELECT id FROM roles WHERE id = $1', [excelRoleId]);
          if (roleRes.rows.length > 0) roleId = roleRes.rows[0].id;
        }

        // 2. Try lookup by name if no ID or ID not found
        if (!roleId && roleName) {
          const roleRes = await client.query('SELECT id FROM roles WHERE LOWER(name) = LOWER($1) OR LOWER(display_name) = LOWER($1)', [roleName]);
          if (roleRes.rows.length > 0) roleId = roleRes.rows[0].id;
        }

        // 3. Default to employee
        if (!roleId) {
          const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', ['employee']);
          if (roleRes.rows.length > 0) roleId = roleRes.rows[0].id;
        }

        // Get Department ID
        let departmentId = null;
        if (departmentName) {
          const deptRes = await client.query('SELECT id FROM departments WHERE LOWER(name) = LOWER($1)', [departmentName]);
          if (deptRes.rows.length > 0) departmentId = deptRes.rows[0].id;
        }

        const existingUser = existingUsersMap.get(employeeIdStr);

        if (existingUser) {
          // Update Logic: Update only NULL or empty fields
          const updates = [];
          const values = [];
          let paramIndex = 1;

          // Check each field
          if ((!existingUser.display_name) && displayName) {
            updates.push(`display_name = $${paramIndex++}`);
            values.push(displayName);
          }
          if ((!existingUser.email) && email) {
            // Check email uniqueness first if changing
            if (existingUser.email !== email && existingEmailsMap.has(email.toLowerCase())) {
              throw new Error(`Email ${email} already in use by another user`);
            }
            updates.push(`email = $${paramIndex++}`);
            values.push(email);
          }
          if ((!existingUser.bank_account_no) && bankAccountNo) {
            updates.push(`bank_account_no = $${paramIndex++}`);
            values.push(bankAccountNo);
          }
          if ((!existingUser.ifsc_code) && ifscCode) {
            updates.push(`ifsc_code = $${paramIndex++}`);
            values.push(ifscCode);
          }
          if ((existingUser.is_icici_bank === null) && isIciciBank !== undefined) {
            updates.push(`is_icici_bank = $${paramIndex++}`);
            values.push(isIciciBank);
          }
          if ((!existingUser.cost_center) && costCenter) {
            updates.push(`cost_center = $${paramIndex++}`);
            values.push(costCenter);
          }
          if ((!existingUser.location) && location) {
            updates.push(`location = $${paramIndex++}`);
            values.push(location);
          }
          if ((!existingUser.department_id) && departmentId) {
            updates.push(`department_id = $${paramIndex++}`);
            values.push(departmentId);
          }
          if ((!existingUser.role_id) && roleId) {
            updates.push(`role_id = $${paramIndex++}`);
            values.push(roleId);
          }

          if (updates.length > 0) {
            values.push(existingUser.id);
            await client.query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`, values);
            summary.updated++;
          } else {
            // No updates needed (all fields already filled)
            // summary.updated++; // Or count as skipped/processed
          }

        } else {
          // Insert Logic
          // Check if email exists for another user (not caught by map if map is keyed by employee_id)
          if (existingEmailsMap.has(email.toLowerCase())) {
            throw new Error(`Email ${email} already exists for another employee ID`);
          }

          const azureId = crypto.randomUUID(); // Auto-generate

          await client.query(
            `INSERT INTO users (
                         azure_id, display_name, email, role_id, employee_id, 
                         bank_account_no, ifsc_code, is_icici_bank, cost_center, 
                         location, department_id, created_at, updated_at
                     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              azureId, displayName, email, roleId, employeeIdStr,
              bankAccountNo || null, ifscCode || null, isIciciBank,
              costCenter || null, location || null, departmentId
            ]
          );

          summary.inserted++;
          existingEmailsMap.add(email.toLowerCase()); // Add to map to prevent duplicates in same batch
        }

      } catch (rowError) {
        summary.failed++;
        summary.errors.push({ row: row.rowNumber, error: rowError.message });
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, summary });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    logger.error('Error importing users:', error);
    res.status(500).json({ success: false, message: 'Failed to import users', error: error.message });
  } finally {
    if (client) client.release();
    // Delete temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (e) {
        logger.error('Error deleting temp file:', e);
      }
    }
  }
});

module.exports = router;
