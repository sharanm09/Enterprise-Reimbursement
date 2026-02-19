// Common role check middleware to reduce duplication
const logger = require('../utils/logger');

const { verifyAccessToken } = require('../utils/tokenUtils');

function createRoleCheckMiddleware(requiredRole) {
  return async (req, res, next) => {
    // If not already authenticated by a previous middleware (like isAuthenticated)
    if (!req.user && !req.isAuthenticated()) {
      let token = req.cookies?.accessToken;
      let decoded = null;

      if (token) {
        decoded = verifyAccessToken(token);
        if (!decoded) {
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');
          token = null;
        }
      }

      if (!decoded) {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.split(' ')[1];
          decoded = verifyAccessToken(token);
        }
      }

      if (decoded) {
        try {
          const User = require('../models/User');
          const user = await User.findById(decoded.id);
          if (user) {
            req.user = user;
          }
        } catch (error) {
          // Log error but continue to failure check
          logger.error(`Error in role check JWT auth: ${error.message}`);
        }
      }
    }

    if (!req.user && !req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    try {
      const User = require('../models/User');
      const user = req.user || await User.findById(req.user?.id || req.user?._id);

      if (!user?.role || user.role.name !== requiredRole) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${requiredRole.charAt(0).toUpperCase() + requiredRole.slice(1)} role required.`
        });
      }

      req.user = user;
      next();
    } catch (error) {
      logger.error(`Error checking ${requiredRole} status:`, error);
      return res.status(500).json({ success: false, message: 'Error checking permissions' });
    }
  };
}

const isFinance = createRoleCheckMiddleware('finance');
const isHR = createRoleCheckMiddleware('hr');
const isManager = createRoleCheckMiddleware('manager');
const isSuperAdmin = createRoleCheckMiddleware('superadmin');

module.exports = {
  isFinance,
  isHR,
  isManager,
  isSuperAdmin,
  createRoleCheckMiddleware
};


