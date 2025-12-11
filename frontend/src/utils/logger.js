/**
 * Logger utility for frontend - SonarQube compliant
 * Conditionally logs based on environment
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  /**
   * Log error messages
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
  },

  /**
   * Log informational messages (only in development)
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
  }
};

export default logger;



