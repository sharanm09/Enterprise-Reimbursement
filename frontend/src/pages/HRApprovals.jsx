import React from 'react';
import PropTypes from 'prop-types';
import ApprovalPage from '../components/shared/ApprovalPage';
import { getHRStatusBadge } from '../utils/approvalStatusBadges';

const HRApprovals = ({ user }) => {
  return (
    <ApprovalPage
      approvalType="hr"
      title="HR Approvals"
      description="Review and approve reimbursement items approved by Managers"
      emptyMessagePending="No items pending HR approval"
      emptyMessageApproved="No approved or rejected items"
      statusOptions={['all', 'pending', 'approved', 'rejected']}
      formatStatusBadge={getHRStatusBadge}
    />
  );
};

HRApprovals.propTypes = {
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

export default HRApprovals;


