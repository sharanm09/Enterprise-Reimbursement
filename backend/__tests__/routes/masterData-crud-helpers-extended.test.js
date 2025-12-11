const {
  handleGetRequest,
  handlePostRequest,
  handlePutRequest,
  handleDeleteRequest
} = require('../../routes/masterData-crud-helpers');
const { parseSearchParam, handleGetWithFilters, handleCreate, handleUpdate, handleSoftDelete } = require('../../routes/masterData-helpers');
const logger = require('../../utils/logger');

jest.mock('../../routes/masterData-helpers', () => ({
  parseSearchParam: jest.fn(),
  handleDatabaseError: jest.fn(),
  validateNameAndCode: jest.fn(),
  handleGetWithFilters: jest.fn(),
  handleCreate: jest.fn(),
  handleUpdate: jest.fn(),
  handleSoftDelete: jest.fn()
}));

jest.mock('../../utils/logger', () => ({
  error: jest.fn()
}));

describe('Master Data CRUD Helpers Extended', () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('handleGetRequest', () => {
    test('should handle successful GET request', async () => {
      parseSearchParam.mockReturnValue('test');
      handleGetWithFilters.mockResolvedValue({
        rows: [{ id: 1, name: 'Test' }]
      });

      const entityConfig = {
        tableName: 'departments',
        entityName: 'departments'
      };

      await handleGetRequest(req, res, entityConfig);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ id: 1, name: 'Test' }]
      });
    });

    test('should handle errors', async () => {
      parseSearchParam.mockReturnValue(null);
      handleGetWithFilters.mockRejectedValue(new Error('Database error'));

      const entityConfig = {
        tableName: 'departments',
        entityName: 'departments'
      };

      await handleGetRequest(req, res, entityConfig);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });

    test('should pass status filter from query', async () => {
      req.query.status = 'active';
      parseSearchParam.mockReturnValue(null);
      handleGetWithFilters.mockResolvedValue({ rows: [] });

      await handleGetRequest(req, res, {
        tableName: 'departments',
        entityName: 'departments'
      });

      expect(handleGetWithFilters).toHaveBeenCalledWith(
        'departments',
        expect.objectContaining({
          additionalFilters: expect.objectContaining({ status: 'active' })
        })
      );
    });
  });

  describe('handlePostRequest', () => {
    test('should handle successful POST request', async () => {
      req.body = { name: 'Test', code: 'TEST' };
      const { validateNameAndCode } = require('../../routes/masterData-helpers');
      validateNameAndCode.mockReturnValue([]);
      handleCreate.mockResolvedValue({
        rows: [{ id: 1, name: 'Test', code: 'TEST' }]
      });

      const entityConfig = {
        tableName: 'departments',
        entityName: 'Department',
        getFields: () => ['name', 'code'],
        getValues: (body) => [body.name, body.code]
      };

      await handlePostRequest(req, res, entityConfig);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, name: 'Test', code: 'TEST' }
      });
    });

    test('should handle validation errors', async () => {
      req.body = { name: '', code: 'TEST' };
      const { validateNameAndCode } = require('../../routes/masterData-helpers');
      validateNameAndCode.mockReturnValue(['Name is required']);

      const entityConfig = {
        tableName: 'departments',
        entityName: 'Department',
        getFields: () => ['name', 'code'],
        getValues: (body) => [body.name, body.code]
      };

      await handlePostRequest(req, res, entityConfig);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Name is required'
      });
    });

    test('should call postProcess if provided', async () => {
      req.body = { name: 'Test', code: 'TEST' };
      const { validateNameAndCode } = require('../../routes/masterData-helpers');
      validateNameAndCode.mockReturnValue([]);
      handleCreate.mockResolvedValue({
        rows: [{ id: 1, name: 'Test', code: 'TEST' }]
      });

      const postProcess = jest.fn().mockResolvedValue({ id: 1, name: 'Test', department_name: 'IT' });

      const entityConfig = {
        tableName: 'cost_centers',
        entityName: 'Cost center',
        getFields: () => ['name', 'code'],
        getValues: (body) => [body.name, body.code],
        postProcess
      };

      await handlePostRequest(req, res, entityConfig);

      expect(postProcess).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, name: 'Test', department_name: 'IT' }
      });
    });
  });

  describe('handlePutRequest', () => {
    test('should handle successful PUT request', async () => {
      req.params.id = '1';
      req.body = { name: 'Updated', code: 'UPD' };
      const { validateNameAndCode } = require('../../routes/masterData-helpers');
      validateNameAndCode.mockReturnValue([]);
      handleUpdate.mockResolvedValue({
        rows: [{ id: 1, name: 'Updated', code: 'UPD' }]
      });

      const entityConfig = {
        tableName: 'departments',
        entityName: 'Department',
        getFields: () => ['name', 'code'],
        getValues: (body) => [body.name, body.code]
      };

      await handlePutRequest(req, res, entityConfig);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 1, name: 'Updated', code: 'UPD' }
      });
    });

    test('should return 404 when entity not found', async () => {
      req.params.id = '999';
      req.body = { name: 'Updated', code: 'UPD' };
      const { validateNameAndCode } = require('../../routes/masterData-helpers');
      validateNameAndCode.mockReturnValue([]);
      handleUpdate.mockResolvedValue({ rows: [] });

      const entityConfig = {
        tableName: 'departments',
        entityName: 'Department',
        getFields: () => ['name', 'code'],
        getValues: (body) => [body.name, body.code]
      };

      await handlePutRequest(req, res, entityConfig);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('handleDeleteRequest', () => {
    test('should handle successful DELETE request', async () => {
      req.params.id = '1';
      handleSoftDelete.mockResolvedValue({
        rows: [{ id: 1, status: 'inactive' }]
      });

      const entityConfig = {
        tableName: 'departments',
        entityName: 'Department'
      };

      await handleDeleteRequest(req, res, entityConfig);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Department deactivated successfully'
      });
    });

    test('should return 404 when entity not found', async () => {
      req.params.id = '999';
      handleSoftDelete.mockResolvedValue({ rows: [] });

      const entityConfig = {
        tableName: 'departments',
        entityName: 'Department'
      };

      await handleDeleteRequest(req, res, entityConfig);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should handle Cannot delete error', async () => {
      req.params.id = '1';
      const error = new Error('Cannot delete department with active cost centers');
      handleSoftDelete.mockRejectedValue(error);

      const entityConfig = {
        tableName: 'departments',
        entityName: 'Department'
      };

      await handleDeleteRequest(req, res, entityConfig);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: error.message
      });
    });

    test('should handle other errors', async () => {
      req.params.id = '1';
      handleSoftDelete.mockRejectedValue(new Error('Database error'));

      const entityConfig = {
        tableName: 'departments',
        entityName: 'Department'
      };

      await handleDeleteRequest(req, res, entityConfig);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});


