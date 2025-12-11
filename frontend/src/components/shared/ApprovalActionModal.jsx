import React from 'react';
import PropTypes from 'prop-types';

const ApprovalActionModal = ({
  selectedItem,
  actionType,
  comments,
  setComments,
  onConfirm,
  onCancel
}) => {
  if (!selectedItem || !actionType) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">
            {actionType === 'approve' ? 'Approve Item' : 'Reject Item'}
          </h2>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="approval-comments" className="text-xs font-semibold text-gray-600 block mb-1">
              {actionType === 'reject' ? 'Rejection Reason *' : 'Comments (Optional)'}
            </label>
            <textarea
              id="approval-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={actionType === 'reject' ? 'Please provide a reason for rejection...' : 'Add any comments...'}
              required={actionType === 'reject'}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onConfirm}
              className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded text-white ${
                actionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              } transition-colors`}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </button>
            <button
              onClick={onCancel}
              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

ApprovalActionModal.propTypes = {
  selectedItem: PropTypes.object,
  actionType: PropTypes.string,
  comments: PropTypes.string,
  setComments: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default ApprovalActionModal;

