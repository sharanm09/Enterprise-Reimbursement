/**
 * Logger utility for SonarQube compliance
 * Replaces console.log/error/warn with proper logging
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  /**
   * Log informational messages (replaces console.log)
   * @param {string} message - Log message
   * @param {any} data - Optional data to log
   */
  info: (message, data = null) => {
    if (isDevelopment) {
      if (data) {
        // eslint-disable-next-line no-console
        console.log(`[INFO] ${message}`, data);
      } else {
        // eslint-disable-next-line no-console
        console.log(`[INFO] ${message}`);
      }
    }
    // In production, you can integrate with proper logging service
  },

  /**
   * Log error messages (replaces console.error)
   * @param {string} message - Error message
   * @param {Error|any} error - Error object or data
   */
  error: (message, error = null) => {
    if (error) {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`, error);
    } else {
      // eslint-disable-next-line no-console
      console.error(`[ERROR] ${message}`);
    }
    // In production, send to error tracking service
  },

  /**
   * Log warning messages (replaces console.warn)
   * @param {string} message - Warning message
   * @param {any} data - Optional data to log
   */
  warn: (message, data = null) => {
    if (isDevelopment) {
      if (data) {
        // eslint-disable-next-line no-console
        console.warn(`[WARN] ${message}`, data);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[WARN] ${message}`);
      }
    }
  }
};

module.exports = logger;



