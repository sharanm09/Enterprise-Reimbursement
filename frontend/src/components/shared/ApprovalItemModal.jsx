import React from 'react';
import PropTypes from 'prop-types';
import { FiX, FiFileText } from 'react-icons/fi';
import { formatDate, formatCurrency } from '../../utils/formatUtils';

const ApprovalItemModal = ({ selectedItem, onClose, formatStatusBadge }) => {
  if (!selectedItem) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Item Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-600">Employee Name</div>
              <div className="mt-1 text-xs font-medium text-gray-800">{selectedItem.user_name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600">Employee Email</div>
              <div className="mt-1 text-xs text-gray-600">{selectedItem.user_email || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600">Amount</div>
              <div className="mt-1 text-xs font-semibold text-gray-800">
                {formatCurrency(selectedItem.amount || 0)}
              </div>
              {selectedItem.paid_amount && selectedItem.paid_amount !== selectedItem.amount && (
                <div className="mt-1 text-xs text-green-600">
                  Paid: {formatCurrency(selectedItem.paid_amount)}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600">Expense Type</div>
              <div className="mt-1 text-xs text-gray-800">{selectedItem.expense_type || 'N/A'}</div>
              {selectedItem.expense_category_name && (
                <div className="mt-0.5 text-xs text-gray-500">Category: {selectedItem.expense_category_name}</div>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600">Expense Date</div>
              <div className="mt-1 text-xs text-gray-800">{formatDate(selectedItem.expense_date)}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600">Current Status</div>
              <div className="mt-1">
                {formatStatusBadge ? formatStatusBadge(selectedItem.item_status) : (
                  <span className="px-1.5 py-0.5 bg-gray-500 text-white text-xs font-semibold rounded-full">
                    {selectedItem.item_status || 'Unknown'}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600">Department</div>
              <div className="mt-1 text-xs text-gray-800 font-medium">{selectedItem.department_name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600">Cost Center</div>
              <div className="mt-1 text-xs text-gray-800 font-medium">{selectedItem.cost_center_name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600">Project</div>
              <div className="mt-1 text-xs text-gray-800 font-medium">{selectedItem.project_name || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600">Reimbursement Status</div>
              <div className="mt-1 text-xs text-gray-800 font-medium">{selectedItem.reimbursement_status || 'N/A'}</div>
            </div>
          </div>

          {selectedItem.description && (
            <div>
              <div className="text-xs font-semibold text-gray-600">Description</div>
              <div className="mt-1 text-xs text-gray-800">{selectedItem.description}</div>
            </div>
          )}

          {selectedItem.approvals && selectedItem.approvals.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2 block">Approval History</div>
              <div className="space-y-2">
                {selectedItem.approvals.map((approval) => (
                  <div key={`approval-${approval.id || approval.approval_level}-${approval.created_at}`} className="border border-gray-200 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-800">
                        {approval.approval_level.toUpperCase()}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        approval.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {approval.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      By: {approval.approver_name} on {formatDate(approval.created_at)}
                    </div>
                    {approval.comments && (
                      <div className="text-xs text-gray-600 mt-1">
                        Comments: {approval.comments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedItem.attachments && selectedItem.attachments.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2 block">Attachments</div>
              <div className="space-y-1">
                {selectedItem.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={`${process.env.REACT_APP_API_URL?.replace('/api', '')}${attachment.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <FiFileText className="w-3 h-3" />
                    <span>{attachment.file_name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

ApprovalItemModal.propTypes = {
  selectedItem: PropTypes.shape({
    user_name: PropTypes.string,
    user_email: PropTypes.string,
    amount: PropTypes.number,
    paid_amount: PropTypes.number,
    expense_type: PropTypes.string,
    expense_category_name: PropTypes.string,
    expense_date: PropTypes.string,
    item_status: PropTypes.string,
    department_name: PropTypes.string,
    cost_center_name: PropTypes.string,
    project_name: PropTypes.string,
    reimbursement_status: PropTypes.string,
    description: PropTypes.string,
    approvals: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      approval_level: PropTypes.string,
      status: PropTypes.string,
      approver_name: PropTypes.string,
      created_at: PropTypes.string,
      comments: PropTypes.string
    })),
    attachments: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      file_name: PropTypes.string,
      file_path: PropTypes.string
    }))
  }),
  onClose: PropTypes.func.isRequired,
  formatStatusBadge: PropTypes.func
};

export default ApprovalItemModal;

