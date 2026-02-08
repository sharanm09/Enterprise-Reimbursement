// dotenv already loaded in server.js, but ensure it's loaded here too
const path = require('node:path');
const logger = require('../utils/logger');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Validate required environment variables
function validateEnvVars() {
  const required = ['AZURE_AD_CLIENT_ID', 'AZURE_AD_TENANT_ID'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.warn(`Warning: Missing Azure AD environment variables: ${missing.join(', ')}`);
    logger.warn('Please create a .env file with your Azure AD credentials.');
    return false;
  }
  return true;
}

const hasValidConfig = validateEnvVars();

module.exports = {
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID || ''}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_AD_CLIENT_ID || '',
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
  responseType: 'code id_token',
  responseMode: 'form_post',
  redirectUrl: process.env.AZURE_AD_REDIRECT_URI,
  allowHttpForRedirectUrl: true,
  validateIssuer: true,
  isB2C: false,
  issuer: `https://sts.windows.net/${process.env.AZURE_AD_TENANT_ID || ''}/`,
  passReqToCallback: false,
  scope: ['profile', 'email', 'openid'],
  loggingLevel: 'info',
  loggingNoPII: false,
  nonceLifetime: null,
  nonceMaxAmount: 5,
  useCookieInsteadOfSession: false,
  cookieEncryptionKeys: [
    { key: '12345678901234567890123456789012', iv: '123456789012' }
  ],
  clockSkew: null,
  isValid: hasValidConfig
};

