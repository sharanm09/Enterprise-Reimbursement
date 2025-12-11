import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ApprovalTableRow from '../../../components/shared/ApprovalTableRow';

jest.mock('../../../utils/formatUtils', () => ({
  formatDate: jest.fn((date) => date || 'N/A'),
  formatCurrency: jest.fn((amount) => `$${amount || 0}`)
}));

jest.mock('../../../utils/statusUtils', () => ({
  getStatusColor: jest.fn(() => 'bg-green-100'),
  getStatusLabel: jest.fn((status) => status || 'Unknown')
}));

describe('ApprovalTableRow', () => {
  const mockItem = {
    item_id: 1,
    user_name: 'John Doe',
    user_email: 'john@example.com',
    expense_type: 'Travel',
    amount: 100,
    expense_date: '2024-01-15',
    item_status: 'pending'
  };

  const mockOnView = jest.fn();
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render item data', () => {
    render(
      <table>
        <tbody>
          <ApprovalTableRow
            item={mockItem}
            activeTab="pending"
            onView={mockOnView}
            onApprove={mockOnApprove}
            onReject={mockOnReject}
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
  });

  it('should call onView when view button is clicked', () => {
    render(
      <table>
        <tbody>
          <ApprovalTableRow
            item={mockItem}
            activeTab="pending"
            onView={mockOnView}
            onApprove={mockOnApprove}
            onReject={mockOnReject}
          />
        </tbody>
      </table>
    );

    const viewButton = screen.getByRole('button', { name: /view/i });
    fireEvent.click(viewButton);
    expect(mockOnView).toHaveBeenCalledWith(mockItem);
  });

  it('should call onApprove when approve button is clicked', () => {
    render(
      <table>
        <tbody>
          <ApprovalTableRow
            item={mockItem}
            activeTab="pending"
            onView={mockOnView}
            onApprove={mockOnApprove}
            onReject={mockOnReject}
          />
        </tbody>
      </table>
    );

    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);
    expect(mockOnApprove).toHaveBeenCalledWith(mockItem);
  });

  it('should call onReject when reject button is clicked', () => {
    render(
      <table>
        <tbody>
          <ApprovalTableRow
            item={mockItem}
            activeTab="pending"
            onView={mockOnView}
            onApprove={mockOnApprove}
            onReject={mockOnReject}
          />
        </tbody>
      </table>
    );

    const rejectButton = screen.getByRole('button', { name: /reject/i });
    fireEvent.click(rejectButton);
    expect(mockOnReject).toHaveBeenCalledWith(mockItem);
  });

  it('should show custom actions when provided', () => {
    const customActions = jest.fn(() => <button>Custom Action</button>);
    render(
      <table>
        <tbody>
          <ApprovalTableRow
            item={mockItem}
            activeTab="approved"
            onView={mockOnView}
            onApprove={mockOnApprove}
            onReject={mockOnReject}
            customActions={customActions}
          />
        </tbody>
      </table>
    );

    expect(customActions).toHaveBeenCalledWith(mockItem);
  });
});

