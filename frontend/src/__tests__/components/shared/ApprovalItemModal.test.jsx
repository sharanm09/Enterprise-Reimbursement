import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ApprovalItemModal from '../../../components/shared/ApprovalItemModal';

jest.mock('../../../utils/formatUtils', () => ({
  formatDate: jest.fn((date) => date || 'N/A'),
  formatCurrency: jest.fn((amount) => `$${amount || 0}`)
}));

describe('ApprovalItemModal', () => {
  const mockSelectedItem = {
    item_id: 1,
    user_name: 'John Doe',
    user_email: 'john@example.com',
    amount: 100,
    expense_type: 'Travel',
    expense_date: '2024-01-15',
    item_status: 'pending'
  };

  const mockOnClose = jest.fn();
  const mockFormatStatusBadge = jest.fn((status) => <span>{status}</span>);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when selectedItem is null', () => {
    const { container } = render(
      <ApprovalItemModal
        selectedItem={null}
        onClose={mockOnClose}
        formatStatusBadge={mockFormatStatusBadge}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render item details', () => {
    render(
      <ApprovalItemModal
        selectedItem={mockSelectedItem}
        onClose={mockOnClose}
        formatStatusBadge={mockFormatStatusBadge}
      />
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <ApprovalItemModal
        selectedItem={mockSelectedItem}
        onClose={mockOnClose}
        formatStatusBadge={mockFormatStatusBadge}
      />
    );

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should use formatStatusBadge when provided', () => {
    render(
      <ApprovalItemModal
        selectedItem={mockSelectedItem}
        onClose={mockOnClose}
        formatStatusBadge={mockFormatStatusBadge}
      />
    );

    expect(mockFormatStatusBadge).toHaveBeenCalledWith('pending');
  });
});

