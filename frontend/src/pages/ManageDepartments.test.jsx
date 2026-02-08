import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageDepartments from './ManageDepartments';
import axios from 'axios';

jest.mock('axios');
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
}));

describe('ManageDepartments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: 1, name: 'HR', code: 'HR001', description: 'HR Dept', status: 'active' },
          { id: 2, name: 'IT', code: 'IT001', description: 'IT Dept', status: 'active' }
        ]
      }
    });
    axios.post.mockResolvedValue({ data: { success: true } });
    axios.put.mockResolvedValue({ data: { success: true } });
    axios.delete.mockResolvedValue({ data: { success: true } });
    window.confirm = jest.fn(() => true);
  });

  it('should render departments page', async () => {
    render(<ManageDepartments />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });

  it('should fetch departments on mount', async () => {
    render(<ManageDepartments />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/master-data/departments'),
        expect.any(Object)
      );
    });
  });

  it('should open create modal when add button is clicked', async () => {
    render(<ManageDepartments />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    
    const addButton = screen.getByText(/add/i);
    fireEvent.click(addButton);
    
    expect(screen.getByText(/department/i)).toBeInTheDocument();
  });

  it('should filter departments by search', async () => {
    render(<ManageDepartments />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'HR' } });
    
    await waitFor(() => {
      expect(screen.getByText('HR')).toBeInTheDocument();
    });
  });

  it('should handle delete department', async () => {
    render(<ManageDepartments />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalled();
      });
    }
  });
});


