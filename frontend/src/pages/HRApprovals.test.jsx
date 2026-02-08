import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import HRApprovals from './HRApprovals';
import axios from 'axios';

jest.mock('axios');
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

describe('HRApprovals', () => {
  const mockUser = {
    id: 1,
    displayName: 'HR User',
    role: { name: 'hr', displayName: 'HR' }
  };

  const mockPendingItems = [
    {
      item_id: 1,
      id: 1,
      user_name: 'John Doe',
      user_email: 'john@example.com',
      expense_type: 'Travel',
      amount: 100,
      expense_date: '2024-01-01',
      item_status: 'approved_by_manager'
    }
  ];

  const mockApprovedItems = [
    {
      item_id: 2,
      id: 2,
      user_name: 'Jane Doe',
      user_email: 'jane@example.com',
      expense_type: 'Meal',
      amount: 50,
      expense_date: '2024-01-02',
      item_status: 'approved_by_hr'
    }
  ];

  beforeEach(() => {
    process.env.REACT_APP_API_URL = 'http://localhost:5000/api';
    axios.get.mockResolvedValue({
      data: { success: true, data: [] }
    });
    axios.post.mockResolvedValue({
      data: { success: true }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    axios.get.mockImplementation(() => new Promise(() => {}));
    render(<HRApprovals user={mockUser} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('fetches and displays pending items', async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, data: mockPendingItems }
    }).mockResolvedValueOnce({
      data: { success: true, data: mockApprovedItems }
    });

    render(<HRApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('HR Approvals')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/approvals/hr/pending'),
        expect.any(Object)
      );
    });
  });

  test('switches between pending and approved tabs', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, data: [] }
    });

    render(<HRApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Pending Approval/)).toBeInTheDocument();
    });

    const approvedTab = screen.getByText(/Approved\/Rejected/);
    fireEvent.click(approvedTab);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/approvals/hr/approved'),
        expect.any(Object)
      );
    });
  });

  test('handles approve action', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, data: mockPendingItems }
    });
    axios.post.mockResolvedValue({
      data: { success: true }
    });

    window.alert = jest.fn();

    render(<HRApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('HR Approvals')).toBeInTheDocument();
    });
  });

  test('handles reject action', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, data: mockPendingItems }
    });
    axios.post.mockResolvedValue({
      data: { success: true }
    });

    window.alert = jest.fn();

    render(<HRApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('HR Approvals')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    render(<HRApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('HR Approvals')).toBeInTheDocument();
    });
  });
});

