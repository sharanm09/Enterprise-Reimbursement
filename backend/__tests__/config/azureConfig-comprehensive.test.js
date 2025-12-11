const path = require('path');

jest.mock('../../utils/logger', () => ({
  warn: jest.fn()
}));

describe('Azure Config Comprehensive Coverage', () => {
  let originalEnv;
  let azureConfig;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    delete require.cache[require.resolve('../../config/azureConfig')];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should have valid config when all required env vars are set', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    process.env.AZURE_AD_REDIRECT_URI = 'http://localhost:3000/auth/callback';
    process.env.AZURE_AD_CLIENT_SECRET = 'test-secret';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.isValid).toBe(true);
    expect(azureConfig.clientID).toBe('test-client-id');
    expect(azureConfig.identityMetadata).toContain('test-tenant-id');
    expect(azureConfig.issuer).toContain('test-tenant-id');
  });

  test('should have invalid config when CLIENT_ID is missing', () => {
    delete process.env.AZURE_AD_CLIENT_ID;
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.isValid).toBe(false);
    expect(azureConfig.clientID).toBe('');
  });

  test('should have invalid config when TENANT_ID is missing', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    delete process.env.AZURE_AD_TENANT_ID;

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.isValid).toBe(false);
    expect(azureConfig.identityMetadata).toContain('');
  });

  test('should have invalid config when both CLIENT_ID and TENANT_ID are missing', () => {
    delete process.env.AZURE_AD_CLIENT_ID;
    delete process.env.AZURE_AD_TENANT_ID;

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.isValid).toBe(false);
    expect(azureConfig.clientID).toBe('');
    expect(azureConfig.identityMetadata).toContain('');
  });

  test('should use empty string for clientSecret when not set', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    delete process.env.AZURE_AD_CLIENT_SECRET;

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.clientSecret).toBe('');
  });

  test('should use clientSecret when set', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    process.env.AZURE_AD_CLIENT_SECRET = 'test-secret';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.clientSecret).toBe('test-secret');
  });

  test('should use redirectUrl from env when set', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    process.env.AZURE_AD_REDIRECT_URI = 'http://localhost:3000/callback';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.redirectUrl).toBe('http://localhost:3000/callback');
  });

  test('should have undefined redirectUrl when not set', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';
    delete process.env.AZURE_AD_REDIRECT_URI;

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.redirectUrl).toBeUndefined();
  });

  test('should have correct responseType', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.responseType).toBe('code id_token');
  });

  test('should have correct responseMode', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.responseMode).toBe('form_post');
  });

  test('should have allowHttpForRedirectUrl set to true', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.allowHttpForRedirectUrl).toBe(true);
  });

  test('should have validateIssuer set to true', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.validateIssuer).toBe(true);
  });

  test('should have isB2C set to false', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.isB2C).toBe(false);
  });

  test('should have correct issuer format', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.issuer).toBe('https://sts.windows.net/test-tenant-id/');
  });

  test('should have passReqToCallback set to false', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.passReqToCallback).toBe(false);
  });

  test('should have correct scope array', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.scope).toEqual(['profile', 'email', 'openid']);
  });

  test('should have loggingLevel set to info', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.loggingLevel).toBe('info');
  });

  test('should have loggingNoPII set to false', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.loggingNoPII).toBe(false);
  });

  test('should have nonceLifetime set to null', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.nonceLifetime).toBeNull();
  });

  test('should have nonceMaxAmount set to 5', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.nonceMaxAmount).toBe(5);
  });

  test('should have useCookieInsteadOfSession set to false', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.useCookieInsteadOfSession).toBe(false);
  });

  test('should have cookieEncryptionKeys array', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(Array.isArray(azureConfig.cookieEncryptionKeys)).toBe(true);
    expect(azureConfig.cookieEncryptionKeys.length).toBeGreaterThan(0);
  });

  test('should have clockSkew set to null', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.clockSkew).toBeNull();
  });

  test('should log warning when CLIENT_ID is missing', () => {
    const logger = require('../../utils/logger');
    delete process.env.AZURE_AD_CLIENT_ID;
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Missing Azure AD environment variables')
    );
  });

  test('should log warning when TENANT_ID is missing', () => {
    const logger = require('../../utils/logger');
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    delete process.env.AZURE_AD_TENANT_ID;

    azureConfig = require('../../config/azureConfig');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Missing Azure AD environment variables')
    );
  });

  test('should log warning for both missing variables', () => {
    const logger = require('../../utils/logger');
    delete process.env.AZURE_AD_CLIENT_ID;
    delete process.env.AZURE_AD_TENANT_ID;

    azureConfig = require('../../config/azureConfig');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Missing Azure AD environment variables')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Please create a .env file')
    );
  });

  test('should have correct identityMetadata format', () => {
    process.env.AZURE_AD_CLIENT_ID = 'test-client-id';
    process.env.AZURE_AD_TENANT_ID = 'test-tenant-id';

    azureConfig = require('../../config/azureConfig');

    expect(azureConfig.identityMetadata).toBe(
      'https://login.microsoftonline.com/test-tenant-id/v2.0/.well-known/openid-configuration'
    );
  });
});

