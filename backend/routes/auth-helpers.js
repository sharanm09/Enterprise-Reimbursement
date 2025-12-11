// Helper functions to reduce cognitive complexity in auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

function extractAzureId(decoded) {
  let azureId = decoded.oid || decoded.sub;
  
  if (!azureId) {
    azureId = decoded.unique_name || decoded.preferred_username || decoded.email;
  }
  
  if (!azureId && decoded.email) {
    azureId = decoded.email;
  }
  
  return azureId;
}

function buildUserDisplayName(decoded) {
  return decoded.name || 
    `${decoded.given_name || ''} ${decoded.family_name || ''}`.trim() || 
    decoded.preferred_username ||
    decoded.email || 
    'User';
}

function buildUserEmail(decoded) {
  return decoded.email || 
    decoded.preferred_username || 
    decoded.upn || 
    decoded.unique_name || 
    null;
}

async function findOrCreateUser(azureId, decoded) {
  let user = await User.findOne({ azureId: azureId });
  
  if (user) {
    user.lastLogin = new Date();
    await user.save();
    return user;
  }
  
  const displayName = buildUserDisplayName(decoded);
  const email = buildUserEmail(decoded);
  const surname = decoded.family_name || decoded.surname || null;
  
  user = new User({
    azureId: azureId,
    displayName: displayName,
    email: email,
    givenName: decoded.given_name || null,
    surname: surname
  });
  
  await user.save();
  return user;
}

function buildUserResponse(user) {
  const userData = user.toJSON ? user.toJSON() : user;
  return {
    success: true,
    user: {
      id: userData.id || userData._id,
      displayName: userData.displayName,
      email: userData.email,
      givenName: userData.givenName,
      surname: userData.surname,
      role: user.role || null
    }
  };
}

module.exports = {
  extractAzureId,
  buildUserDisplayName,
  buildUserEmail,
  findOrCreateUser,
  buildUserResponse
};


