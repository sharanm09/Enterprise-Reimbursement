import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ApprovalActionModal from '../../../components/shared/ApprovalActionModal';

describe('ApprovalActionModal', () => {
  const mockSelectedItem = { id: 1, name: 'Test Item' };
  const mockSetComments = jest.fn();
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when selectedItem is null', () => {
    const { container } = render(
      <ApprovalActionModal
        selectedItem={null}
        actionType="approve"
        comments=""
        setComments={mockSetComments}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should not render when actionType is null', () => {
    const { container } = render(
      <ApprovalActionModal
        selectedItem={mockSelectedItem}
        actionType={null}
        comments=""
        setComments={mockSetComments}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render approve modal', () => {
    render(
      <ApprovalActionModal
        selectedItem={mockSelectedItem}
        actionType="approve"
        comments=""
        setComments={mockSetComments}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Approve Item')).toBeInTheDocument();
    expect(screen.getByText('Comments (Optional)')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('should render reject modal', () => {
    render(
      <ApprovalActionModal
        selectedItem={mockSelectedItem}
        actionType="reject"
        comments=""
        setComments={mockSetComments}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Reject Item')).toBeInTheDocument();
    expect(screen.getByText('Rejection Reason *')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  it('should call setComments when textarea changes', () => {
    render(
      <ApprovalActionModal
        selectedItem={mockSelectedItem}
        actionType="approve"
        comments=""
        setComments={mockSetComments}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByPlaceholderText('Add any comments...');
    fireEvent.change(textarea, { target: { value: 'Test comment' } });

    expect(mockSetComments).toHaveBeenCalledWith('Test comment');
  });

  it('should call onConfirm when approve button is clicked', () => {
    render(
      <ApprovalActionModal
        selectedItem={mockSelectedItem}
        actionType="approve"
        comments=""
        setComments={mockSetComments}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    expect(mockOnConfirm).toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ApprovalActionModal
        selectedItem={mockSelectedItem}
        actionType="approve"
        comments=""
        setComments={mockSetComments}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should display comments value', () => {
    render(
      <ApprovalActionModal
        selectedItem={mockSelectedItem}
        actionType="approve"
        comments="Existing comment"
        setComments={mockSetComments}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const textarea = screen.getByDisplayValue('Existing comment');
    expect(textarea).toBeInTheDocument();
  });
});

