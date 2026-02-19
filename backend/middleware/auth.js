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
  // 1. Try to get token from Cookies first
  let token = req.cookies?.accessToken;
  let decoded = null;

  if (token) {
    decoded = verifyAccessToken(token);
    // If cookie token is invalid (e.g. old secret/DB or expired), clear it immediately
    if (!decoded) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      token = null; // Treat as if no cookie existed, allowing header fallback
    }
  }

  // 2. Fallback to Authorization header if cookie was missing or invalid
  if (!decoded) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      decoded = verifyAccessToken(token);
    }
  }

  // 3. If we have a valid decoded token (from either source), verify user exists in DB
  if (decoded) {
    try {
      // Check if user exists (handles case where DB changed but token is valid signed)
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        return next();
      }
    } catch (error) {
      // Database error or ID format mismatch
      console.error('Auth middleware user lookup error:', error.message);
    }
    // Token was valid signature, but user not found (e.g. old DB ID)
    return res.status(401).json({ success: false, message: 'User not found or invalid token' });
  }

  // 4. If a token was provided but failed verification (Invalid Signature/Expired)
  if (token) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  // 5. Fallback to Passport session-based auth
  if (req.isAuthenticated()) {
    return next();
  }

  res.status(401).json({ success: false, message: 'Not authenticated' });
};

module.exports = {
  isAuthenticated
};

