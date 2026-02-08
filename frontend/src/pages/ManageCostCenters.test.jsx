import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageCostCenters from './ManageCostCenters';
import axios from 'axios';

jest.mock('axios');
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
}));

describe('ManageCostCenters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockImplementation((url) => {
      if (url.includes('departments')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: 1, name: 'HR', code: 'HR001' }]
          }
        });
      }
      return Promise.resolve({
        data: {
          success: true,
          data: [
            { id: 1, name: 'CC1', code: 'CC001', department_id: 1, status: 'active' }
          ]
        }
      });
    });
    axios.post.mockResolvedValue({ data: { success: true } });
    axios.put.mockResolvedValue({ data: { success: true } });
    axios.delete.mockResolvedValue({ data: { success: true } });
    window.confirm = jest.fn(() => true);
  });

  it('should render cost centers page', async () => {
    render(<ManageCostCenters />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });

  it('should fetch departments and cost centers', async () => {
    render(<ManageCostCenters />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });
});


