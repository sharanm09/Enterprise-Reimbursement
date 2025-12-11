// Common role check middleware to reduce duplication
const logger = require('../utils/logger');

function createRoleCheckMiddleware(requiredRole) {
  return async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    try {
      const User = require('../models/User');
      const user = await User.findById(req.user.id || req.user._id);
      
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


