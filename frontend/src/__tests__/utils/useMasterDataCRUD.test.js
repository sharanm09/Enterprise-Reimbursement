import { renderHook, act, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useMasterDataCRUD } from '../../utils/useMasterDataCRUD';

jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  error: jest.fn()
}));

global.alert = jest.fn();
global.confirm = jest.fn(() => true);

describe('useMasterDataCRUD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_API_URL = 'http://localhost:3001';
  });

  it('should initialize with default values', () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });

    const { result } = renderHook(() =>
      useMasterDataCRUD('department', '/master-data/departments')
    );

    expect(result.current.allItems).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.showModal).toBe(false);
    expect(result.current.editingItem).toBeNull();
    expect(result.current.formData.name).toBe('');
    expect(result.current.formData.code).toBe('');
    expect(result.current.formData.status).toBe('active');
  });

  it('should fetch items on mount', async () => {
    const mockData = [{ id: 1, name: 'Dept 1', code: 'D1', status: 'active' }];
    axios.get.mockResolvedValue({ data: { success: true, data: mockData } });

    const { result } = renderHook(() =>
      useMasterDataCRUD('department', '/master-data/departments')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(axios.get).toHaveBeenCalled();
    expect(result.current.allItems).toEqual(mockData);
  });

  it('should handle create item', async () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });
    axios.post.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() =>
      useMasterDataCRUD('department', '/master-data/departments')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setFormData({
        name: 'New Dept',
        code: 'ND',
        description: 'Description',
        status: 'active'
      });
    });

    const mockEvent = { preventDefault: jest.fn() };
    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3001/master-data/departments',
      expect.objectContaining({ name: 'New Dept' }),
      { withCredentials: true }
    );
  });

  it('should handle update item', async () => {
    const mockItem = { id: 1, name: 'Dept 1', code: 'D1', status: 'active' };
    axios.get.mockResolvedValue({ data: { success: true, data: [mockItem] } });
    axios.put.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() =>
      useMasterDataCRUD('department', '/master-data/departments')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handleEdit(mockItem);
    });

    expect(result.current.editingItem).toEqual(mockItem);
    expect(result.current.showModal).toBe(true);

    const mockEvent = { preventDefault: jest.fn() };
    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(axios.put).toHaveBeenCalledWith(
      'http://localhost:3001/master-data/departments/1',
      expect.any(Object),
      { withCredentials: true }
    );
  });

  it('should handle delete item', async () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });
    axios.delete.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() =>
      useMasterDataCRUD('department', '/master-data/departments')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(axios.delete).toHaveBeenCalledWith(
      'http://localhost:3001/master-data/departments/1',
      { withCredentials: true }
    );
  });

  it('should not delete if user cancels', async () => {
    global.confirm.mockReturnValueOnce(false);
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });

    const { result } = renderHook(() =>
      useMasterDataCRUD('department', '/master-data/departments')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(axios.delete).not.toHaveBeenCalled();
  });

  it('should open add modal', () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });

    const { result } = renderHook(() =>
      useMasterDataCRUD('department', '/master-data/departments')
    );

    act(() => {
      result.current.openAddModal();
    });

    expect(result.current.showModal).toBe(true);
    expect(result.current.editingItem).toBeNull();
  });

  it('should handle initial form data', () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });

    const { result } = renderHook(() =>
      useMasterDataCRUD('project', '/master-data/projects', {
        start_date: '',
        end_date: ''
      })
    );

    expect(result.current.formData.start_date).toBe('');
    expect(result.current.formData.end_date).toBe('');
  });

  it('should handle fetch error', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useMasterDataCRUD('department', '/master-data/departments')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allItems).toEqual([]);
  });

  it('should handle save error', async () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });
    axios.post.mockRejectedValue({
      response: { data: { message: 'Save failed' } }
    });

    const { result } = renderHook(() =>
      useMasterDataCRUD('department', '/master-data/departments')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const mockEvent = { preventDefault: jest.fn() };
    await act(async () => {
      await result.current.handleSubmit(mockEvent);
    });

    expect(global.alert).toHaveBeenCalledWith('Save failed');
  });
});

