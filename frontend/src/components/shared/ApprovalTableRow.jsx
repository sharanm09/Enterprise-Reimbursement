import React from 'react';
import PropTypes from 'prop-types';
import { FiEye, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { formatDate, formatCurrency } from '../../utils/formatUtils';
import { getStatusColor, getStatusLabel } from '../../utils/statusUtils';

const ApprovalTableRow = ({ 
  item, 
  activeTab, 
  onView, 
  onApprove, 
  onReject,
  type = 'general',
  showFinanceStatus = false,
  customActions = null
}) => {
  return (
    <tr key={item.item_id || item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-1.5 px-2 whitespace-nowrap">
        <div className="text-[10px] text-gray-900 font-medium">{item.user_name || 'Unknown'}</div>
        <div className="text-[9px] text-gray-500">{item.user_email || ''}</div>
      </td>
      <td className="py-1.5 px-2 whitespace-nowrap">
        <div className="text-[10px] text-gray-900 font-medium">{item.expense_type || 'N/A'}</div>
        {item.expense_category_name && (
          <div className="text-[9px] text-gray-500">{item.expense_category_name}</div>
        )}
      </td>
      <td className="py-1.5 px-2 whitespace-nowrap">
        <div className="text-[10px] font-medium text-gray-900">
          {formatCurrency(item.amount || 0)}
        </div>
        {item.paid_amount && item.paid_amount !== item.amount && (
          <div className="text-[9px] text-gray-600">
            Paid: {formatCurrency(item.paid_amount)}
          </div>
        )}
      </td>
      <td className="py-1.5 px-2 whitespace-nowrap">
        <div className="text-[10px] text-gray-600">{formatDate(item.expense_date)}</div>
      </td>
      <td className="py-1.5 px-2 whitespace-nowrap">
        <div className="text-[10px] text-gray-600">{item.department_name || 'N/A'}</div>
      </td>
      <td className="py-1.5 px-2 whitespace-nowrap">
        <div className="text-[10px] text-gray-600">{item.cost_center_name || 'N/A'}</div>
      </td>
      <td className="py-1.5 px-2 whitespace-nowrap">
        <div className="text-[10px] text-gray-600">{item.project_name || 'N/A'}</div>
      </td>
      <td className="py-1.5 px-2 whitespace-nowrap">
        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getStatusColor(item.item_status, type)}`}>
          {getStatusLabel(item.item_status)}
        </span>
        {item.reimbursement_status && (
          <div className="text-[9px] text-gray-500 mt-0.5">Req: {item.reimbursement_status}</div>
        )}
      </td>
      {showFinanceStatus && activeTab === 'approved' && (
        <td className="py-1.5 px-2 whitespace-nowrap">
          <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getStatusColor(item.item_status, type)}`}>
            {getStatusLabel(item.item_status)}
          </span>
        </td>
      )}
      <td className="py-1.5 px-2 whitespace-nowrap">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onView(item)}
            className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
          >
            <FiEye className="w-3 h-3" />
          </button>
          {activeTab === 'pending' && onApprove && (
            <>
              <button
                onClick={() => onApprove(item)}
                className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
              >
                <FiCheckCircle className="w-3 h-3" />
              </button>
              <button
                onClick={() => onReject(item)}
                className="px-1.5 py-1 bg-gray-50 text-gray-700 text-[9px] font-medium rounded border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-colors"
              >
                <FiXCircle className="w-3 h-3" />
              </button>
            </>
          )}
          {customActions?.(item)}
        </div>
      </td>
    </tr>
  );
};

ApprovalTableRow.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    item_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    user_name: PropTypes.string,
    user_email: PropTypes.string,
    expense_type: PropTypes.string,
    expense_category_name: PropTypes.string,
    amount: PropTypes.number,
    paid_amount: PropTypes.number,
    expense_date: PropTypes.string,
    department_name: PropTypes.string,
    cost_center_name: PropTypes.string,
    project_name: PropTypes.string,
    item_status: PropTypes.string,
    reimbursement_status: PropTypes.string
  }).isRequired,
  activeTab: PropTypes.string.isRequired,
  onView: PropTypes.func.isRequired,
  onApprove: PropTypes.func,
  onReject: PropTypes.func,
  type: PropTypes.string,
  showFinanceStatus: PropTypes.bool,
  customActions: PropTypes.func
};

export default ApprovalTableRow;

