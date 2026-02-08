import { renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { useApprovalData } from '../../utils/useApprovalData';

jest.mock('axios');
jest.mock('../../utils/logger', () => ({
  error: jest.fn()
}));

describe('useApprovalData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REACT_APP_API_URL = 'http://localhost:3001';
  });

  it('should initialize with default values', () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });

    const { result } = renderHook(() => useApprovalData('manager'));

    expect(result.current.allPendingItems).toEqual([]);
    expect(result.current.allApprovedItems).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.activeTab).toBe('pending');
  });

  it('should fetch pending and approved items on mount', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { success: true, data: [{ id: 1 }] } })
      .mockResolvedValueOnce({ data: { success: true, data: [{ id: 2 }] } });

    const { result } = renderHook(() => useApprovalData('manager'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(axios.get).toHaveBeenCalledTimes(2);
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:3001/approvals/manager/pending',
      { withCredentials: true }
    );
    expect(axios.get).toHaveBeenCalledWith(
      'http://localhost:3001/approvals/manager/approved',
      { withCredentials: true }
    );
  });

  it('should handle fetch errors', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useApprovalData('manager'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allPendingItems).toEqual([]);
    expect(result.current.allApprovedItems).toEqual([]);
  });

  it('should fetch pending items when activeTab changes to pending', async () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });

    const { result } = renderHook(() => useApprovalData('manager'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    jest.clearAllMocks();

    await waitFor(() => {
      result.current.setActiveTab('pending');
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/approvals/manager/pending',
        { withCredentials: true }
      );
    });
  });

  it('should fetch approved items when activeTab changes to approved', async () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });

    const { result } = renderHook(() => useApprovalData('manager'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    jest.clearAllMocks();

    await waitFor(() => {
      result.current.setActiveTab('approved');
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/approvals/manager/approved',
        { withCredentials: true }
      );
    });
  });

  it('should handle empty data response', async () => {
    axios.get.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useApprovalData('manager'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allPendingItems).toEqual([]);
  });

  it('should work with different approval types', async () => {
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });

    renderHook(() => useApprovalData('hr'));

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:3001/approvals/hr/pending',
        { withCredentials: true }
      );
    });
  });
});

