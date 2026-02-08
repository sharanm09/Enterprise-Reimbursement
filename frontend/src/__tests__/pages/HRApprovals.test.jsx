import React from 'react';
import { render, screen } from '@testing-library/react';
import HRApprovals from '../../pages/HRApprovals';
import ApprovalPage from '../../components/shared/ApprovalPage';

jest.mock('../../components/shared/ApprovalPage');
jest.mock('../../utils/approvalStatusBadges', () => ({
  getHRStatusBadge: jest.fn((status) => <span>{status}</span>)
}));

describe('HRApprovals', () => {
  const mockUser = {
    id: 1,
    displayName: 'Test User',
    email: 'test@example.com',
    role: { name: 'hr', displayName: 'HR' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ApprovalPage.mockImplementation((props) => (
      <div data-testid="approval-page">
        <div>{props.title}</div>
        <div>{props.description}</div>
      </div>
    ));
  });

  it('should render ApprovalPage with correct props', () => {
    render(<HRApprovals user={mockUser} />);
    
    expect(ApprovalPage).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalType: 'hr',
        title: 'HR Approvals',
        description: 'Review and approve reimbursement items approved by Managers',
        emptyMessagePending: 'No items pending HR approval',
        emptyMessageApproved: 'No approved or rejected items',
        statusOptions: ['all', 'pending', 'approved', 'rejected']
      }),
      {}
    );
  });

  it('should render title and description', () => {
    render(<HRApprovals user={mockUser} />);
    expect(screen.getByText('HR Approvals')).toBeInTheDocument();
    expect(screen.getByText(/Review and approve reimbursement items/i)).toBeInTheDocument();
  });
});

