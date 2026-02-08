const { createRoleCheckMiddleware, isFinance, isHR, isManager, isSuperAdmin } = require('../../middleware/roleChecks');
const User = require('../../models/User');

jest.mock('../../models/User', () => ({
  findById: jest.fn()
}));

describe('Role Check Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      isAuthenticated: jest.fn().mockReturnValue(true),
      user: { id: 1 },
      session: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('isFinance', () => {
    test('should allow finance user', async () => {
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'finance' }
      });

      await isFinance(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject non-finance user', async () => {
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'employee' }
      });

      await isFinance(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated user', async () => {
      mockReq.isAuthenticated.mockReturnValue(false);

      await isFinance(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('isHR', () => {
    test('should allow HR user', async () => {
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'hr' }
      });

      await isHR(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('isManager', () => {
    test('should allow manager user', async () => {
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'manager' }
      });

      await isManager(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('isSuperAdmin', () => {
    test('should allow superadmin user', async () => {
      User.findById.mockResolvedValue({
        id: 1,
        role: { name: 'superadmin' }
      });

      await isSuperAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('createRoleCheckMiddleware', () => {
    test('should create middleware for single role', () => {
      const middleware = createRoleCheckMiddleware('finance');
      expect(typeof middleware).toBe('function');
    });

    test('should create middleware for multiple roles', () => {
      const middleware = createRoleCheckMiddleware(['finance', 'hr']);
      expect(typeof middleware).toBe('function');
    });
  });
});


