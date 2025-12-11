import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/apiUtils';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
}));

describe('apiUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_API_URL = 'http://localhost:5000/api';
  });

  describe('apiGet', () => {
    it('should make GET request with params', async () => {
      axios.get.mockResolvedValue({ data: { success: true, data: [] } });
      
      const result = await apiGet('/test', { status: 'active', search: 'test' });
      
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:5000/api/test?status=active&search=test',
        { withCredentials: true }
      );
      expect(result.success).toBe(true);
    });

    it('should exclude all values from params', async () => {
      axios.get.mockResolvedValue({ data: { success: true } });
      
      await apiGet('/test', { status: 'all', search: 'test' });
      
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:5000/api/test?search=test',
        { withCredentials: true }
      );
    });
  });

  describe('apiPost', () => {
    it('should make POST request', async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      
      const result = await apiPost('/test', { name: 'Test' });
      
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:5000/api/test',
        { name: 'Test' },
        { withCredentials: true }
      );
      expect(result.success).toBe(true);
    });
  });

  describe('apiPut', () => {
    it('should make PUT request', async () => {
      axios.put.mockResolvedValue({ data: { success: true } });
      
      const result = await apiPut('/test/1', { name: 'Updated' });
      
      expect(axios.put).toHaveBeenCalledWith(
        'http://localhost:5000/api/test/1',
        { name: 'Updated' },
        { withCredentials: true }
      );
      expect(result.success).toBe(true);
    });
  });

  describe('apiDelete', () => {
    it('should make DELETE request', async () => {
      axios.delete.mockResolvedValue({ data: { success: true } });
      
      const result = await apiDelete('/test/1');
      
      expect(axios.delete).toHaveBeenCalledWith(
        'http://localhost:5000/api/test/1',
        { withCredentials: true }
      );
      expect(result.success).toBe(true);
    });
  });
});


