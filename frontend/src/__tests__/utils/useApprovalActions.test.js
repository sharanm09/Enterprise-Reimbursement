import { renderHook, act } from '@testing-library/react';
import axios from 'axios';
import { useApprovalActions } from '../../utils/useApprovalActions';

jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  error: jest.fn()
}));

global.alert = jest.fn();

describe('useApprovalActions', () => {
  const mockFetchPendingItems = jest.fn();
  const mockFetchApprovedItems = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_API_URL = 'http://localhost:3001';
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useApprovalActions('manager', mockFetchPendingItems, mockFetchApprovedItems)
    );

    expect(result.current.selectedItem).toBeNull();
    expect(result.current.actionType).toBeNull();
    expect(result.current.comments).toBe('');
  });

  it('should handle approve successfully', async () => {
    axios.post.mockResolvedValue({
      data: { success: true }
    });

    const { result } = renderHook(() =>
      useApprovalActions('manager', mockFetchPendingItems, mockFetchApprovedItems)
    );

    act(() => {
      result.current.setComments('Approved');
    });

    await act(async () => {
      await result.current.handleApprove(1);
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3001/approvals/manager/approve',
      { itemId: 1, comments: 'Approved' },
      { withCredentials: true }
    );
    expect(mockFetchPendingItems).toHaveBeenCalled();
    expect(mockFetchApprovedItems).toHaveBeenCalled();
    expect(result.current.selectedItem).toBeNull();
    expect(result.current.actionType).toBeNull();
    expect(result.current.comments).toBe('');
    expect(global.alert).toHaveBeenCalledWith('Item approved successfully');
  });

  it('should handle approve with null comments', async () => {
    axios.post.mockResolvedValue({
      data: { success: true }
    });

    const { result } = renderHook(() =>
      useApprovalActions('manager', mockFetchPendingItems, mockFetchApprovedItems)
    );

    await act(async () => {
      await result.current.handleApprove(1);
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3001/approvals/manager/approve',
      { itemId: 1, comments: null },
      { withCredentials: true }
    );
  });

  it('should handle approve error', async () => {
    const error = { response: { data: { message: 'Server error' } } };
    axios.post.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useApprovalActions('manager', mockFetchPendingItems, mockFetchApprovedItems)
    );

    await act(async () => {
      await result.current.handleApprove(1);
    });

    expect(global.alert).toHaveBeenCalledWith('Server error');
  });

  it('should handle reject successfully', async () => {
    axios.post.mockResolvedValue({
      data: { success: true }
    });

    const { result } = renderHook(() =>
      useApprovalActions('manager', mockFetchPendingItems, mockFetchApprovedItems)
    );

    act(() => {
      result.current.setComments('Rejected reason');
    });

    await act(async () => {
      await result.current.handleReject(1);
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3001/approvals/manager/reject',
      { itemId: 1, comments: 'Rejected reason' },
      { withCredentials: true }
    );
    expect(mockFetchPendingItems).toHaveBeenCalled();
    expect(mockFetchApprovedItems).toHaveBeenCalled();
    expect(result.current.selectedItem).toBeNull();
    expect(result.current.actionType).toBeNull();
    expect(result.current.comments).toBe('');
    expect(global.alert).toHaveBeenCalledWith('Item rejected successfully');
  });

  it('should require comments for reject', async () => {
    const { result } = renderHook(() =>
      useApprovalActions('manager', mockFetchPendingItems, mockFetchApprovedItems)
    );

    await act(async () => {
      await result.current.handleReject(1);
    });

    expect(axios.post).not.toHaveBeenCalled();
    expect(global.alert).toHaveBeenCalledWith('Please provide a reason for rejection');
  });

  it('should handle reject error', async () => {
    const error = { response: { data: { message: 'Server error' } } };
    axios.post.mockRejectedValue(error);

    const { result } = renderHook(() =>
      useApprovalActions('manager', mockFetchPendingItems, mockFetchApprovedItems)
    );

    act(() => {
      result.current.setComments('Rejected');
    });

    await act(async () => {
      await result.current.handleReject(1);
    });

    expect(global.alert).toHaveBeenCalledWith('Server error');
  });

  it('should reset action state', () => {
    const { result } = renderHook(() =>
      useApprovalActions('manager', mockFetchPendingItems, mockFetchApprovedItems)
    );

    act(() => {
      result.current.setSelectedItem({ id: 1 });
      result.current.setActionType('approve');
      result.current.setComments('Test');
    });

    act(() => {
      result.current.resetActionState();
    });

    expect(result.current.selectedItem).toBeNull();
    expect(result.current.actionType).toBeNull();
    expect(result.current.comments).toBe('');
  });

  it('should work with different approval types', async () => {
    axios.post.mockResolvedValue({
      data: { success: true }
    });

    const { result } = renderHook(() =>
      useApprovalActions('hr', mockFetchPendingItems, mockFetchApprovedItems)
    );

    await act(async () => {
      await result.current.handleApprove(1);
    });

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:3001/approvals/hr/approve',
      expect.any(Object),
      expect.any(Object)
    );
  });
});

