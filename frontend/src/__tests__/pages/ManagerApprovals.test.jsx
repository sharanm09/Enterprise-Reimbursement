import React from 'react';
import { render, screen } from '@testing-library/react';
import ManagerApprovals from '../../pages/ManagerApprovals';
import ApprovalPage from '../../components/shared/ApprovalPage';

jest.mock('../../components/shared/ApprovalPage');
jest.mock('../../utils/approvalStatusBadges', () => ({
  getManagerStatusBadge: jest.fn((status) => <span>{status}</span>)
}));

describe('ManagerApprovals', () => {
  const mockUser = {
    id: 1,
    displayName: 'Test User',
    email: 'test@example.com',
    role: { name: 'manager', displayName: 'Manager' }
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
    render(<ManagerApprovals user={mockUser} />);
    
    expect(ApprovalPage).toHaveBeenCalledWith(
      expect.objectContaining({
        approvalType: 'manager',
        title: 'Manager Approvals',
        description: 'Review and approve reimbursement items from your direct reports',
        emptyMessagePending: 'No items pending your approval',
        emptyMessageApproved: 'No approved or rejected items',
        statusOptions: ['all', 'pending', 'approved', 'rejected']
      }),
      {}
    );
  });

  it('should render title and description', () => {
    render(<ManagerApprovals user={mockUser} />);
    expect(screen.getByText('Manager Approvals')).toBeInTheDocument();
    expect(screen.getByText(/Review and approve reimbursement items/i)).toBeInTheDocument();
  });
});

