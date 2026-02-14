const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-access-token-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '15m';
const JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '7d';

/**
 * Generate Access Token
 * @param {Object} user - User object
 * @returns {string} JWT Access Token
 */
function generateAccessToken(user) {
    const payload = {
        id: user.id || user._id,
        email: user.email,
        role: user.role?.name || null
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

/**
 * Generate Refresh Token
 * @param {Object} user - User object
 * @returns {string} JWT Refresh Token
 */
function generateRefreshToken(user) {
    const payload = {
        id: user.id || user._id
    };
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRATION });
}

/**
 * Verify Access Token
 * @param {string} token - JWT Token
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyAccessToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

/**
 * Verify Refresh Token
 * @param {string} token - JWT Token
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
};
