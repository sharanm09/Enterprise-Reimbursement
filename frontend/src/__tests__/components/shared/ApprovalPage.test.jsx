import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ApprovalPage from '../../../components/shared/ApprovalPage';
import { useApprovalData } from '../../../utils/useApprovalData';
import { useApprovalFilters } from '../../../utils/useApprovalFilters';
import { useApprovalActions } from '../../../utils/useApprovalActions';

jest.mock('../../../utils/useApprovalData');
jest.mock('../../../utils/useApprovalFilters');
jest.mock('../../../utils/useApprovalActions');

describe('ApprovalPage', () => {
  const mockFormatStatusBadge = jest.fn((status) => <span>{status}</span>);

  const mockUseApprovalData = {
    allPendingItems: [],
    allApprovedItems: [],
    loading: false,
    activeTab: 'pending',
    setActiveTab: jest.fn(),
    fetchPendingItems: jest.fn(),
    fetchApprovedItems: jest.fn()
  };

  const mockUseApprovalFilters = {
    pendingItems: [],
    approvedItems: [],
    searchQuery: '',
    setSearchQuery: jest.fn(),
    statusFilter: 'all',
    setStatusFilter: jest.fn(),
    dateRangeStart: '',
    setDateRangeStart: jest.fn(),
    dateRangeEnd: '',
    setDateRangeEnd: jest.fn(),
    showAdvancedFilters: false,
    setShowAdvancedFilters: jest.fn(),
    clearFilters: jest.fn()
  };

  const mockUseApprovalActions = {
    selectedItem: null,
    setSelectedItem: jest.fn(),
    actionType: null,
    setActionType: jest.fn(),
    comments: '',
    setComments: jest.fn(),
    handleApprove: jest.fn(),
    handleReject: jest.fn(),
    resetActionState: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useApprovalData.mockReturnValue(mockUseApprovalData);
    useApprovalFilters.mockReturnValue(mockUseApprovalFilters);
    useApprovalActions.mockReturnValue(mockUseApprovalActions);
  });

  it('should render with title and description', () => {
    render(
      <ApprovalPage
        approvalType="manager"
        title="Manager Approvals"
        description="Test description"
        emptyMessagePending="No pending"
        emptyMessageApproved="No approved"
        statusOptions={['all', 'pending']}
        formatStatusBadge={mockFormatStatusBadge}
      />
    );

    expect(screen.getByText('Manager Approvals')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    useApprovalData.mockReturnValue({
      ...mockUseApprovalData,
      loading: true
    });

    render(
      <ApprovalPage
        approvalType="manager"
        title="Manager Approvals"
        description="Test"
        emptyMessagePending="No pending"
        emptyMessageApproved="No approved"
        statusOptions={['all']}
        formatStatusBadge={mockFormatStatusBadge}
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render tabs', () => {
    render(
      <ApprovalPage
        approvalType="manager"
        title="Manager Approvals"
        description="Test"
        emptyMessagePending="No pending"
        emptyMessageApproved="No approved"
        statusOptions={['all']}
        formatStatusBadge={mockFormatStatusBadge}
      />
    );

    expect(screen.getByText(/Pending Approval/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved\/Rejected/i)).toBeInTheDocument();
  });
});

