const logger = require('../../utils/logger');

jest.mock('../../utils/logger', () => ({
  warn: jest.fn()
}));

describe('Azure Config', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  test('should export configuration object', () => {
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig).toBeDefined();
    expect(typeof azureConfig).toBe('object');
  });

  test('should have required Azure AD configuration properties', () => {
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig).toHaveProperty('identityMetadata');
    expect(azureConfig).toHaveProperty('clientID');
    expect(azureConfig).toHaveProperty('validateIssuer');
    expect(azureConfig).toHaveProperty('passReqToCallback');
    expect(azureConfig).toHaveProperty('loggingLevel');
  });

  test('should warn when AZURE_AD_CLIENT_ID is missing', () => {
    delete process.env.AZURE_AD_CLIENT_ID;
    delete process.env.AZURE_AD_TENANT_ID;
    
    require('../../config/azureConfig');
    
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Missing Azure AD environment variables')
    );
  });

  test('should warn when AZURE_AD_TENANT_ID is missing', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    delete process.env.AZURE_AD_TENANT_ID;
    
    require('../../config/azureConfig');
    
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Missing Azure AD environment variables')
    );
  });

  test('should warn when both Azure AD variables are missing', () => {
    delete process.env.AZURE_AD_CLIENT_ID;
    delete process.env.AZURE_AD_TENANT_ID;
    
    require('../../config/azureConfig');
    
    expect(logger.warn).toHaveBeenCalled();
  });

  test('should set isValid to false when variables are missing', () => {
    delete process.env.AZURE_AD_CLIENT_ID;
    delete process.env.AZURE_AD_TENANT_ID;
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.isValid).toBe(false);
  });

  test('should set isValid to true when variables are present', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.isValid).toBe(true);
  });

  test('should use empty string when AZURE_AD_TENANT_ID is missing', () => {
    delete process.env.AZURE_AD_TENANT_ID;
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.identityMetadata).toContain('//');
  });

  test('should use empty string when AZURE_AD_CLIENT_ID is missing', () => {
    delete process.env.AZURE_AD_CLIENT_ID;
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.clientID).toBe('');
  });
});


