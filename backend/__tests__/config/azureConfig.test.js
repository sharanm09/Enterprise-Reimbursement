const azureConfig = require('../../config/azureConfig');

describe('Azure Config', () => {
  test('should export configuration object', () => {
    expect(azureConfig).toBeDefined();
    expect(typeof azureConfig).toBe('object');
  });

  test('should have required Azure AD configuration properties', () => {
    expect(azureConfig).toHaveProperty('identityMetadata');
    expect(azureConfig).toHaveProperty('clientID');
    expect(azureConfig).toHaveProperty('validateIssuer');
    expect(azureConfig).toHaveProperty('passReqToCallback');
    expect(azureConfig).toHaveProperty('loggingLevel');
  });
});


