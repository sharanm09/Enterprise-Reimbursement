const { handleSimpleGetRequest } = require('../../routes/reimbursements-get-helpers');
const { pool } = require('../../config/database');
const logger = require('../../utils/logger');

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../utils/logger', () => ({
  error: jest.fn()
}));

describe('Reimbursements Get Helpers', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('handleSimpleGetRequest', () => {
    test('should return data successfully', async () => {
      pool.query.mockResolvedValue({
        rows: [
          { id: 1, name: 'Department 1' },
          { id: 2, name: 'Department 2' }
        ]
      });

      await handleSimpleGetRequest(mockReq, mockRes, 'SELECT * FROM departments');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [
          { id: 1, name: 'Department 1' },
          { id: 2, name: 'Department 2' }
        ]
      });
    });

    test('should return empty array when no rows', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleSimpleGetRequest(mockReq, mockRes, 'SELECT * FROM departments');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });

    test('should handle table not found error', async () => {
      const error = new Error('Table does not exist');
      error.code = '42P01';
      pool.query.mockRejectedValue(error);

      await handleSimpleGetRequest(mockReq, mockRes, 'SELECT * FROM nonexistent');

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });

    test('should handle other database errors gracefully', async () => {
      const error = new Error('Connection error');
      pool.query.mockRejectedValue(error);

      await handleSimpleGetRequest(mockReq, mockRes, 'SELECT * FROM departments');

      expect(logger.error).toHaveBeenCalledWith('Error fetching data', error);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: []
      });
    });

    test('should pass query parameters', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await handleSimpleGetRequest(mockReq, mockRes, 'SELECT * FROM departments WHERE id = $1', [1]);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM departments WHERE id = $1', [1]);
    });
  });
});
