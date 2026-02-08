const logger = require('../../utils/logger');

describe('Logger Comprehensive Coverage', () => {
  let originalEnv;
  let consoleLogSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeAll(() => {
    originalEnv = { ...process.env };
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    process.env = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('info method', () => {
    test('should log info message in development environment', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.info('Test info message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test info message');
    });

    test('should log info message with data in development', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('../../utils/logger');

      const testData = { key: 'value' };
      logger.info('Test info message', testData);

      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test info message', testData);
    });

    test('should not log info message in production', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.info('Test info message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('should handle null data parameter', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.info('Test info message', null);

      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test info message');
    });

    test('should handle undefined data parameter', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.info('Test info message', undefined);

      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test info message');
    });

    test('should handle empty string message', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.info('');

      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] ');
    });
  });

  describe('error method', () => {
    test('should log error message with error object', () => {
      const error = new Error('Test error');
      logger.error('Test error message', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message', error);
    });

    test('should log error message without error object', () => {
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message');
    });

    test('should log error in both development and production', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message');
    });

    test('should handle null error parameter', () => {
      logger.error('Test error message', null);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message');
    });

    test('should handle string as error', () => {
      logger.error('Test error message', 'String error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message', 'String error');
    });

    test('should handle object as error', () => {
      const errorObj = { code: 'ERR001', message: 'Custom error' };
      logger.error('Test error message', errorObj);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message', errorObj);
    });
  });

  describe('warn method', () => {
    test('should log warning message in development environment', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.warn('Test warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warning message');
    });

    test('should log warning message with data in development', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('../../utils/logger');

      const testData = { warning: 'data' };
      logger.warn('Test warning message', testData);

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warning message', testData);
    });

    test('should not log warning message in production', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.warn('Test warning message');

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('should handle null data parameter', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.warn('Test warning message', null);

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warning message');
    });

    test('should handle undefined data parameter', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.warn('Test warning message', undefined);

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Test warning message');
    });

    test('should handle empty string message', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.warn('');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] ');
    });
  });

  describe('environment variations', () => {
    test('should work correctly in test environment', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.info('Test message');
      logger.error('Error message');
      logger.warn('Warning message');

      // In test environment, should behave like development
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('should work correctly when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;
      jest.resetModules();
      const logger = require('../../utils/logger');

      logger.info('Test message');
      logger.error('Error message');
      logger.warn('Warning message');

      // Should default to development behavior
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});

