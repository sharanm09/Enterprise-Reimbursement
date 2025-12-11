import React from 'react';
import { render, screen } from '@testing-library/react';
import ApprovalTable from '../../../components/shared/ApprovalTable';

jest.mock('../../../utils/formatUtils', () => ({
  formatDate: jest.fn((date) => date || 'N/A'),
  formatCurrency: jest.fn((amount) => `$${amount || 0}`)
}));

jest.mock('../../../utils/statusUtils', () => ({
  getStatusColor: jest.fn(() => 'bg-green-100'),
  getStatusLabel: jest.fn((status) => status || 'Unknown')
}));

describe('ApprovalTable', () => {
  const mockItems = [
    {
      item_id: 1,
      user_name: 'John Doe',
      user_email: 'john@example.com',
      expense_type: 'Travel',
      amount: 100,
      expense_date: '2024-01-15',
      item_status: 'pending'
    }
  ];

  const mockOnView = jest.fn();
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show empty message when no items', () => {
    render(
      <ApprovalTable
        displayItems={[]}
        activeTab="pending"
        onView={mockOnView}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        emptyMessagePending="No pending items"
      />
    );

    expect(screen.getByText('No pending items')).toBeInTheDocument();
  });

  it('should render table with items', () => {
    render(
      <ApprovalTable
        displayItems={mockItems}
        activeTab="pending"
        onView={mockOnView}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
  });

  it('should render column headers', () => {
    render(
      <ApprovalTable
        displayItems={mockItems}
        activeTab="pending"
        onView={mockOnView}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
      />
    );

    expect(screen.getByText('Employee')).toBeInTheDocument();
    expect(screen.getByText('Expense Type')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should show finance status column when showFinanceStatus is true', () => {
    render(
      <ApprovalTable
        displayItems={mockItems}
        activeTab="approved"
        onView={mockOnView}
        onApprove={mockOnApprove}
        onReject={mockOnReject}
        showFinanceStatus={true}
      />
    );

    expect(screen.getByText('Finance Status')).toBeInTheDocument();
  });
});

