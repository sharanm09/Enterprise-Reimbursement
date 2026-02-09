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
        } : null,
        roleId: row.role_id,
        managerId: row.manager_id,
        managerName: row.manager_name,
        managerEmail: row.manager_email,
        bankAccountNo: row.bank_account_no
      }))
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.post('/users', isSuperAdmin, async (req, res) => {
  try {
    const { displayName, email, roleId, managerId, bankAccountNo } = req.body;

    if (!displayName || !email || !roleId) {
      return res.status(400).json({ success: false, message: 'Display Name, Email, and Role are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email already exists' });
    }

    const newUser = new User({
      azureId: crypto.randomUUID(), // Generate a manual ID
      displayName,
      email,
      roleId,
      managerId: managerId || null,
      bankAccountNo: bankAccountNo || null
    });

    const roleResult = await Role.findById(roleId);
    const roleName = roleResult ? roleResult.name : null;

    await newUser.createUser(roleId, managerId || null, roleName);

    res.status(201).json({
      success: true,
      user: newUser.toJSON(),
      message: 'User created successfully'
    });
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Failed to create user', error: error.message });
  }
});

router.put('/users/:id', isSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, email, bankAccountNo } = req.body;

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

module.exports = router;
