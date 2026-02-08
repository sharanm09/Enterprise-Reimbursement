const { extractAzureId, buildUserDisplayName, buildUserEmail, findOrCreateUser, buildUserResponse } = require('../../routes/auth-helpers');
const User = require('../../models/User');

jest.mock('../../models/User', () => ({
  findOne: jest.fn(),
  prototype: {
    save: jest.fn()
  }
}));

describe('Auth Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractAzureId', () => {
    test('should extract azureId from oid', () => {
      const decoded = { oid: 'azure-123' };
      expect(extractAzureId(decoded)).toBe('azure-123');
    });

    test('should extract azureId from sub', () => {
      const decoded = { sub: 'azure-456' };
      expect(extractAzureId(decoded)).toBe('azure-456');
    });

    test('should extract azureId from unique_name', () => {
      const decoded = { unique_name: 'user@example.com' };
      expect(extractAzureId(decoded)).toBe('user@example.com');
    });

    test('should extract azureId from email', () => {
      const decoded = { email: 'user@example.com' };
      expect(extractAzureId(decoded)).toBe('user@example.com');
    });
  });

  describe('buildUserDisplayName', () => {
    test('should build display name from name', () => {
      const decoded = { name: 'John Doe' };
      expect(buildUserDisplayName(decoded)).toBe('John Doe');
    });

    test('should build display name from given_name and family_name', () => {
      const decoded = { given_name: 'John', family_name: 'Doe' };
      expect(buildUserDisplayName(decoded)).toBe('John Doe');
    });

    test('should use preferred_username as fallback', () => {
      const decoded = { preferred_username: 'johndoe' };
      expect(buildUserDisplayName(decoded)).toBe('johndoe');
    });

    test('should use email as fallback', () => {
      const decoded = { email: 'john@example.com' };
      expect(buildUserDisplayName(decoded)).toBe('john@example.com');
    });

    test('should use User as default', () => {
      const decoded = {};
      expect(buildUserDisplayName(decoded)).toBe('User');
    });
  });

  describe('buildUserEmail', () => {
    test('should extract email from email field', () => {
      const decoded = { email: 'user@example.com' };
      expect(buildUserEmail(decoded)).toBe('user@example.com');
    });

    test('should extract email from preferred_username', () => {
      const decoded = { preferred_username: 'user@example.com' };
      expect(buildUserEmail(decoded)).toBe('user@example.com');
    });

    test('should return null if no email found', () => {
      const decoded = {};
      expect(buildUserEmail(decoded)).toBeNull();
    });
  });

  describe('findOrCreateUser', () => {
    test('should return existing user and update lastLogin', async () => {
      const mockUser = {
        lastLogin: null,
        save: jest.fn().mockResolvedValue(true)
      };
      User.findOne.mockResolvedValue(mockUser);

      const result = await findOrCreateUser('azure-123', {});

      expect(result).toBe(mockUser);
      expect(mockUser.save).toHaveBeenCalled();
    });

    test('should create new user if not found', async () => {
      User.findOne.mockResolvedValue(null);
      const mockNewUser = {
        save: jest.fn().mockResolvedValue(true)
      };
      User.mockImplementation(() => mockNewUser);

      const decoded = {
        given_name: 'John',
        family_name: 'Doe',
        email: 'john@example.com'
      };

      await findOrCreateUser('azure-123', decoded);

      expect(User).toHaveBeenCalled();
      expect(mockNewUser.save).toHaveBeenCalled();
    });
  });

  describe('buildUserResponse', () => {
    test('should build user response from user object', () => {
      const user = {
        id: 1,
        displayName: 'John Doe',
        email: 'john@example.com',
        givenName: 'John',
        surname: 'Doe',
        role: { name: 'employee' },
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          displayName: 'John Doe',
          email: 'john@example.com',
          givenName: 'John',
          surname: 'Doe'
        })
      };

      const result = buildUserResponse(user);

      expect(result.success).toBe(true);
      expect(result.user.id).toBe(1);
      expect(result.user.displayName).toBe('John Doe');
    });
  });
});


