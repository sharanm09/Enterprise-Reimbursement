const { verifyAccessToken } = require('../utils/tokenUtils');
const User = require('../models/User');

/**
 * Middleware to check if user is authenticated
 * Supports both Session-based (for backward compatibility) and JWT-based auth
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const isAuthenticated = async (req, res, next) => {
  // 1. Check for JWT in cookies or Authorization header
  const token = req.cookies?.accessToken || (req.headers.authorization || req.headers.Authorization)?.split(' ')[1];

  if (token) {
    const decoded = verifyAccessToken(token);

    if (decoded) {
      try {
        const user = await User.findById(decoded.id);
        if (user) {
          req.user = user;
          return next();
        }
      } catch (error) {
        // Fall through to other auth methods
      }
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // 2. Fallback to Passport session-based auth
  if (req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({ success: false, message: 'Not authenticated' });
};

module.exports = {
  isAuthenticated
};

