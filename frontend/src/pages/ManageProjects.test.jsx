import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ManageProjects from './ManageProjects';
import axios from 'axios';

jest.mock('axios');
jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn()
}));

describe('ManageProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: 1, name: 'Project 1', code: 'P001', status: 'active' }
        ]
      }
    });
    axios.post.mockResolvedValue({ data: { success: true } });
    axios.put.mockResolvedValue({ data: { success: true } });
    axios.delete.mockResolvedValue({ data: { success: true } });
    window.confirm = jest.fn(() => true);
  });

  it('should render projects page', async () => {
    render(<ManageProjects />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });
  });

  it('should fetch projects on mount', async () => {
    render(<ManageProjects />);
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/master-data/projects'),
        expect.any(Object)
      );
    });
  });
});


