import React from 'react';
import PropTypes from 'prop-types';
import ApprovalPage from '../components/shared/ApprovalPage';
import { getManagerStatusBadge } from '../utils/approvalStatusBadges';

const ManagerApprovals = ({ user }) => {
  return (
    <ApprovalPage
      approvalType="manager"
      title="Manager Approvals"
      description="Review and approve reimbursement items from your direct reports"
      emptyMessagePending="No items pending your approval"
      emptyMessageApproved="No approved or rejected items"
      statusOptions={['all', 'pending', 'approved', 'rejected']}
      formatStatusBadge={getManagerStatusBadge}
    />
  );
};

ManagerApprovals.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    displayName: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.shape({
      name: PropTypes.string,
      displayName: PropTypes.string
    })
  }),
};

export default ManagerApprovals;

