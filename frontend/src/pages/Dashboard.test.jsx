import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from './Dashboard';

// Mock axios module
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({
    data: {
      success: true,
      data: {
        cards: [],
        activity: { reimbursements: 0, pending: 0, approved: 0 },
        recentReimbursements: [],
        pendingApprovals: []
      }
    }
  })),
  post: jest.fn(() => Promise.resolve({ data: { success: true } })),
  default: {
    get: jest.fn(() => Promise.resolve({
      data: {
        success: true,
        data: {
          cards: [],
          activity: { reimbursements: 0, pending: 0, approved: 0 },
          recentReimbursements: [],
          pendingApprovals: []
        }
      }
    }))
  }
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('Dashboard Component', () => {
  const mockUser = {
    id: 1,
    displayName: 'John Doe',
    role: {
      name: 'employee',
      displayName: 'Employee'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard', async () => {
    render(<Dashboard user={mockUser} />);
    await waitFor(() => {
      expect(screen.getByText(/dashboard/i)).toBeDefined();
    }, { timeout: 3000 });
  });
});

