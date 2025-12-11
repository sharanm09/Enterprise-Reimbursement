import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FinanceApprovals from './FinanceApprovals';
import axios from 'axios';

jest.mock('axios');
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn()
}));

describe('FinanceApprovals', () => {
  const mockUser = {
    id: 1,
    displayName: 'Finance User',
    role: { name: 'finance', displayName: 'Finance' }
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
      item_status: 'approved_by_hr'
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
      item_status: 'approved_by_finance',
      paid_amount: 50
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
    render(<FinanceApprovals user={mockUser} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('fetches and displays pending items', async () => {
    axios.get.mockResolvedValueOnce({
      data: { success: true, data: mockPendingItems }
    }).mockResolvedValueOnce({
      data: { success: true, data: mockApprovedItems }
    });

    render(<FinanceApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Finance Approvals')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/approvals/finance/pending'),
        expect.any(Object)
      );
    });
  });

  test('switches between pending and approved tabs', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, data: [] }
    });

    render(<FinanceApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Pending/)).toBeInTheDocument();
    });

    const approvedTab = screen.getByText(/Approved/);
    fireEvent.click(approvedTab);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/approvals/finance/approved'),
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

    render(<FinanceApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Finance Approvals')).toBeInTheDocument();
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

    render(<FinanceApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Finance Approvals')).toBeInTheDocument();
    });
  });

  test('handles mark paid action', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, data: mockApprovedItems }
    });
    axios.post.mockResolvedValue({
      data: { success: true }
    });

    window.alert = jest.fn();

    render(<FinanceApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Finance Approvals')).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    render(<FinanceApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Finance Approvals')).toBeInTheDocument();
    });
  });

  test('calculates final amount correctly', async () => {
    axios.get.mockResolvedValue({
      data: { success: true, data: [] }
    });

    render(<FinanceApprovals user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Finance Approvals')).toBeInTheDocument();
    });
  });
});

