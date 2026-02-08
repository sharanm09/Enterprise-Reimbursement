import { msalConfig, loginRequest } from '../authConfig';

describe('authConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      REACT_APP_AZURE_AD_CLIENT_ID: 'test-client-id',
      REACT_APP_AZURE_AD_TENANT_ID: 'test-tenant-id',
      REACT_APP_AZURE_AD_REDIRECT_URI: 'http://localhost:3000'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should export msalConfig with correct structure', () => {
    expect(msalConfig).toHaveProperty('auth');
    expect(msalConfig).toHaveProperty('cache');
    expect(msalConfig.auth).toHaveProperty('clientId');
    expect(msalConfig.auth).toHaveProperty('authority');
    expect(msalConfig.auth).toHaveProperty('redirectUri');
  });

  it('should export loginRequest with scopes', () => {
    expect(loginRequest).toHaveProperty('scopes');
    expect(loginRequest.scopes).toContain('User.Read');
  });

  it('should use environment variables for clientId', () => {
    expect(msalConfig.auth.clientId).toBe('test-client-id');
  });

  it('should construct authority from tenant ID', () => {
    expect(msalConfig.auth.authority).toContain('test-tenant-id');
  });

  it('should use redirectUri from env or window.location.origin', () => {
    expect(msalConfig.auth.redirectUri).toBeTruthy();
  });

  it('should configure cache location', () => {
    expect(msalConfig.cache.cacheLocation).toBe('sessionStorage');
    expect(msalConfig.cache.storeAuthStateInCookie).toBe(false);
  });
});

