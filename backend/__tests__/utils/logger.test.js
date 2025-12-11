const logger = require('../../utils/logger');

describe('Logger Utility', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  let logOutput = [];
  let warnOutput = [];
  let errorOutput = [];

  beforeEach(() => {
    logOutput = [];
    warnOutput = [];
    errorOutput = [];
    console.log = (...args) => logOutput.push(args);
    console.warn = (...args) => warnOutput.push(args);
    console.error = (...args) => errorOutput.push(args);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  describe('Development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('logger.info should log in development', () => {
      logger.info('Test info message');
      expect(logOutput.length).toBeGreaterThan(0);
    });

    test('logger.info should log with data in development', () => {
      logger.info('Test info message', { key: 'value' });
      expect(logOutput.length).toBeGreaterThan(0);
    });

    test('logger.warn should warn in development', () => {
      logger.warn('Test warn message');
      expect(warnOutput.length).toBeGreaterThan(0);
    });

    test('logger.warn should warn with data in development', () => {
      logger.warn('Test warn message', { key: 'value' });
      expect(warnOutput.length).toBeGreaterThan(0);
    });

    test('logger.error should error in development', () => {
      logger.error('Test error message');
      expect(errorOutput.length).toBeGreaterThan(0);
    });

    test('logger.error should error with error object in development', () => {
      logger.error('Test error message', new Error('Test error'));
      expect(errorOutput.length).toBeGreaterThan(0);
    });
  });

  describe('Production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      // Clear require cache to reload logger with new NODE_ENV
      delete require.cache[require.resolve('../../utils/logger')];
    });

    afterEach(() => {
      delete require.cache[require.resolve('../../utils/logger')];
    });

    test('logger.info should not log in production', () => {
      const prodLogger = require('../../utils/logger');
      prodLogger.info('Test info message');
      expect(logOutput.length).toBe(0);
    });

    test('logger.warn should not warn in production', () => {
      const prodLogger = require('../../utils/logger');
      prodLogger.warn('Test warn message');
      expect(warnOutput.length).toBe(0);
    });

    test('logger.error should always log errors', () => {
      const prodLogger = require('../../utils/logger');
      prodLogger.error('Test error message');
      expect(errorOutput.length).toBeGreaterThan(0);
    });
  });
});

