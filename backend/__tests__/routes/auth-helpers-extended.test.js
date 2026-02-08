const {
  extractAzureId,
  buildUserDisplayName,
  buildUserEmail,
  findOrCreateUser,
  buildUserResponse
} = require('../../routes/auth-helpers');
const User = require('../../models/User');

jest.mock('../../models/User');

describe('Auth Helpers Extended', () => {
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

    test('should extract azureId from preferred_username', () => {
      const decoded = { preferred_username: 'user@example.com' };
      expect(extractAzureId(decoded)).toBe('user@example.com');
    });

    test('should extract azureId from email', () => {
      const decoded = { email: 'user@example.com' };
      expect(extractAzureId(decoded)).toBe('user@example.com');
    });

    test('should prioritize oid over other fields', () => {
      const decoded = {
        oid: 'azure-123',
        sub: 'azure-456',
        email: 'user@example.com'
      };
      expect(extractAzureId(decoded)).toBe('azure-123');
    });
  });

  describe('buildUserDisplayName', () => {
    test('should use name if available', () => {
      const decoded = { name: 'John Doe' };
      expect(buildUserDisplayName(decoded)).toBe('John Doe');
    });

    test('should build from given_name and family_name', () => {
      const decoded = { given_name: 'John', family_name: 'Doe' };
      expect(buildUserDisplayName(decoded)).toBe('John Doe');
    });

    test('should use preferred_username if name not available', () => {
      const decoded = { preferred_username: 'johndoe' };
      expect(buildUserDisplayName(decoded)).toBe('johndoe');
    });

    test('should use email if other fields not available', () => {
      const decoded = { email: 'john@example.com' };
      expect(buildUserDisplayName(decoded)).toBe('john@example.com');
    });

    test('should return User as default', () => {
      const decoded = {};
      expect(buildUserDisplayName(decoded)).toBe('User');
    });

    test('should trim whitespace from name', () => {
      const decoded = { given_name: 'John', family_name: '  Doe  ' };
      expect(buildUserDisplayName(decoded)).toBe('John Doe');
    });
  });

  describe('buildUserEmail', () => {
    test('should use email if available', () => {
      const decoded = { email: 'john@example.com' };
      expect(buildUserEmail(decoded)).toBe('john@example.com');
    });

    test('should use preferred_username if email not available', () => {
      const decoded = { preferred_username: 'john@example.com' };
      expect(buildUserEmail(decoded)).toBe('john@example.com');
    });

    test('should use upn if other fields not available', () => {
      const decoded = { upn: 'john@example.com' };
      expect(buildUserEmail(decoded)).toBe('john@example.com');
    });

    test('should use unique_name if other fields not available', () => {
      const decoded = { unique_name: 'john@example.com' };
      expect(buildUserEmail(decoded)).toBe('john@example.com');
    });

    test('should return null if no email fields available', () => {
      const decoded = {};
      expect(buildUserEmail(decoded)).toBeNull();
    });
  });

  describe('findOrCreateUser', () => {
    test('should return existing user and update lastLogin', async () => {
      const mockUser = {
        id: 1,
        azureId: 'azure-123',
        lastLogin: null,
        save: jest.fn().mockResolvedValue(true)
      };
      User.findOne = jest.fn().mockResolvedValue(mockUser);

      const result = await findOrCreateUser('azure-123', {});

      expect(result).toBe(mockUser);
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.lastLogin).toBeInstanceOf(Date);
    });

    test('should create new user if not found', async () => {
      User.findOne = jest.fn().mockResolvedValue(null);
      const mockNewUser = {
        id: 2,
        save: jest.fn().mockResolvedValue(true)
      };
      User.mockImplementation(() => mockNewUser);

      const decoded = {
        given_name: 'John',
        family_name: 'Doe',
        email: 'john@example.com'
      };

      const result = await findOrCreateUser('azure-456', decoded);

      expect(result).toBe(mockNewUser);
      expect(mockNewUser.save).toHaveBeenCalled();
    });
  });

  describe('buildUserResponse', () => {
    test('should build response from user with toJSON', () => {
      const user = {
        toJSON: jest.fn().mockReturnValue({
          id: 1,
          displayName: 'John Doe',
          email: 'john@example.com',
          givenName: 'John',
          surname: 'Doe'
        }),
        role: { name: 'employee' }
      };

      const result = buildUserResponse(user);

      expect(result.success).toBe(true);
      expect(result.user.id).toBe(1);
      expect(result.user.role).toEqual({ name: 'employee' });
    });

    test('should build response from user without toJSON', () => {
      const user = {
        _id: 1,
        displayName: 'Jane Doe',
        email: 'jane@example.com',
        role: null
      };

      const result = buildUserResponse(user);

      expect(result.success).toBe(true);
      expect(result.user.id).toBe(1);
      expect(result.user.role).toBeNull();
    });

    test('should use _id if id not available', () => {
      const user = {
        toJSON: jest.fn().mockReturnValue({
          _id: 2,
          displayName: 'Test User'
        }),
        role: null
      };

      const result = buildUserResponse(user);

      expect(result.user.id).toBe(2);
    });
  });
});


