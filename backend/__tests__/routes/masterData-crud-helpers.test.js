const {
  handleGetRequest,
  handlePostRequest,
  handlePutRequest,
  handleDeleteRequest
} = require('../../routes/masterData-crud-helpers');
const { handleGetWithFilters, handleCreate, handleUpdate, handleSoftDelete } = require('../../routes/masterData-helpers');
const { pool } = require('../../config/database');

jest.mock('../../routes/masterData-helpers', () => ({
  parseSearchParam: jest.fn(),
  handleGetWithFilters: jest.fn(),
  handleCreate: jest.fn(),
  handleUpdate: jest.fn(),
  handleSoftDelete: jest.fn(),
  validateNameAndCode: jest.fn(),
  handleDatabaseError: jest.fn()
}));

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn()
  }
}));

describe('Master Data CRUD Helpers', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      query: { search: 'test', status: 'active' },
      body: { name: 'Test', code: 'TEST' },
      params: { id: '1' }
    };
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('handleGetRequest', () => {
    test('should fetch data successfully', async () => {
      handleGetWithFilters.mockResolvedValue({ rows: [{ id: 1, name: 'Test' }] });
      const { parseSearchParam } = require('../../routes/masterData-helpers');
      parseSearchParam.mockReturnValue('test');

      await handleGetRequest(mockReq, mockRes, {
        tableName: 'departments',
        entityName: 'departments'
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, name: 'Test' }]
      });
    });

    test('should handle errors', async () => {
      handleGetWithFilters.mockRejectedValue(new Error('Database error'));

      await handleGetRequest(mockReq, mockRes, {
        tableName: 'departments',
        entityName: 'departments'
      });

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('handlePostRequest', () => {
    test('should create entity successfully', async () => {
      const { validateNameAndCode } = require('../../routes/masterData-helpers');
      validateNameAndCode.mockReturnValue([]);
      handleCreate.mockResolvedValue({ rows: [{ id: 1, name: 'Test', code: 'TEST' }] });

      await handlePostRequest(mockReq, mockRes, {
        tableName: 'departments',
        entityName: 'Department',
        getFields: () => ['name', 'code'],
        getValues: (body) => [body.name, body.code]
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, name: 'Test', code: 'TEST' }
      });
    });

    test('should return validation errors', async () => {
      const { validateNameAndCode } = require('../../routes/masterData-helpers');
      validateNameAndCode.mockReturnValue(['Name is required']);

      await handlePostRequest(mockReq, mockRes, {
        tableName: 'departments',
        entityName: 'Department',
        getFields: () => ['name', 'code'],
        getValues: (body) => [body.name, body.code]
      });

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('handlePutRequest', () => {
    test('should update entity successfully', async () => {
      const { validateNameAndCode } = require('../../routes/masterData-helpers');
      validateNameAndCode.mockReturnValue([]);
      handleUpdate.mockResolvedValue({ rows: [{ id: 1, name: 'Updated', code: 'UPD' }] });

      await handlePutRequest(mockReq, mockRes, {
        tableName: 'departments',
        entityName: 'Department',
        getFields: () => ['name', 'code'],
        getValues: (body) => [body.name, body.code]
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, name: 'Updated', code: 'UPD' }
      });
    });

    test('should return 404 when entity not found', async () => {
      const { validateNameAndCode } = require('../../routes/masterData-helpers');
      validateNameAndCode.mockReturnValue([]);
      handleUpdate.mockResolvedValue({ rows: [] });

      await handlePutRequest(mockReq, mockRes, {
        tableName: 'departments',
        entityName: 'Department',
        getFields: () => ['name', 'code'],
        getValues: (body) => [body.name, body.code]
      });

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('handleDeleteRequest', () => {
    test('should delete entity successfully', async () => {
      handleSoftDelete.mockResolvedValue({ rows: [{ id: 1, status: 'inactive' }] });

      await handleDeleteRequest(mockReq, mockRes, {
        tableName: 'departments',
        entityName: 'Department'
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Department deactivated successfully'
      });
    });

    test('should return 404 when entity not found', async () => {
      handleSoftDelete.mockResolvedValue({ rows: [] });

      await handleDeleteRequest(mockReq, mockRes, {
        tableName: 'departments',
        entityName: 'Department'
      });

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('should handle deletion errors', async () => {
      handleSoftDelete.mockRejectedValue(new Error('Cannot delete department with active cost centers'));

      await handleDeleteRequest(mockReq, mockRes, {
        tableName: 'departments',
        entityName: 'Department',
        checkTable: 'cost_centers',
        checkField: 'department_id'
      });

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});


