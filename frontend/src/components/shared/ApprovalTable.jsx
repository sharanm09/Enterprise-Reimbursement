import React from 'react';
import PropTypes from 'prop-types';
import { FiCheckCircle } from 'react-icons/fi';
import ApprovalTableRow from './ApprovalTableRow';

const ApprovalTable = ({ 
  displayItems, 
  activeTab, 
  onView, 
  onApprove, 
  onReject,
  type = 'general',
  showFinanceStatus = false,
  emptyMessagePending = 'No items pending approval',
  emptyMessageApproved = 'No approved or rejected items',
  customActions = null
}) => {
  if (displayItems.length === 0) {
    return (
      <div className="text-center py-8">
        <FiCheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-600">
          {activeTab === 'pending' ? emptyMessagePending : emptyMessageApproved}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Employee</th>
            <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Expense Type</th>
            <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Amount</th>
            <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Date</th>
            <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Department</th>
            <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Cost Center</th>
            <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Project</th>
            <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">{showFinanceStatus ? 'Current Status' : 'Status'}</th>
            {showFinanceStatus && activeTab === 'approved' && (
              <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Finance Status</th>
            )}
            <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {displayItems.map((item) => (
            <ApprovalTableRow
              key={item.item_id || item.id}
              item={item}
              activeTab={activeTab}
              onView={onView}
              onApprove={onApprove}
              onReject={onReject}
              type={type}
              showFinanceStatus={showFinanceStatus}
              customActions={customActions}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

ApprovalTable.propTypes = {
  displayItems: PropTypes.arrayOf(PropTypes.object).isRequired,
  activeTab: PropTypes.string.isRequired,
  onView: PropTypes.func.isRequired,
  onApprove: PropTypes.func,
  onReject: PropTypes.func,
  type: PropTypes.string,
  showFinanceStatus: PropTypes.bool,
  emptyMessagePending: PropTypes.string,
  emptyMessageApproved: PropTypes.string,
  customActions: PropTypes.func
};

export default ApprovalTable;

