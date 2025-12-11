import logger from '../../utils/logger';

describe('logger', () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('error', () => {
    it('should log error message without error object', () => {
      logger.error('Test error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message');
    });

    it('should log error message with error object', () => {
      const error = new Error('Test error');
      logger.error('Test error message', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message', error);
    });

    it('should log error message with error data', () => {
      const errorData = { code: 500, message: 'Server error' };
      logger.error('Test error message', errorData);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Test error message', errorData);
    });
  });

  describe('info', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should log info message in development', () => {
      process.env.NODE_ENV = 'development';
      logger.info('Test info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test info message');
    });

    it('should log info message with data in development', () => {
      process.env.NODE_ENV = 'development';
      const data = { key: 'value' };
      logger.info('Test info message', data);
      expect(consoleLogSpy).toHaveBeenCalledWith('[INFO] Test info message', data);
    });

    it('should not log info message in production', () => {
      process.env.NODE_ENV = 'production';
      logger.info('Test info message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not log info message with data in production', () => {
      process.env.NODE_ENV = 'production';
      logger.info('Test info message', { key: 'value' });
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});

