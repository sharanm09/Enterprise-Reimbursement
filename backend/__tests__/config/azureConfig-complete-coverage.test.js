const logger = require('../../utils/logger');

jest.mock('../../utils/logger', () => ({
  warn: jest.fn()
}));

describe('Azure Config Complete Coverage', () => {
  let originalEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.clearAllMocks();
  });

  test('should export configuration object', () => {
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig).toBeDefined();
    expect(typeof azureConfig).toBe('object');
  });

  test('should have all required Azure AD configuration properties', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    
    expect(azureConfig).toHaveProperty('identityMetadata');
    expect(azureConfig).toHaveProperty('clientID');
    expect(azureConfig).toHaveProperty('clientSecret');
    expect(azureConfig).toHaveProperty('responseType');
    expect(azureConfig).toHaveProperty('responseMode');
    expect(azureConfig).toHaveProperty('redirectUrl');
    expect(azureConfig).toHaveProperty('allowHttpForRedirectUrl');
    expect(azureConfig).toHaveProperty('validateIssuer');
    expect(azureConfig).toHaveProperty('isB2C');
    expect(azureConfig).toHaveProperty('issuer');
    expect(azureConfig).toHaveProperty('passReqToCallback');
    expect(azureConfig).toHaveProperty('scope');
    expect(azureConfig).toHaveProperty('loggingLevel');
    expect(azureConfig).toHaveProperty('loggingNoPII');
    expect(azureConfig).toHaveProperty('nonceLifetime');
    expect(azureConfig).toHaveProperty('nonceMaxAmount');
    expect(azureConfig).toHaveProperty('useCookieInsteadOfSession');
    expect(azureConfig).toHaveProperty('cookieEncryptionKeys');
    expect(azureConfig).toHaveProperty('clockSkew');
    expect(azureConfig).toHaveProperty('isValid');
  });

  test('should warn when AZURE_AD_CLIENT_ID is missing', () => {
    delete process.env.AZURE_AD_CLIENT_ID;
    delete process.env.AZURE_AD_TENANT_ID;
    
    require('../../config/azureConfig');
    
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Missing Azure AD environment variables')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Please create a .env file')
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
    expect(azureConfig.issuer).toContain('//');
  });

  test('should use empty string when AZURE_AD_CLIENT_ID is missing', () => {
    delete process.env.AZURE_AD_CLIENT_ID;
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.clientID).toBe('');
  });

  test('should construct identityMetadata with tenant ID', () => {
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-123';
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.identityMetadata).toContain('test-tenant-123');
    expect(azureConfig.identityMetadata).toContain('v2.0/.well-known/openid-configuration');
  });

  test('should construct issuer with tenant ID', () => {
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-123';
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.issuer).toContain('test-tenant-123');
    expect(azureConfig.issuer).toContain('sts.windows.net');
  });

  test('should use AZURE_AD_REDIRECT_URI when set', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    process.env.AZURE_AD_REDIRECT_URI = 'http://localhost:3000/callback';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.redirectUrl).toBe('http://localhost:3000/callback');
  });

  test('should use undefined redirectUrl when AZURE_AD_REDIRECT_URI not set', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    delete process.env.AZURE_AD_REDIRECT_URI;
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.redirectUrl).toBeUndefined();
  });

  test('should use AZURE_AD_CLIENT_SECRET when set', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    process.env.AZURE_AD_CLIENT_SECRET = 'test-secret';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.clientSecret).toBe('test-secret');
  });

  test('should use empty string when AZURE_AD_CLIENT_SECRET not set', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    delete process.env.AZURE_AD_CLIENT_SECRET;
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.clientSecret).toBe('');
  });

  test('should have correct responseType', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.responseType).toBe('code id_token');
  });

  test('should have correct responseMode', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.responseMode).toBe('form_post');
  });

  test('should have allowHttpForRedirectUrl set to true', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.allowHttpForRedirectUrl).toBe(true);
  });

  test('should have validateIssuer set to true', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.validateIssuer).toBe(true);
  });

  test('should have isB2C set to false', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.isB2C).toBe(false);
  });

  test('should have passReqToCallback set to false', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.passReqToCallback).toBe(false);
  });

  test('should have correct scope array', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.scope).toEqual(['profile', 'email', 'openid']);
  });

  test('should have loggingLevel set to info', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.loggingLevel).toBe('info');
  });

  test('should have loggingNoPII set to false', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.loggingNoPII).toBe(false);
  });

  test('should have nonceLifetime set to null', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.nonceLifetime).toBe(null);
  });

  test('should have nonceMaxAmount set to 5', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.nonceMaxAmount).toBe(5);
  });

  test('should have useCookieInsteadOfSession set to false', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.useCookieInsteadOfSession).toBe(false);
  });

  test('should have cookieEncryptionKeys configured', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.cookieEncryptionKeys).toBeDefined();
    expect(Array.isArray(azureConfig.cookieEncryptionKeys)).toBe(true);
    expect(azureConfig.cookieEncryptionKeys.length).toBeGreaterThan(0);
  });

  test('should have clockSkew set to null', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    
    const azureConfig = require('../../config/azureConfig');
    expect(azureConfig.clockSkew).toBe(null);
  });
});

